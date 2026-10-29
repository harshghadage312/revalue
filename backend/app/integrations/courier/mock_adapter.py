import uuid
import re
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.integrations.courier.base import (
    CourierProviderInterface, ServiceabilityResult, ShippingRateQuote,
    ShipmentBookingRequest, ShipmentBookingResult, PickupScheduleRequest,
    PickupScheduleResult, LabelResult, TrackingMilestone, TrackingResult,
    DeliveryOtpResult, ReturnBookingResult, CodStatusResult
)
from app.core.logging import logger


class MockCourierAdapter(CourierProviderInterface):
    """
    Deterministic Sandbox Courier Provider Adapter.
    Enables realistic delivery lifecycle, tracking, OTP verification,
    and webhook processing in automated test and development environments.
    """

    def __init__(self, webhook_secret: str = "revalue_sandbox_courier_secret_key"):
        self.webhook_secret = webhook_secret
        self._otps: Dict[str, Dict[str, Any]] = {}
        self._tracking_store: Dict[str, Dict[str, Any]] = {}

    def is_configured(self) -> bool:
        return True

    def _is_valid_pincode(self, pincode: str) -> bool:
        clean = str(pincode).strip()
        # Indian PIN codes: 6 digits, cannot start with 0
        return bool(re.match(r"^[1-9][0-9]{5}$", clean))

    def check_serviceability(
        self,
        pickup_pincode: str,
        delivery_pincode: str,
        weight_kg: float,
        is_cod: bool = False,
        declared_value: float = 0.0
    ) -> ServiceabilityResult:
        pickup = str(pickup_pincode).strip()
        delivery = str(delivery_pincode).strip()

        if not self._is_valid_pincode(pickup) or not self._is_valid_pincode(delivery):
            return ServiceabilityResult(
                is_serviceable=False,
                pickup_pincode=pickup,
                delivery_pincode=delivery,
                quotes=[],
                message="Invalid PIN code format. Please provide valid 6-digit Indian postal codes."
            )

        # Simulated remote/unserviceable PIN code for test coverage
        if delivery == "999999" or pickup == "999999":
            return ServiceabilityResult(
                is_serviceable=False,
                pickup_pincode=pickup,
                delivery_pincode=delivery,
                quotes=[],
                message="Destination PIN code is currently outside courier delivery service zones."
            )

        now = datetime.now(timezone.utc)
        expiry = now + timedelta(minutes=30)
        is_same_city = (pickup[:3] == delivery[:3])

        quotes: List[ShippingRateQuote] = []

        # 1. Delhivery Surface Standard
        base_rate = 120.0 if weight_kg <= 1.0 else (120.0 + (weight_kg - 1.0) * 40.0)
        cod_fee = 40.0 if is_cod else 0.0
        insurance_fee = max(50.0, round(declared_value * 0.012, 2)) if declared_value > 0 else 0.0

        quotes.append(ShippingRateQuote(
            courier_id="mock_delhivery_surface",
            courier_name="Delhivery Surface Express",
            rate=round(base_rate, 2),
            currency="INR",
            estimated_delivery_days=3 if not is_same_city else 2,
            estimated_delivery_date=now + timedelta(days=3 if not is_same_city else 2),
            service_type="surface",
            is_cod_available=True,
            cod_charges=cod_fee,
            insurance_available=True,
            insurance_fee=insurance_fee,
            quote_id=f"quote_dlhv_{uuid.uuid4().hex[:10]}",
            expires_at=expiry,
            provider="sandbox"
        ))

        # 2. BlueDart Air Express
        air_rate = 190.0 if weight_kg <= 1.0 else (190.0 + (weight_kg - 1.0) * 60.0)
        quotes.append(ShippingRateQuote(
            courier_id="mock_bluedart_air",
            courier_name="BlueDart Priority Express",
            rate=round(air_rate, 2),
            currency="INR",
            estimated_delivery_days=2 if not is_same_city else 1,
            estimated_delivery_date=now + timedelta(days=2 if not is_same_city else 1),
            service_type="express",
            is_cod_available=True,
            cod_charges=cod_fee,
            insurance_available=True,
            insurance_fee=insurance_fee,
            quote_id=f"quote_bd_{uuid.uuid4().hex[:10]}",
            expires_at=expiry,
            provider="sandbox"
        ))

        # 3. Same-city Local / Hyperlocal (only available when pickup and delivery are in same zone)
        if is_same_city:
            quotes.append(ShippingRateQuote(
                courier_id="mock_shadowfax_local",
                courier_name="Shadowfax Same-Day City Direct",
                rate=95.0,
                currency="INR",
                estimated_delivery_days=1,
                estimated_delivery_date=now + timedelta(hours=8),
                service_type="hyperlocal",
                is_cod_available=False,
                cod_charges=0.0,
                insurance_available=True,
                insurance_fee=insurance_fee,
                quote_id=f"quote_sfx_{uuid.uuid4().hex[:10]}",
                expires_at=expiry,
                provider="sandbox"
            ))

        return ServiceabilityResult(
            is_serviceable=True,
            pickup_pincode=pickup,
            delivery_pincode=delivery,
            quotes=quotes,
            message="Serviceable via 2 or more certified courier networks."
        )

    def create_shipment(self, req: ShipmentBookingRequest) -> ShipmentBookingResult:
        if not req.is_battery_declared:
            return ShipmentBookingResult(
                success=False,
                shipment_id="",
                awb_code="",
                courier_name="",
                courier_id="",
                status="rejected_compliance",
                is_sandbox=True,
                message="Lithium-ion battery compliance declaration is mandatory for smartphone air/surface transit."
            )

        if req.package_weight_kg > 5.0 or req.length_cm > 50.0:
            return ShipmentBookingResult(
                success=False,
                shipment_id="",
                awb_code="",
                courier_name="",
                courier_id="",
                status="rejected_dimensions",
                is_sandbox=True,
                message="Parcel dimensions or weight exceed allowable limit for smartphone category."
            )

        shipment_id = f"mock_ship_{uuid.uuid4().hex[:12]}"
        awb_code = f"RV-AWB-{uuid.uuid4().hex[:10].upper()}"
        courier_name = "Delhivery Surface Express"
        if req.courier_id and "bluedart" in req.courier_id:
            courier_name = "BlueDart Priority Express"
        elif req.courier_id and "shadowfax" in req.courier_id:
            courier_name = "Shadowfax Same-Day City Direct"

        label_url = f"/api/v1/orders/{req.order_id}/shipment/label"

        # Record initial tracking state
        now = datetime.now(timezone.utc)
        self._tracking_store[awb_code] = {
            "awb_code": awb_code,
            "courier_name": courier_name,
            "order_id": req.order_id,
            "status": "shipment_booked",
            "milestones": [
                {
                    "status": "shipment_booked",
                    "activity": "Shipment booked and AWB generated. Awaiting physical courier handover.",
                    "location": req.seller_pickup_address.get("city", "Mumbai"),
                    "timestamp": now,
                    "raw_status": "MANIFEST_GENERATED"
                }
            ]
        }

        logger.info(f"[MockCourier] Booked shipment {shipment_id} with AWB {awb_code} for order {req.order_id}")
        return ShipmentBookingResult(
            success=True,
            shipment_id=shipment_id,
            awb_code=awb_code,
            courier_name=courier_name,
            courier_id=req.courier_id or "mock_delhivery_surface",
            label_url=label_url,
            manifest_url=f"/api/v1/orders/{req.order_id}/shipment/manifest",
            pickup_token=f"PK-{uuid.uuid4().hex[:6].upper()}",
            status="shipment_booked",
            is_sandbox=True,
            message="Shipment order booked successfully in sandbox.",
            raw_response={"mock_provider": "sandbox", "awb": awb_code}
        )

    def generate_label(self, shipment_id_or_awb: str) -> LabelResult:
        return LabelResult(
            success=True,
            label_url=f"https://revalue.market/docs/mock-labels/{shipment_id_or_awb}.pdf",
            awb_code=shipment_id_or_awb,
            courier_name="Delhivery Surface Express"
        )

    def schedule_pickup(self, req: PickupScheduleRequest) -> PickupScheduleResult:
        now = datetime.now(timezone.utc)
        pickup_token = f"PK-SLOT-{uuid.uuid4().hex[:8].upper()}"

        # Update tracking milestone if AWB is stored
        if req.awb_code in self._tracking_store:
            self._tracking_store[req.awb_code]["status"] = "pickup_scheduled"
            self._tracking_store[req.awb_code]["milestones"].append({
                "status": "pickup_scheduled",
                "activity": f"Courier pickup slot confirmed for {req.pickup_date.strftime('%Y-%m-%d')} ({req.pickup_time_slot or '10:00 - 14:00'}).",
                "location": req.pickup_address.get("city", "Mumbai"),
                "timestamp": now,
                "raw_status": "PICKUP_SCHEDULED"
            })

        logger.info(f"[MockCourier] Scheduled pickup token {pickup_token} for AWB {req.awb_code}")
        return PickupScheduleResult(
            success=True,
            pickup_scheduled_date=req.pickup_date,
            pickup_token_number=pickup_token,
            status="pickup_scheduled",
            message="Pickup slot booked successfully with courier dispatch."
        )

    def cancel_shipment(self, awb_or_shipment_id: str) -> Dict[str, Any]:
        logger.info(f"[MockCourier] Cancelled shipment {awb_or_shipment_id}")
        return {
            "success": True,
            "status": "cancelled",
            "message": "Courier booking cancelled before physical handover."
        }

    def get_tracking(self, awb_code: str) -> TrackingResult:
        data = self._tracking_store.get(awb_code)
        now = datetime.now(timezone.utc)

        if not data:
            return TrackingResult(
                awb_code=awb_code,
                courier_name="Courier Partner",
                current_status="in_transit",
                current_location="Hub Central",
                estimated_delivery=now + timedelta(days=2),
                milestones=[
                    TrackingMilestone(
                        status="in_transit",
                        activity="Package in transit through courier network",
                        location="Central Logistics Hub",
                        timestamp=now
                    )
                ]
            )

        milestones = [
            TrackingMilestone(
                status=m["status"],
                activity=m["activity"],
                location=m.get("location"),
                timestamp=m["timestamp"],
                raw_status=m.get("raw_status")
            ) for m in data.get("milestones", [])
        ]

        return TrackingResult(
            awb_code=awb_code,
            courier_name=data.get("courier_name", "Delhivery Express"),
            current_status=data.get("status", "shipment_booked"),
            current_location=milestones[-1].location if milestones else None,
            estimated_delivery=now + timedelta(days=2),
            delivered_at=data.get("delivered_at"),
            recipient_name=data.get("recipient_name"),
            pod_url=data.get("pod_url"),
            milestones=milestones,
            is_rto=data.get("is_rto", False),
            rto_reason=data.get("rto_reason")
        )

    def verify_webhook(self, body_bytes: bytes, headers: Dict[str, Any]) -> bool:
        signature = (
            headers.get("x-courier-signature") or headers.get("x-shiprocket-signature") or
            headers.get("X-Shiprocket-Signature") or headers.get("X-Courier-Signature")
        )
        if not signature:
            # Fallback to test authorization header
            auth_header = headers.get("authorization") or headers.get("Authorization") or ""
            return auth_header.strip() == f"Bearer {self.webhook_secret}"

        expected = hmac.new(self.webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maps courier webhook payloads to canonical ReValue events:
        - picked_up (Physical handover confirmed)
        - in_transit
        - out_for_delivery
        - delivery_attempted
        - delivered (Physical delivery confirmed)
        - rto_initiated
        - rto_delivered
        """
        raw_status = (payload.get("current_status") or payload.get("status") or "").upper()
        awb = payload.get("awb") or payload.get("awb_code") or payload.get("tracking_number")

        canonical_status = "in_transit"
        if "PICK" in raw_status and ("UP" in raw_status or "COMPLETE" in raw_status or "DONE" in raw_status):
            canonical_status = "picked_up"
        elif "OUT" in raw_status and "DELIVERY" in raw_status:
            canonical_status = "out_for_delivery"
        elif "DELIVERED" in raw_status:
            canonical_status = "delivered"
        elif "ATTEMPT" in raw_status or "FAILED" in raw_status or "UNDELIVERED" in raw_status:
            canonical_status = "delivery_attempted"
        elif "RTO" in raw_status and "DELIVER" in raw_status:
            canonical_status = "rto_delivered"
        elif "RTO" in raw_status or "RETURN" in raw_status:
            canonical_status = "rto_initiated"

        now = datetime.now(timezone.utc)
        location = payload.get("location") or payload.get("scanned_location") or "Regional Hub"

        # Update local tracking store if present
        if awb and awb in self._tracking_store:
            self._tracking_store[awb]["status"] = canonical_status
            if canonical_status == "delivered":
                self._tracking_store[awb]["delivered_at"] = now
                self._tracking_store[awb]["pod_url"] = payload.get("pod_url", f"https://revalue.market/pod/{awb}.jpg")
            self._tracking_store[awb]["milestones"].append({
                "status": canonical_status,
                "activity": payload.get("activity") or f"Courier scan update: {canonical_status}",
                "location": location,
                "timestamp": now,
                "raw_status": raw_status
            })

        return {
            "awb_code": awb,
            "order_id": payload.get("order_id"),
            "canonical_status": canonical_status,
            "raw_status": raw_status,
            "location": location,
            "activity": payload.get("activity") or f"Status updated to {canonical_status}",
            "timestamp": now,
            "pod_url": payload.get("pod_url"),
            "failure_reason": payload.get("failure_reason"),
        }

    def generate_delivery_otp(self, order_id: str, buyer_phone: str) -> DeliveryOtpResult:
        # Generate 6-digit cryptographic OTP
        otp_code = f"{(uuid.uuid4().int % 900000) + 100000}"
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=24)

        # Store salt and hashed OTP in memory
        salt = uuid.uuid4().hex[:8]
        otp_hash = hashlib.sha256(f"{salt}{otp_code}".encode("utf-8")).hexdigest()

        self._otps[order_id] = {
            "salt": salt,
            "hash": otp_hash,
            "code_for_sandbox": otp_code,  # Allowed strictly in sandbox inspection
            "expires_at": expires_at,
            "attempts": 0,
            "verified": False,
        }

        masked = f"**{otp_code[-2:]}"
        logger.info(f"[MockCourier] Generated delivery OTP for order {order_id} (masked: {masked})")

        return DeliveryOtpResult(
            success=True,
            order_id=order_id,
            otp_masked=masked,
            expires_at=expires_at,
            message="Delivery OTP registered. Delivery agent must verify OTP upon physical doorstep delivery."
        )

    def verify_delivery_otp(self, order_id: str, entered_otp: str) -> bool:
        record = self._otps.get(order_id)
        if not record:
            return False

        if record.get("verified"):
            return True

        if record["attempts"] >= 5:
            logger.warning(f"[MockCourier] Max OTP attempts reached for order {order_id}")
            return False

        now = datetime.now(timezone.utc)
        if now > record["expires_at"]:
            logger.warning(f"[MockCourier] Expired OTP attempted for order {order_id}")
            return False

        record["attempts"] += 1

        salt = record["salt"]
        calc_hash = hashlib.sha256(f"{salt}{entered_otp.strip()}".encode("utf-8")).hexdigest()

        if hmac.compare_digest(calc_hash, record["hash"]):
            record["verified"] = True
            logger.info(f"[MockCourier] Delivery OTP verified successfully for order {order_id}")
            return True

        return False

    def request_return_pickup(
        self,
        order_id: str,
        buyer_pickup_address: Dict[str, Any],
        seller_return_address: Dict[str, Any],
        package_weight_kg: float,
        reason: str
    ) -> ReturnBookingResult:
        ret_shipment_id = f"ret_ship_{uuid.uuid4().hex[:10]}"
        ret_awb = f"RV-RET-AWB-{uuid.uuid4().hex[:8].upper()}"

        logger.info(f"[MockCourier] Booked reverse return shipment {ret_shipment_id} (AWB: {ret_awb}) for order {order_id}")
        return ReturnBookingResult(
            success=True,
            return_shipment_id=ret_shipment_id,
            return_awb_code=ret_awb,
            courier_name="Delhivery Reverse Logistics",
            status="return_pickup_scheduled",
            label_url=f"/api/v1/orders/{order_id}/return/label",
            message=f"Reverse pickup booked. Courier will collect device from buyer for return: {reason}"
        )

    def get_cod_status(self, awb_code: str) -> CodStatusResult:
        return CodStatusResult(
            awb_code=awb_code,
            collected=True,
            amount_collected=45000.0,
            remittance_status="pending",
            remittance_reference=f"REMIT-{uuid.uuid4().hex[:8].upper()}",
            remitted_at=None
        )
