import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.config import settings
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.delivery import (
    ShipmentBookRequest, ShipmentUpdateRequest, ShipmentInfoResponse,
    DisputeCreateRequest, DisputeResponse, DisputeReason,
    InspectionChecklistSubmitRequest, DeliveryOtpVerifyRequest,
    ReturnBookingRequest, ShippingQuoteResponse
)
from app.schemas.orders import OrderStatus, PayoutStatus
from app.integrations.courier.manager import get_courier_provider
from app.integrations.courier.base import ShipmentBookingRequest as CourierBookingReq, PickupScheduleRequest as CourierPickupReq, ShippingRateQuote
from app.integrations.payments.manager import get_payment_provider
from app.core.logging import logger


class DeliveryService:
    @staticmethod
    def get_shipping_quotes(product_id: str, delivery_pincode: str, is_cod: bool = False, opt_in_insurance: bool = False) -> ShippingQuoteResponse:
        db = get_db()
        product = db.products.find_one({"id": product_id})
        if not product:
            raise NotFoundError("Product not found.")

        # Resolve seller pickup pincode from seller address or location city
        seller = db.users.find_one({"id": product.get("seller_id")})
        pickup_pincode = settings.DEFAULT_PICKUP_PINCODE
        if seller and seller.get("postal_code"):
            pickup_pincode = str(seller["postal_code"]).strip()
        elif product.get("location_city"):
            # Clean fallback PIN mapping based on metro hub
            city = product["location_city"].lower()
            if "mumbai" in city:
                pickup_pincode = "400001"
            elif "delhi" in city:
                pickup_pincode = "110001"
            elif "bengaluru" in city or "bangalore" in city:
                pickup_pincode = "560001"
            elif "kolhapur" in city:
                pickup_pincode = "416001"
            elif "pune" in city:
                pickup_pincode = "411001"

        declared_value = float(product.get("asking_price") or product.get("starting_bid") or 20000.0)

        # Hybrid Routing Engine: checks local delivery partner network + 3PL courier
        from app.services.hybrid_routing_service import HybridRoutingService
        hybrid_res = HybridRoutingService.get_hybrid_shipping_quotes(
            pickup_pincode=pickup_pincode,
            delivery_pincode=delivery_pincode,
            weight_kg=0.5,
            is_cod=is_cod,
            declared_value=declared_value
        )

        now = datetime.now(timezone.utc)
        quotes_list = []
        for q_data in hybrid_res.get("quotes", []):
            exp = q_data.get("expires_at")
            if isinstance(exp, str):
                try:
                    exp = datetime.fromisoformat(exp)
                except Exception:
                    exp = now + timedelta(minutes=30)
            elif not isinstance(exp, datetime):
                exp = now + timedelta(minutes=30)

            est_date = q_data.get("estimated_delivery_date")
            if isinstance(est_date, str):
                try:
                    est_date = datetime.fromisoformat(est_date)
                except Exception:
                    est_date = now + timedelta(days=int(q_data.get("estimated_delivery_days", 2)))

            quote_obj = ShippingRateQuote(
                courier_id=str(q_data["courier_id"]),
                courier_name=str(q_data["courier_name"]),
                rate=float(q_data["rate"]),
                currency=str(q_data.get("currency", "INR")),
                estimated_delivery_days=int(q_data.get("estimated_delivery_days", 2)),
                estimated_delivery_date=est_date,
                service_type=str(q_data.get("service_type", "surface")),
                is_cod_available=bool(q_data.get("is_cod_available", True)),
                cod_charges=float(q_data.get("cod_charges", 0.0)),
                insurance_available=bool(q_data.get("insurance_available", True)),
                insurance_fee=float(q_data.get("insurance_fee", 0.0)),
                quote_id=str(q_data["quote_id"]),
                expires_at=exp,
                provider=str(q_data.get("provider", "courier"))
            )
            quotes_list.append(quote_obj)

            db.shipping_quotes.update_one(
                {"quote_id": quote_obj.quote_id},
                {
                    "$set": {
                        "quote_id": quote_obj.quote_id,
                        "product_id": product_id,
                        "pickup_pincode": pickup_pincode,
                        "delivery_pincode": delivery_pincode,
                        "courier_id": quote_obj.courier_id,
                        "courier_name": quote_obj.courier_name,
                        "rate": quote_obj.rate,
                        "cod_charges": quote_obj.cod_charges,
                        "insurance_fee": quote_obj.insurance_fee,
                        "estimated_delivery_days": quote_obj.estimated_delivery_days,
                        "provider": quote_obj.provider,
                        "created_at": now,
                        "expires_at": quote_obj.expires_at,
                    }
                },
                upsert=True
            )

        return ShippingQuoteResponse(
            is_serviceable=len(quotes_list) > 0,
            pickup_pincode=pickup_pincode,
            delivery_pincode=delivery_pincode,
            quotes=quotes_list,
            message=hybrid_res.get("routing_summary")
        )

    @staticmethod
    def book_shipment(seller_id: str, order_id: str, req: ShipmentBookRequest) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["seller_id"] != seller_id:
            raise ForbiddenError("Only the designated seller can book shipping for this order.")

        # Must be paid or COD authorized
        valid_states = [OrderStatus.PAID.value, OrderStatus.PROCESSING.value, "paid", "processing"]
        if order["status"] not in valid_states:
            raise ConflictError(f"Cannot book shipment while order is in '{order['status']}' state. Order must be paid or confirmed.")

        # Idempotency check: if already booked, return existing booking info
        if order.get("shipment_info") and order["shipment_info"].get("awb_code"):
            return order["shipment_info"]

        # Validate lithium-ion battery declaration
        if not req.is_battery_declared:
            raise ValidationError("Lithium-ion battery declaration is required for smartphone transit regulations.")

        product = db.products.find_one({"id": order["product_id"]})
        product_title = product.get("title", "Smartphone") if product else "Smartphone"

        seller = db.users.find_one({"id": seller_id})
        seller_addr = {
            "name": seller.get("name", "Seller"),
            "phone": seller.get("phone", "9999999999"),
            "street": seller.get("street") or "Seller Hub Street",
            "city": seller.get("city") or (product.get("location_city") if product else "Mumbai"),
            "state": seller.get("state") or "Maharashtra",
            "postal_code": seller.get("postal_code") or settings.DEFAULT_PICKUP_PINCODE,
            "country": "India"
        }

        courier_provider = get_courier_provider()
        now = datetime.now(timezone.utc)

        is_cod = (order.get("payment_method") == "cod")
        cod_amount = float(order.get("transaction_price", 0.0)) if is_cod else 0.0

        target_courier_id = req.courier_id or order.get("courier_id")
        if target_courier_id == "revalue_local_direct":
            from app.services.dispatch_service import DispatchService
            local_job = DispatchService.create_local_delivery_job(order_id)
            suffix = order_id[-8:].upper()
            awb_code = f"AWB-REVLOC-{suffix}"
            courier_name = "ReValue Local Direct (Verified Partner)"
            token_suffix = order_id[-6:].upper()
            pickup_token = f"LOC-PICK-{token_suffix}"
            pickup_date = req.pickup_date or (now + timedelta(days=1))
            
            shipment_data = {
                "shipment_id": local_job["id"],
                "awb_code": awb_code,
                "courier_name": courier_name,
                "courier_id": "revalue_local_direct",
                "label_url": f"/api/v1/orders/{order_id}/shipment/label",
                "manifest_url": None,
                "pickup_token": pickup_token,
                "pickup_scheduled_date": pickup_date,
                "is_courier_verified": False,
                "is_local_delivery": True,
                "booked_at": now,
                "notes": "Assigned to ReValue local delivery partner network."
            }
            db.orders.update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "status": "seller_dispatch_pending",
                        "shipment_info": shipment_data,
                        "courier_id": "revalue_local_direct",
                        "courier_name": courier_name,
                        "updated_at": now
                    },
                    "$push": {
                        "status_history": {
                            "status": "seller_dispatch_pending",
                            "timestamp": now,
                            "updated_by": f"seller_{seller_id}",
                            "note": f"Order booked for ReValue Local Partner dispatch (AWB: {awb_code}). Queued for partner pickup."
                        }
                    }
                }
            )
            return {
                "message": f"Local delivery partner dispatch booked for order {order_id}.",
                "order_id": order_id,
                "awb_code": awb_code,
                "shipment_id": local_job["id"],
                "courier_name": courier_name,
                "label_url": f"/api/v1/orders/{order_id}/shipment/label",
                "pickup_token": pickup_token,
                "status": "seller_dispatch_pending",
                "is_local_delivery": True
            }

        courier_req = CourierBookingReq(
            order_id=order_id,
            courier_id=req.courier_id or order.get("courier_id"),
            seller_pickup_address=seller_addr,
            buyer_delivery_address=order["shipping_address"],
            package_weight_kg=req.package_weight_kg,
            length_cm=req.length_cm,
            breadth_cm=req.breadth_cm,
            height_cm=req.height_cm,
            declared_value=float(order["transaction_price"]),
            product_title=product_title,
            imei_or_serial=req.imei_or_serial,
            is_battery_declared=req.is_battery_declared,
            is_cod=is_cod,
            cod_amount=cod_amount,
            opt_in_insurance=bool(order.get("insurance_fee", 0) > 0)
        )

        booking_res = courier_provider.create_shipment(courier_req)
        if not booking_res.success:
            raise ValidationError(booking_res.message or "Courier provider failed to book shipment.")

        pickup_date = req.pickup_date or (now + timedelta(days=1))
        pickup_token = booking_res.pickup_token

        # Schedule pickup if provider supports it
        try:
            pickup_res = courier_provider.schedule_pickup(CourierPickupReq(
                shipment_id=booking_res.shipment_id,
                awb_code=booking_res.awb_code,
                pickup_date=pickup_date,
                pickup_time_slot=req.pickup_time_slot,
                pickup_address=seller_addr
            ))
            if pickup_res.success and pickup_res.pickup_token_number:
                pickup_token = pickup_res.pickup_token_number
        except Exception as e:
            logger.warning(f"Pickup scheduling notice for order {order_id}: {str(e)}")

        shipment_data = {
            "courier_name": booking_res.courier_name,
            "tracking_number": booking_res.awb_code,
            "shipment_id": booking_res.shipment_id,
            "awb_code": booking_res.awb_code,
            "dispatch_date": now,
            "shipped_by_seller_at": now,
            "is_courier_verified": False,  # Physical handover pending
            "label_url": booking_res.label_url,
            "manifest_url": booking_res.manifest_url,
            "pickup_token": pickup_token,
            "pickup_scheduled_date": pickup_date,
            "handover_confirmed_at": None,
            "delivered_at": None,
            "pod_url": None,
            "package_weight_kg": req.package_weight_kg,
            "dimensions": f"{req.length_cm}x{req.breadth_cm}x{req.height_cm} cm",
            "is_battery_declared": req.is_battery_declared,
            "imei_or_serial": req.imei_or_serial,
        }

        history_item = {
            "status": OrderStatus.SHIPMENT_BOOKED.value,
            "timestamp": now,
            "updated_by": seller_id,
            "note": f"Shipment booked with {booking_res.courier_name} (AWB: {booking_res.awb_code}). Label ready. Pickup scheduled for {pickup_date.strftime('%Y-%m-%d')}."
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.SHIPMENT_BOOKED.value,
                    "shipment_info": shipment_data,
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        # Notify buyer
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["buyer_id"],
            "title": "Shipment Booked & Label Created",
            "message": f"Your order {order_id} has been booked with {booking_res.courier_name} (AWB: {booking_res.awb_code}). Seller is preparing the package for courier handover.",
            "link": f"/orders/{order_id}/tracking",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Order {order_id} booked with courier. AWB: {booking_res.awb_code}")
        return shipment_data

    @staticmethod
    def update_shipment(seller_id: str, order_id: str, req: ShipmentUpdateRequest) -> Dict[str, Any]:
        """
        Seller manually records or updates courier dispatch details.
        Maintains backward compatibility with seller manual shipping flows.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["seller_id"] != seller_id:
            raise ForbiddenError("Only the seller may update shipping details.")

        now = datetime.now(timezone.utc)
        dispatch_date = req.dispatch_date or now

        shipment_data = {
            "courier_name": req.courier_name,
            "tracking_number": req.tracking_number,
            "dispatch_date": dispatch_date,
            "shipped_by_seller_at": now,
            "is_courier_verified": False,
            "notes": req.notes,
        }

        history_item = {
            "status": OrderStatus.PICKED_UP.value,
            "timestamp": now,
            "updated_by": seller_id,
            "note": f"Dispatched via {req.courier_name} (Tracking: {req.tracking_number})"
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.PICKED_UP.value,
                    "shipment_info": shipment_data,
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["buyer_id"],
            "title": "Item Shipped",
            "message": f"Your order {order_id} has been dispatched via {req.courier_name}. Tracking number: {req.tracking_number}",
            "link": f"/orders/{order_id}/tracking",
            "is_read": False,
            "created_at": now,
        })

        return shipment_data

    @staticmethod
    def get_tracking(user_id: str, order_id: str) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        user = db.users.find_one({"id": user_id})
        is_admin = user and user.get("role") == "admin"
        if order["buyer_id"] != user_id and order["seller_id"] != user_id and not is_admin:
            raise ForbiddenError("Unauthorized to view tracking for this order.")

        awb = None
        if order.get("shipment_info"):
            awb = order["shipment_info"].get("awb_code") or order["shipment_info"].get("tracking_number")

        courier_tracking = None
        if awb:
            courier_provider = get_courier_provider()
            try:
                res = courier_provider.track_shipment(awb)
                courier_tracking = res.model_dump()
            except Exception as e:
                logger.warning(f"Error fetching tracking from courier for {awb}: {e}")

        # Compute remaining hours on deadlines
        now = datetime.now(timezone.utc)
        dispatch_hours_left = None
        if order.get("dispatch_deadline"):
            dl = order["dispatch_deadline"]
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            dispatch_hours_left = max(0.0, round((dl - now).total_seconds() / 3600.0, 1))

        inspection_hours_left = None
        if order.get("inspection_deadline"):
            dl = order["inspection_deadline"]
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            inspection_hours_left = max(0.0, round((dl - now).total_seconds() / 3600.0, 1))

        local_job = db.delivery_jobs.find_one({"order_id": order_id})
        local_job_clean = None
        if local_job:
            local_job_clean = dict(local_job)
            local_job_clean.pop("_id", None)

        buyer_otp_plain = None
        if user_id == order.get("buyer_id") and order.get("delivery_otp"):
            buyer_otp_plain = order["delivery_otp"].get("otp")

        return {
            "local_delivery_job": local_job_clean,
            "buyer_delivery_otp": buyer_otp_plain,
            "order_id": order["order_id"],
            "product_id": order.get("product_id"),
            "product_title": order.get("product_title", "Smartphone"),
            "status": order["status"],
            "payout_status": order.get("payout_status", "held"),
            "payment_method": order.get("payment_method", "prepaid"),
            "dispatch_deadline": order.get("dispatch_deadline"),
            "dispatch_hours_left": dispatch_hours_left,
            "inspection_deadline": order.get("inspection_deadline"),
            "inspection_hours_left": inspection_hours_left,
            "delivery_otp_masked": order.get("delivery_otp_masked"),
            "cod_status": order.get("cod_status", "not_applicable"),
            "shipping_address": order.get("shipping_address"),
            "shipment_info": order.get("shipment_info"),
            "inspection_checklist": order.get("inspection_checklist"),
            "status_history": order.get("status_history", []),
            "courier_tracking": courier_tracking,
        }

    @staticmethod
    def book_return(actor_id: str, order_id: str, req: ReturnBookingRequest) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        user = db.users.find_one({"id": actor_id})
        is_admin = user and user.get("role") == "admin"
        if order["buyer_id"] != actor_id and not is_admin:
            raise ForbiddenError("Unauthorized to book return for this order.")

        seller = db.users.find_one({"id": order["seller_id"]})
        seller_addr = {
            "name": seller.get("name", "Seller"),
            "phone": seller.get("phone", "9999999999"),
            "street": seller.get("street") or "Seller Hub Street",
            "city": seller.get("city") or "Mumbai",
            "state": seller.get("state") or "Maharashtra",
            "postal_code": seller.get("postal_code") or settings.DEFAULT_PICKUP_PINCODE,
            "country": "India"
        }

        courier_provider = get_courier_provider()
        return_res = courier_provider.book_return_pickup(
            order_id=order_id,
            buyer_address=order["shipping_address"],
            seller_address=seller_addr,
            weight_kg=0.5,
            reason=req.reason
        )

        now = datetime.now(timezone.utc)
        history_item = {
            "status": OrderStatus.RETURN_IN_TRANSIT.value,
            "timestamp": now,
            "updated_by": actor_id,
            "note": f"Reverse pickup booked with {return_res.courier_name} (AWB: {return_res.return_awb_code}). Reason: {req.reason}"
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.RETURN_IN_TRANSIT.value,
                    "return_info": return_res.model_dump(),
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        return return_res.model_dump()

    @staticmethod
    def get_shipment_label(user_id: str, order_id: str) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        user = db.users.find_one({"id": user_id})
        is_admin = user and user.get("role") == "admin"

        if order["seller_id"] != user_id and order["buyer_id"] != user_id and not is_admin:
            raise ForbiddenError("Unauthorized to access shipment label for this order.")

        shipment_info = order.get("shipment_info")
        if not shipment_info or not shipment_info.get("awb_code"):
            raise NotFoundError("No shipment has been booked for this order yet.")

        if shipment_info.get("is_local_delivery"):
            return {
                "order_id": order_id,
                "awb_code": shipment_info["awb_code"],
                "courier_name": shipment_info.get("courier_name", "ReValue Local Direct (Verified Partner)"),
                "label_url": shipment_info.get("label_url", f"/api/v1/orders/{order_id}/shipment/label"),
                "is_local_delivery": True,
            }

        courier_provider = get_courier_provider()
        label_res = courier_provider.generate_label(shipment_info["awb_code"])

        return {
            "order_id": order_id,
            "awb_code": shipment_info["awb_code"],
            "courier_name": shipment_info.get("courier_name", "Courier"),
            "label_url": label_res.label_url or shipment_info.get("label_url"),
        }

    @staticmethod
    def confirm_handover(actor_id: str, order_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Confirms physical parcel handover to courier (pickup manifest or courier drop-off).
        CREATING A SHIPPING LABEL IS NOT A HANDOVER.
        Only genuine courier pickup confirmation advances to PICKED_UP.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        user = db.users.find_one({"id": actor_id})
        is_admin = user and user.get("role") == "admin"
        if order["seller_id"] != actor_id and not is_admin:
            raise ForbiddenError("Only the seller or marketplace administrator can record courier handover.")

        if order["status"] not in [OrderStatus.SHIPMENT_BOOKED.value, OrderStatus.PICKUP_SCHEDULED.value, "shipment_booked", "pickup_scheduled"]:
            raise ConflictError(f"Cannot confirm handover when order is in '{order['status']}' state.")

        now = datetime.now(timezone.utc)
        courier_provider = get_courier_provider()

        # Generate Delivery OTP for buyer upon physical handover
        buyer_phone = order["shipping_address"].get("phone", "")
        otp_res = courier_provider.generate_delivery_otp(order_id, buyer_phone)

        history_item = {
            "status": OrderStatus.PICKED_UP.value,
            "timestamp": now,
            "updated_by": actor_id,
            "note": notes or "Physical handover confirmed. Parcel collected by courier agent and entered transit network."
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.PICKED_UP.value,
                    "delivery_otp_masked": otp_res.otp_masked,
                    "shipment_info.is_courier_verified": True,
                    "shipment_info.handover_confirmed_at": now,
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        # Notify buyer
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["buyer_id"],
            "title": "Parcel Picked Up by Courier",
            "message": f"Your package for order {order_id} has been physically collected by the courier. Your delivery verification OTP is {otp_res.otp_masked}.",
            "link": f"/orders/{order_id}/tracking",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Physical handover confirmed for order {order_id}. OTP: {otp_res.otp_masked}")
        return {
            "order_id": order_id,
            "status": OrderStatus.PICKED_UP.value,
            "delivery_otp_masked": otp_res.otp_masked,
            "handover_confirmed_at": now
        }

    @staticmethod
    def verify_delivery_otp_and_complete(actor_id: str, order_id: str, entered_otp: str) -> Dict[str, Any]:
        """
        Verifies doorstep delivery OTP and marks order as DELIVERED.
        Begins the mandatory 48-HOUR BUYER INSPECTION PERIOD.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        # Check OTP with courier adapter
        courier_provider = get_courier_provider()
        is_valid = courier_provider.verify_delivery_otp(order_id, entered_otp)
        if not is_valid:
            raise ValidationError("Invalid or expired delivery OTP. Please verify with the recipient.")

        now = datetime.now(timezone.utc)
        inspection_deadline = now + timedelta(hours=settings.INSPECTION_WINDOW_HOURS)

        # Update order to DELIVERED
        history_item = {
            "status": OrderStatus.DELIVERED.value,
            "timestamp": now,
            "updated_by": actor_id,
            "note": f"Delivered to doorstep. Delivery OTP verified. 48-Hour Buyer Inspection Period started (Deadline: {inspection_deadline.strftime('%Y-%m-%d %H:%M UTC')})."
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.DELIVERED.value,
                    "payout_status": PayoutStatus.HELD_INSPECTION.value,
                    "inspection_deadline": inspection_deadline,
                    "shipment_info.delivered_at": now,
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        # Notify buyer to start inspection
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["buyer_id"],
            "title": "Phone Delivered — 48h Inspection Period Active",
            "message": f"Your smartphone has been delivered! You have 48 hours to complete the hardware checklist. Payout remains securely held until you confirm or the deadline passes.",
            "link": f"/orders/{order_id}/tracking",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Order {order_id} marked as DELIVERED via OTP. Inspection active until {inspection_deadline}")
        return {
            "order_id": order_id,
            "status": OrderStatus.DELIVERED.value,
            "inspection_deadline": inspection_deadline,
            "message": "Delivery verified. 48-hour buyer inspection window is now active."
        }

    @staticmethod
    def submit_inspection_checklist(buyer_id: str, order_id: str, req: InspectionChecklistSubmitRequest) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["buyer_id"] != buyer_id:
            raise ForbiddenError("Only the buyer who received this device can submit the inspection checklist.")

        now = datetime.now(timezone.utc)
        checklist_doc = {
            "order_id": order_id,
            "buyer_id": buyer_id,
            "screen_ok": req.screen_ok,
            "touch_ok": req.touch_ok,
            "cameras_ok": req.cameras_ok,
            "audio_ok": req.audio_ok,
            "charging_battery_ok": req.charging_battery_ok,
            "physical_condition_matches": req.physical_condition_matches,
            "imei_matches": req.imei_matches,
            "notes": req.notes,
            "submitted_at": now,
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "inspection_checklist": checklist_doc,
                    "updated_at": now,
                }
            }
        )

        # If all checks are OK, record passing milestone
        all_ok = (req.screen_ok and req.touch_ok and req.cameras_ok and req.audio_ok and req.charging_battery_ok and req.physical_condition_matches and req.imei_matches)

        logger.info(f"Buyer {buyer_id} submitted inspection checklist for order {order_id}. All passed: {all_ok}")
        return {
            "order_id": order_id,
            "all_passed": all_ok,
            "checklist": checklist_doc,
            "message": "Inspection checklist recorded successfully."
        }

    @staticmethod
    def confirm_receipt(buyer_id: str, order_id: str) -> Dict[str, Any]:
        """
        Buyer confirms device acceptance after inspection.
        Releases seller payout and completes the order.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["buyer_id"] != buyer_id:
            raise ForbiddenError("Only the buyer who placed this order can confirm receipt.")

        if order["status"] in [OrderStatus.RECEIPT_CONFIRMED.value, OrderStatus.COMPLETED.value]:
            return {"message": "Receipt already confirmed for this order.", "status": order["status"]}

        # Must be in dispatched, transit, or delivered state
        valid_states = [
            OrderStatus.DELIVERED.value, OrderStatus.INSPECTION_PASSED.value,
            OrderStatus.PICKED_UP.value, OrderStatus.IN_TRANSIT.value, OrderStatus.OUT_FOR_DELIVERY.value,
            OrderStatus.SHIPMENT_BOOKED.value, "delivered", "shipped", "picked_up", "in_transit", "out_for_delivery"
        ]
        if order["status"] not in valid_states:
            raise ConflictError(f"Receipt cannot be confirmed while order is '{order['status']}'. Must be delivered.")

        # Check for active dispute
        if order["status"] == OrderStatus.DISPUTED.value or order.get("payout_status") == PayoutStatus.BLOCKED_DISPUTE.value:
            raise ConflictError("Cannot confirm receipt and release payout while a dispute is active.")

        now = datetime.now(timezone.utc)
        history_item = {
            "status": OrderStatus.RECEIPT_CONFIRMED.value,
            "timestamp": now,
            "updated_by": buyer_id,
            "note": "Buyer confirmed receipt and satisfactory hardware inspection."
        }

        # Release payout to seller
        payment_provider = get_payment_provider()
        seller_share = float(order.get("item_price") or order["transaction_price"])

        payout_res = payment_provider.release_payout(
            order_id=order_id,
            seller_id=order["seller_id"],
            amount=seller_share,
            currency=order.get("currency", "INR"),
        )

        payout_status = PayoutStatus.RELEASED.value if payout_res.get("success") else PayoutStatus.PROCESSING.value
        final_status = OrderStatus.COMPLETED.value

        completion_history = {
            "status": OrderStatus.COMPLETED.value,
            "timestamp": now,
            "updated_by": "system",
            "note": f"Order completed upon buyer confirmation. Seller payout of ₹{seller_share:,.2f} released."
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": final_status,
                    "payout_status": payout_status,
                    "updated_at": now,
                },
                "$push": {"status_history": {"$each": [history_item, completion_history]}}
            }
        )

        # Notify seller
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["seller_id"],
            "title": "Receipt Confirmed & Payout Released",
            "message": f"Buyer confirmed receipt for order {order_id}. Your payout of ₹{seller_share:,.2f} has been released to your verified settlement account.",
            "link": "/dashboard/seller",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Buyer {buyer_id} confirmed receipt for order {order_id}. Order completed, payout released.")
        return {"message": "Receipt confirmed successfully. Order is complete.", "status": final_status}

    @staticmethod
    def process_inspection_timeouts() -> int:
        """
        Reconciles orders whose 48-hour inspection deadline has elapsed without dispute.
        Automatically advances to inspection_passed and completes the payout release.
        """
        db = get_db()
        now = datetime.now(timezone.utc)

        cursor = db.orders.find({
            "status": OrderStatus.DELIVERED.value,
            "payout_status": PayoutStatus.HELD_INSPECTION.value,
            "inspection_deadline": {"$lte": now}
        })

        count = 0
        payment_provider = get_payment_provider()

        for order in cursor:
            order_id = order["order_id"]

            # Double check if any open dispute exists
            if db.disputes.find_one({"order_id": order_id, "status": "open"}):
                continue

            seller_share = float(order.get("item_price") or order["transaction_price"])
            payout_res = payment_provider.release_payout(
                order_id=order_id,
                seller_id=order["seller_id"],
                amount=seller_share,
                currency=order.get("currency", "INR"),
            )

            history_item = {
                "status": OrderStatus.INSPECTION_PASSED.value,
                "timestamp": now,
                "updated_by": "system",
                "note": "48-Hour Buyer Inspection Period elapsed without dispute. Payout released automatically."
            }

            db.orders.update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "status": OrderStatus.COMPLETED.value,
                        "payout_status": PayoutStatus.RELEASED.value if payout_res.get("success") else PayoutStatus.PROCESSING.value,
                        "updated_at": now,
                    },
                    "$push": {"status_history": history_item}
                }
            )

            # Notify parties
            db.notifications.insert_one({
                "_id": str(uuid.uuid4()),
                "user_id": order["seller_id"],
                "title": "Inspection Period Complete — Payout Released",
                "message": f"The 48-hour inspection period for order {order_id} concluded with zero disputes. Payout of ₹{seller_share:,.2f} released.",
                "link": "/dashboard/seller",
                "is_read": False,
                "created_at": now,
            })

            count += 1
            logger.info(f"Auto-completed order {order_id} following 48h inspection timeout.")

        return count

    @staticmethod
    def open_dispute(buyer_id: str, order_id: str, req: DisputeCreateRequest) -> DisputeResponse:
        """
        Opens a buyer dispute. IMMEDIATELY BLOCKS SELLER PAYOUT.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["buyer_id"] != buyer_id:
            raise ForbiddenError("Only the buyer may open a dispute for this order.")

        # Check existing open dispute
        if db.disputes.find_one({"order_id": order_id, "status": "open"}):
            raise ConflictError("A dispute is already open for this order.")

        now = datetime.now(timezone.utc)
        dispute_id = f"disp_{uuid.uuid4().hex[:12]}"

        dispute_doc = {
            "_id": dispute_id,
            "id": dispute_id,
            "order_id": order_id,
            "opened_by_user_id": buyer_id,
            "seller_id": order["seller_id"],
            "reason": req.reason.value,
            "details": req.details,
            "evidence_images": req.evidence_images,
            "preferred_resolution": req.preferred_resolution or "return_and_refund",
            "requested_refund_amount": req.requested_refund_amount,
            "status": "open",
            "resolution_notes": None,
            "resolved_action": None,
            "refund_amount_issued": None,
            "created_at": now,
            "resolved_at": None,
        }
        db.disputes.insert_one(dispute_doc)

        # Update order status to DISPUTED and block payout
        history_item = {
            "status": OrderStatus.DISPUTED.value,
            "timestamp": now,
            "updated_by": buyer_id,
            "note": f"Dispute opened by buyer: {req.reason.value}. Reason: {req.details[:100]}... Payout BLOCKED."
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.DISPUTED.value,
                    "payout_status": PayoutStatus.BLOCKED_DISPUTE.value,
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        # Notify seller and admin
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["seller_id"],
            "title": "Dispute Opened — Payout Blocked",
            "message": f"Buyer opened a dispute for order {order_id} ({req.reason.value}). Payout is held pending resolution.",
            "link": "/dashboard/seller",
            "is_read": False,
            "created_at": now,
        })

        logger.warning(f"Dispute {dispute_id} opened for order {order_id}. Payout BLOCKED.")
        return DisputeResponse(
            id=dispute_id,
            order_id=order_id,
            opened_by_user_id=buyer_id,
            reason=req.reason,
            details=req.details,
            evidence_images=req.evidence_images,
            preferred_resolution=req.preferred_resolution,
            requested_refund_amount=req.requested_refund_amount,
            status="open",
            created_at=now,
        )

    @staticmethod
    def resolve_dispute(
        admin_id: str,
        dispute_id: str,
        action: str,
        resolution_notes: str,
        partial_refund_amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Administrative dispute resolution:
        - "refund_buyer_full": Full refund to buyer, order cancelled/refunded.
        - "refund_buyer_partial": Partial refund to buyer, remainder released to seller.
        - "authorize_return": Reverse pickup booked, returns device to seller.
        - "release_seller": Dismisses claim, releases seller payout.
        """
        db = get_db()
        dispute = db.disputes.find_one({"id": dispute_id})
        if not dispute:
            raise NotFoundError("Dispute not found.")

        if dispute["status"] == "resolved":
            return {"message": "Dispute is already resolved.", "status": "resolved"}

        order = db.orders.find_one({"order_id": dispute["order_id"]})
        if not order:
            raise NotFoundError("Associated order not found.")

        now = datetime.now(timezone.utc)
        order_id = order["order_id"]
        payment_provider = get_payment_provider()

        total_order_amount = float(order["transaction_price"])
        refund_amount = 0.0

        if action == "refund_buyer_full":
            refund_amount = total_order_amount
            new_order_status = OrderStatus.REFUNDED.value
            new_payout_status = PayoutStatus.REFUNDED_TO_BUYER.value

            note = f"Dispute resolved by Admin {admin_id}. Full refund of ₹{refund_amount:,.2f} issued to buyer. Payout cancelled."
            order_history = {"status": OrderStatus.REFUNDED.value, "timestamp": now, "updated_by": admin_id, "note": note}

        elif action == "refund_buyer_partial":
            refund_amount = float(partial_refund_amount or (total_order_amount * 0.2))
            if refund_amount >= total_order_amount:
                raise ValidationError("Partial refund amount cannot equal or exceed total order price.")

            seller_remainder = total_order_amount - refund_amount
            payment_provider.release_payout(order_id, order["seller_id"], seller_remainder, "INR")

            new_order_status = OrderStatus.COMPLETED.value
            new_payout_status = PayoutStatus.RELEASED.value
            note = f"Dispute resolved by Admin {admin_id}. Partial refund of ₹{refund_amount:,.2f} to buyer. Remaining ₹{seller_remainder:,.2f} released to seller."
            order_history = {"status": OrderStatus.COMPLETED.value, "timestamp": now, "updated_by": admin_id, "note": note}

        elif action == "authorize_return":
            new_order_status = OrderStatus.RETURN_REQUESTED.value
            new_payout_status = PayoutStatus.BLOCKED_DISPUTE.value
            note = f"Dispute resolved by Admin {admin_id}. Return authorized. Reverse courier pickup queued."
            order_history = {"status": OrderStatus.RETURN_REQUESTED.value, "timestamp": now, "updated_by": admin_id, "note": note}

        elif action == "release_seller":
            seller_share = float(order.get("item_price") or order["transaction_price"])
            payment_provider.release_payout(order_id, order["seller_id"], seller_share, "INR")

            new_order_status = OrderStatus.COMPLETED.value
            new_payout_status = PayoutStatus.RELEASED.value
            note = f"Dispute resolved in seller's favor by Admin {admin_id}. Buyer claim dismissed. Payout of ₹{seller_share:,.2f} released."
            order_history = {"status": OrderStatus.COMPLETED.value, "timestamp": now, "updated_by": admin_id, "note": note}
        else:
            raise ValidationError(f"Invalid dispute resolution action '{action}'.")

        # Update dispute doc
        db.disputes.update_one(
            {"id": dispute_id},
            {
                "$set": {
                    "status": "resolved",
                    "resolution_notes": resolution_notes,
                    "resolved_action": action,
                    "refund_amount_issued": refund_amount if refund_amount > 0 else None,
                    "resolved_at": now,
                }
            }
        )

        # Update order doc
        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": new_order_status,
                    "payout_status": new_payout_status,
                    "updated_at": now,
                },
                "$push": {"status_history": order_history}
            }
        )

        # Notify buyer & seller
        db.notifications.insert_many([
            {
                "_id": str(uuid.uuid4()),
                "user_id": order["buyer_id"],
                "title": "Dispute Decision Issued",
                "message": f"Marketplace admin resolved dispute for order {order_id}. Action: {action.replace('_', ' ')}. Notes: {resolution_notes}",
                "link": f"/orders/{order_id}/tracking",
                "is_read": False,
                "created_at": now,
            },
            {
                "_id": str(uuid.uuid4()),
                "user_id": order["seller_id"],
                "title": "Dispute Resolution Notification",
                "message": f"Marketplace admin resolved dispute for order {order_id}. Action: {action.replace('_', ' ')}. Notes: {resolution_notes}",
                "link": "/dashboard/seller",
                "is_read": False,
                "created_at": now,
            }
        ])

        logger.info(f"Dispute {dispute_id} resolved with action '{action}' by Admin {admin_id}")
        return {
            "dispute_id": dispute_id,
            "action": action,
            "order_id": order_id,
            "refund_issued": refund_amount,
            "status": "resolved"
        }

    @staticmethod
    def process_courier_webhook(body_bytes: bytes, payload: Dict[str, Any], headers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates, deduplicates, and processes courier tracking webhooks.
        """
        courier_provider = get_courier_provider()
        if not courier_provider.verify_webhook(body_bytes, headers):
            raise ForbiddenError("Webhook signature validation failed.")

        parsed = courier_provider.parse_webhook_event(payload)
        awb = parsed.get("awb_code")
        canonical_status = parsed.get("canonical_status")

        if not awb:
            return {"status": "ignored", "reason": "No AWB in payload"}

        db = get_db()
        order = db.orders.find_one({"shipment_info.tracking_number": awb})
        if not order:
            # Try searching by shipment_id or order_id
            order = db.orders.find_one({"order_id": parsed.get("order_id")})

        if not order:
            logger.warning(f"[Webhook] No order found matching courier AWB {awb}")
            return {"status": "ignored", "reason": f"No order associated with AWB {awb}"}

        order_id = order["order_id"]
        now = datetime.now(timezone.utc)

        # Deduplication check: if status is identical, return OK
        if order["status"] == canonical_status:
            return {"status": "duplicate", "order_id": order_id, "canonical_status": canonical_status}

        history_item = {
            "status": canonical_status,
            "timestamp": now,
            "updated_by": "courier_webhook",
            "note": f"Courier tracking scan ({parsed.get('raw_status')}): {parsed.get('activity')} at {parsed.get('location')}"
        }

        update_fields: Dict[str, Any] = {
            "status": canonical_status,
            "updated_at": now,
        }

        if canonical_status == OrderStatus.PICKED_UP.value:
            update_fields["shipment_info.is_courier_verified"] = True
            update_fields["shipment_info.handover_confirmed_at"] = now

        elif canonical_status == OrderStatus.DELIVERED.value:
            inspection_deadline = now + timedelta(hours=settings.INSPECTION_WINDOW_HOURS)
            update_fields["shipment_info.delivered_at"] = now
            update_fields["shipment_info.pod_url"] = parsed.get("pod_url")
            update_fields["inspection_deadline"] = inspection_deadline
            update_fields["payout_status"] = PayoutStatus.HELD_INSPECTION.value

        elif canonical_status == OrderStatus.RTO_INITIATED.value:
            update_fields["shipment_info.is_rto"] = True
            update_fields["shipment_info.rto_reason"] = parsed.get("failure_reason", "Multiple failed delivery attempts")

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": update_fields,
                "$push": {"status_history": history_item}
            }
        )

        logger.info(f"[Webhook] Order {order_id} updated to '{canonical_status}' from AWB {awb}")
        return {"status": "processed", "order_id": order_id, "canonical_status": canonical_status}

    @staticmethod
    def reconcile_cod(awb_code: str, remitted_amount: float, courier_reference: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Reconciles courier COD cash collection and remittance report against order ledger.
        """
        db = get_db()
        order = db.orders.find_one({"shipment_info.tracking_number": awb_code})
        if not order:
            raise NotFoundError(f"No order found with tracking number {awb_code}")

        expected_amount = float(order.get("transaction_price", 0.0))
        difference = round(remitted_amount - expected_amount, 2)
        is_exact = abs(difference) < 1.0

        now = datetime.now(timezone.utc)
        cod_status = "reconciled" if is_exact else "exception"

        reconciliation_doc = {
            "awb_code": awb_code,
            "order_id": order["order_id"],
            "expected_amount": expected_amount,
            "remitted_amount": remitted_amount,
            "difference": difference,
            "courier_reference": courier_reference,
            "status": cod_status,
            "notes": notes,
            "reconciled_at": now,
        }

        db.orders.update_one(
            {"order_id": order["order_id"]},
            {
                "$set": {
                    "cod_status": cod_status,
                    "cod_remittance_info": reconciliation_doc,
                    "updated_at": now,
                }
            }
        )

        logger.info(f"COD reconciled for order {order['order_id']} (AWB {awb_code}). Status: {cod_status}, Diff: {difference}")
        return reconciliation_doc
