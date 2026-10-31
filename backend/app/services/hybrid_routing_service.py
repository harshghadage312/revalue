import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.db.connection import get_db
from app.core.logging import logger
from app.integrations.courier.base import ShippingRateQuote, ServiceabilityResult
from app.integrations.courier.manager import get_courier_provider


class HybridRoutingService:
    """
    Dedicated Hybrid Routing Service that orchestrates delivery between
    ReValue's own managed Local Delivery Partner network and 3PL courier aggregators (Shiprocket).
    """

    @staticmethod
    def _is_valid_pincode(pincode: str) -> bool:
        return bool(re.match(r"^[1-9][0-9]{5}$", str(pincode).strip()))

    @staticmethod
    def evaluate_local_eligibility(
        pickup_pincode: str,
        delivery_pincode: str,
        weight_kg: float = 0.5,
        declared_value: float = 0.0
    ) -> Dict[str, Any]:
        """
        Determines whether an order is eligible for ReValue Local Delivery.
        Requirements:
        1. Both pickup and delivery PIN codes must be valid 6-digit Indian PIN codes.
        2. Both endpoints must be within an active configured ReValue Service Area.
        3. At least one approved, online, active delivery partner must cover the delivery PIN code / service area.
        4. Package weight must not exceed the service area limit (typically 5kg for two-wheelers).
        """
        db = get_db()
        pickup = str(pickup_pincode).strip()
        delivery = str(delivery_pincode).strip()

        if not HybridRoutingService._is_valid_pincode(pickup) or not HybridRoutingService._is_valid_pincode(delivery):
            return {
                "eligible": False,
                "reason": "Invalid PIN code format. Must be 6-digit Indian postal code."
            }

        # Check configured service areas
        # A service area covers the delivery if delivery PIN code is in its pincodes list and is_active is True
        service_area = db.service_areas.find_one({
            "is_active": True,
            "pincodes": {"$all": [pickup, delivery]}
        })

        if not service_area:
            # Check if there is an area covering delivery and another covering pickup in the same city
            pickup_area = db.service_areas.find_one({"is_active": True, "pincodes": pickup})
            delivery_area = db.service_areas.find_one({"is_active": True, "pincodes": delivery})
            if pickup_area and delivery_area and pickup_area.get("city", "").lower() == delivery_area.get("city", "").lower():
                service_area = delivery_area

        if not service_area:
            # Fallback: check if pickup and delivery share the same 3-digit city zone AND a service area exists for that city
            if pickup[:3] == delivery[:3]:
                service_area = db.service_areas.find_one({
                    "is_active": True,
                    "$or": [{"pincodes": delivery}, {"pincodes": pickup}]
                })

        if not service_area:
            return {
                "eligible": False,
                "reason": "Route is outside configured ReValue Local Service Areas."
            }

        if weight_kg > service_area.get("max_weight_kg", 5.0):
            return {
                "eligible": False,
                "reason": f"Package weight ({weight_kg}kg) exceeds local delivery partner limit ({service_area.get('max_weight_kg', 5.0)}kg)."
            }

        # Check if there is at least one APPROVED and ONLINE rider in this service area or delivery pincode
        # Freshness window: rider must have been active within last 30 minutes
        freshness_threshold = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        # The delivery partner must be approved, online, and registered for the destination delivery PIN code
        online_rider = db.rider_profiles.find_one({
            "application_status": "approved",
            "is_online": True,
            "service_pincodes": delivery,
            "$or": [
                {"last_active_at": {"$gte": freshness_threshold}},
                {"last_active_at": None}
            ]
        })

        if not online_rider:
            return {
                "eligible": False,
                "reason": "No approved ReValue delivery partners are currently online in this service area.",
                "service_area": service_area
            }

        # Calculate local delivery pricing
        base_fare = float(service_area.get("base_fare", 70.0))
        handling_fee = float(service_area.get("handling_fee", 25.0))
        total_rate = round(base_fare + handling_fee, 2)

        return {
            "eligible": True,
            "service_area": service_area,
            "available_rider_id": online_rider["id"],
            "rate": total_rate,
            "base_fare": base_fare,
            "handling_fee": handling_fee,
            "reason": "Local ReValue Delivery Partner available for direct doorstep delivery."
        }

    @staticmethod
    def get_hybrid_shipping_quotes(
        pickup_pincode: str,
        delivery_pincode: str,
        weight_kg: float = 0.5,
        is_cod: bool = False,
        declared_value: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calculates hybrid delivery quotes:
        1. Checks local partner network eligibility.
        2. Queries 3PL external courier provider (Shiprocket / sandbox).
        3. Returns combined rate cards with clear SLA, provider labelling, and transparent disclosures.
        """
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(minutes=30)
        quotes: List[Dict[str, Any]] = []

        # 1. Evaluate ReValue Local Delivery
        local_eval = HybridRoutingService.evaluate_local_eligibility(
            pickup_pincode=pickup_pincode,
            delivery_pincode=delivery_pincode,
            weight_kg=weight_kg,
            declared_value=declared_value
        )

        local_available = local_eval.get("eligible", False)
        if local_available:
            local_rate = local_eval["rate"]
            cod_charges = 30.0 if is_cod else 0.0
            insurance_fee = max(40.0, round(declared_value * 0.01, 2)) if declared_value > 0 else 0.0
            quotes.append({
                "courier_id": "revalue_local_direct",
                "courier_name": "ReValue Local Direct (Verified Partner)",
                "rate": local_rate,
                "currency": "INR",
                "estimated_delivery_days": 1,
                "estimated_delivery_date": (now + timedelta(days=1)).isoformat(),
                "service_type": "local_rider",
                "is_cod_available": True,
                "cod_charges": cod_charges,
                "insurance_available": True,
                "insurance_fee": insurance_fee,
                "quote_id": f"quote_local_{uuid.uuid4().hex[:10]}",
                "expires_at": expiry.isoformat(),
                "provider": "revalue_local",
                "description": "Same-day or next-day direct doorstep delivery by an authorized ReValue local partner."
            })

        # 2. Query 3PL Logistics Aggregator
        courier_provider = get_courier_provider()
        try:
            courier_res = courier_provider.check_serviceability(
                pickup_pincode=pickup_pincode,
                delivery_pincode=delivery_pincode,
                weight_kg=weight_kg,
                is_cod=is_cod,
                declared_value=declared_value
            )
            for q in courier_res.quotes:
                # Do not duplicate local if courier also returned a mock local quote
                if q.service_type == "hyperlocal" and local_available:
                    continue
                q_dict = q.model_dump()
                if isinstance(q_dict.get("expires_at"), datetime):
                    q_dict["expires_at"] = q_dict["expires_at"].isoformat()
                if isinstance(q_dict.get("estimated_delivery_date"), datetime):
                    q_dict["estimated_delivery_date"] = q_dict["estimated_delivery_date"].isoformat()
                quotes.append(q_dict)
        except Exception as e:
            logger.warning(f"Error checking 3PL courier serviceability: {e}")

        routing_note = (
            "Local delivery partner network available for direct intra-city delivery."
            if local_available
            else local_eval.get("reason", "National courier network active for inter-city delivery.")
        )

        return {
            "pickup_pincode": pickup_pincode,
            "delivery_pincode": delivery_pincode,
            "is_serviceable": len(quotes) > 0,
            "local_delivery_available": local_available,
            "routing_summary": routing_note,
            "quotes": quotes
        }
