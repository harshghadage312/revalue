import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.delivery import (
    ShipmentUpdateRequest, ShipmentInfoResponse, DisputeCreateRequest,
    DisputeResponse, DisputeReason
)
from app.schemas.orders import OrderStatus
from app.integrations.payments.manager import get_payment_provider
from app.core.logging import logger


class DeliveryService:
    @staticmethod
    def update_shipment(seller_id: str, order_id: str, req: ShipmentUpdateRequest) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["seller_id"] != seller_id:
            raise ForbiddenError("Only the order's seller may dispatch and update shipment details.")

        if order["status"] not in [OrderStatus.PAID.value, OrderStatus.PROCESSING.value, OrderStatus.SHIPPED.value]:
            raise ConflictError(f"Cannot update shipment when order is in '{order['status']}' state.")

        now = datetime.now(timezone.utc)
        dispatch_dt = req.dispatch_date or now

        shipment_data = {
            "courier_name": req.courier_name.strip(),
            "tracking_number": req.tracking_number.strip(),
            "dispatch_date": dispatch_dt,
            "shipped_by_seller_at": now,
            "is_courier_verified": False,  # Manual seller confirmation
            "notes": req.notes,
        }

        history_item = {
            "status": OrderStatus.SHIPPED.value,
            "timestamp": now,
            "updated_by": seller_id,
            "note": f"Shipped via {req.courier_name} (Tracking: {req.tracking_number})"
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.SHIPPED.value,
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
            "title": "Order Shipped!",
            "message": f"Your package for order {order_id} was shipped via {req.courier_name} with tracking #{req.tracking_number}.",
            "link": f"/orders/{order_id}/tracking",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Order {order_id} marked as SHIPPED by seller {seller_id}")
        return shipment_data

    @staticmethod
    def confirm_receipt(buyer_id: str, order_id: str) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["buyer_id"] != buyer_id:
            raise ForbiddenError("Only the buyer who placed this order can confirm receipt.")

        # Idempotency: if already confirmed/completed, return success
        if order["status"] in [OrderStatus.RECEIPT_CONFIRMED.value, OrderStatus.COMPLETED.value]:
            return {"message": "Receipt already confirmed for this order.", "status": order["status"]}

        if order["status"] not in [OrderStatus.SHIPPED.value, OrderStatus.DELIVERED.value]:
            raise ConflictError(f"Receipt cannot be confirmed while order is '{order['status']}'. Must be shipped.")

        now = datetime.now(timezone.utc)
        history_item = {
            "status": OrderStatus.RECEIPT_CONFIRMED.value,
            "timestamp": now,
            "updated_by": buyer_id,
            "note": "Buyer confirmed receipt and inspection of item."
        }

        # Check if payout can be released
        payment_provider = get_payment_provider()
        payout_res = payment_provider.release_payout(
            order_id=order_id,
            seller_id=order["seller_id"],
            amount=float(order["transaction_price"]),
            currency=order.get("currency", "INR"),
        )

        final_status = OrderStatus.COMPLETED.value
        payout_status = "released" if payout_res.get("success") else "processing"

        completion_history = {
            "status": OrderStatus.COMPLETED.value,
            "timestamp": now,
            "updated_by": "system",
            "note": "Order completed upon receipt confirmation and settlement initiation."
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
            "message": f"Buyer confirmed receipt for order {order_id}. Your payout of ₹{order['transaction_price']:,.2f} is released.",
            "link": f"/dashboard/seller",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Buyer {buyer_id} confirmed receipt for order {order_id}. Payout status: {payout_status}")
        return {"message": "Receipt confirmed successfully. Order is complete.", "status": final_status}

    @staticmethod
    def open_dispute(buyer_id: str, order_id: str, req: DisputeCreateRequest) -> DisputeResponse:
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
        dispute_id = str(uuid.uuid4())

        dispute_doc = {
            "_id": dispute_id,
            "id": dispute_id,
            "order_id": order_id,
            "opened_by_user_id": buyer_id,
            "seller_id": order["seller_id"],
            "reason": req.reason.value,
            "details": req.details,
            "evidence_images": req.evidence_images,
            "status": "open",
            "resolution_notes": None,
            "created_at": now,
            "resolved_at": None,
        }
        db.disputes.insert_one(dispute_doc)

        # Update order status to DISPUTED and block payout
        history_item = {
            "status": OrderStatus.DISPUTED.value,
            "timestamp": now,
            "updated_by": buyer_id,
            "note": f"Dispute opened: {req.reason.value}"
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.DISPUTED.value,
                    "payout_status": "blocked_dispute",
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        logger.warning(f"Dispute {dispute_id} opened for order {order_id}. Payout BLOCKED.")
        return DisputeResponse(
            id=dispute_id,
            order_id=order_id,
            opened_by_user_id=buyer_id,
            reason=req.reason,
            details=req.details,
            evidence_images=req.evidence_images,
            status="open",
            created_at=now,
        )
