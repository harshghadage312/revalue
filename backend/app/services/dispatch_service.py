import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.db.connection import get_db
from app.core.errors import NotFoundError, ValidationError, ForbiddenError
from app.core.logging import logger
from app.schemas.riders import ServiceAreaCreateRequest


class DispatchService:
    """
    Core Dispatch and Assignment Engine managing local delivery jobs,
    service areas, rider matching, and administrative compensation reconciliation.
    """

    @staticmethod
    def create_local_delivery_job(order_id: str) -> Dict[str, Any]:
        """
        Creates a persistent local delivery job when an order is placed with local delivery.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError(f"Order {order_id} not found.")

        # Check if job already exists for this order
        existing = db.delivery_jobs.find_one({"order_id": order_id})
        if existing:
            return existing

        job_id = f"job_loc_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        pickup_addr = order.get("shipping_address", {})  # Seller pickup address or default
        delivery_addr = order.get("shipping_address", {})
        pickup_pincode = str(pickup_addr.get("postal_code", "400001")).strip()
        delivery_pincode = str(delivery_addr.get("postal_code", "400001")).strip()

        # Check service area for compensation rate
        area = db.service_areas.find_one({
            "is_active": True,
            "$or": [{"pincodes": delivery_pincode}, {"pincodes": pickup_pincode}]
        })
        base_fare = float(area.get("base_fare", 70.0)) if area else 70.0
        handling_fee = float(area.get("handling_fee", 25.0)) if area else 25.0
        total_earnings = round(base_fare + handling_fee, 2)

        compensation = {
            "base_fare": base_fare,
            "distance_fare": 0.0,
            "handling_fee": handling_fee,
            "total_rider_earnings": total_earnings,
            "payout_status": "pending",
            "rate_version": "v1.0",
            "paid_at": None,
            "payout_reference": None
        }

        job_doc = {
            "_id": job_id,
            "id": job_id,
            "order_id": order_id,
            "product_title": order.get("product_title", "Pre-Owned Smartphone"),
            "status": "searching",  # Searching for available local rider
            "delivery_type": "revalue_local",
            "pickup_address": pickup_addr,
            "delivery_address": delivery_addr,
            "pickup_pincode": pickup_pincode,
            "delivery_pincode": delivery_pincode,
            "pickup_city": pickup_addr.get("city", "").lower(),
            "delivery_city": delivery_addr.get("city", "").lower(),
            "package_weight_kg": 0.5,
            "declared_value": float(order.get("transaction_price", 0.0)),
            "is_cod": order.get("payment_method") == "cod",
            "cod_amount": float(order.get("transaction_price", 0.0)) if order.get("payment_method") == "cod" else 0.0,
            "assigned_rider_id": None,
            "assigned_rider_name": None,
            "assigned_rider_phone": None,
            "offer_expires_at": now + timedelta(minutes=15),
            "rejected_by_rider_ids": [],
            "compensation": compensation,
            "pickup_notes": None,
            "delivery_notes": None,
            "failure_reason": None,
            "created_at": now,
            "updated_at": now,
            "timeline": [
                {
                    "status": "created",
                    "timestamp": now,
                    "actor_id": "system",
                    "actor_role": "system",
                    "notes": "ReValue local delivery job created and queued for partner assignment."
                }
            ]
        }

        db.delivery_jobs.insert_one(job_doc)
        logger.info(f"Created local delivery job {job_id} for order {order_id}")
        return job_doc

    @staticmethod
    def list_admin_jobs(
        status_filter: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Dict[str, Any]:
        db = get_db()
        query = {}
        if status_filter:
            query["status"] = status_filter

        skip = (page - 1) * size
        total = db.delivery_jobs.count_documents(query)
        cursor = db.delivery_jobs.find(query).sort("created_at", -1).skip(skip).limit(size)
        jobs = list(cursor)
        return {"jobs": jobs, "total": total, "page": page, "size": size}

    @staticmethod
    def reassign_job(job_id: str, new_rider_id: Optional[str] = None, reason: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        job = db.delivery_jobs.find_one({"id": job_id})
        if not job:
            raise NotFoundError("Job not found.")

        now = datetime.now(timezone.utc)
        update_fields: Dict[str, Any] = {"updated_at": now}

        if new_rider_id:
            rider = db.rider_profiles.find_one({"id": new_rider_id})
            if not rider or rider.get("application_status") != "approved":
                raise ValidationError("Specified rider is not approved.")
            update_fields["assigned_rider_id"] = rider["id"]
            update_fields["assigned_rider_name"] = rider["name"]
            update_fields["assigned_rider_phone"] = rider["phone"]
            update_fields["status"] = "accepted"
            note = f"Admin manually reassigned job to rider {rider['name']}. Reason: {reason or 'Operational balance'}"
        else:
            update_fields["assigned_rider_id"] = None
            update_fields["assigned_rider_name"] = None
            update_fields["assigned_rider_phone"] = None
            update_fields["status"] = "searching"
            update_fields["offer_expires_at"] = now + timedelta(minutes=15)
            note = f"Admin reset job to searching pool. Reason: {reason or 'Rider reassignment requested'}"

        res = db.delivery_jobs.find_one_and_update(
            {"id": job_id},
            {
                "$set": update_fields,
                "$push": {
                    "timeline": {
                        "status": update_fields["status"],
                        "timestamp": now,
                        "actor_id": "admin",
                        "actor_role": "admin",
                        "notes": note
                    }
                }
            },
            return_document=True
        )
        return res

    @staticmethod
    def cancel_job(job_id: str, reason: str) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        job = db.delivery_jobs.find_one_and_update(
            {"id": job_id},
            {
                "$set": {"status": "cancelled", "cancellation_reason": reason, "updated_at": now},
                "$push": {
                    "timeline": {
                        "status": "cancelled",
                        "timestamp": now,
                        "actor_id": "admin",
                        "actor_role": "admin",
                        "notes": f"Job cancelled by admin. Reason: {reason}"
                    }
                }
            },
            return_document=True
        )
        if not job:
            raise NotFoundError("Job not found.")
        return job

    # --- Service Area Management ---
    @staticmethod
    def create_service_area(req: ServiceAreaCreateRequest) -> Dict[str, Any]:
        db = get_db()
        area_id = f"area_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)

        doc = {
            "_id": area_id,
            "id": area_id,
            "city": req.city.strip(),
            "name": req.name.strip(),
            "pincodes": [p.strip() for p in req.pincodes if p.strip()],
            "is_active": req.is_active,
            "max_weight_kg": req.max_weight_kg,
            "base_fare": req.base_fare,
            "per_km_rate": req.per_km_rate,
            "handling_fee": req.handling_fee,
            "commission_percent": req.commission_percent,
            "created_at": now,
            "updated_at": now,
        }
        db.service_areas.insert_one(doc)
        logger.info(f"Created service area {area_id} for city {req.city}")
        return doc

    @staticmethod
    def list_service_areas() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.service_areas.find({}).sort("city", 1))

    @staticmethod
    def update_service_area(area_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        updates["updated_at"] = datetime.now(timezone.utc)
        res = db.service_areas.find_one_and_update(
            {"id": area_id},
            {"$set": updates},
            return_document=True
        )
        if not res:
            raise NotFoundError("Service area not found.")
        return res

    @staticmethod
    def delete_service_area(area_id: str) -> Dict[str, Any]:
        db = get_db()
        res = db.service_areas.delete_one({"id": area_id})
        if res.deleted_count == 0:
            raise NotFoundError("Service area not found.")
        return {"message": "Service area deleted successfully."}

    # --- Admin Compensation Reconciliation ---
    @staticmethod
    def list_rider_compensation_ledger(payout_status: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        query = {"status": "delivered"}
        if payout_status:
            query["compensation.payout_status"] = payout_status

        cursor = db.delivery_jobs.find(query).sort("delivered_at", -1).limit(50)
        records = []
        for j in cursor:
            records.append({
                "job_id": j["id"],
                "order_id": j["order_id"],
                "rider_id": j.get("assigned_rider_id"),
                "rider_name": j.get("assigned_rider_name"),
                "product_title": j.get("product_title"),
                "compensation": j.get("compensation", {}),
                "delivered_at": j.get("delivered_at"),
            })
        return records

    @staticmethod
    def update_payout_status(
        job_id: str,
        new_status: str,
        payout_ref: Optional[str] = None
    ) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        update_fields: Dict[str, Any] = {
            "compensation.payout_status": new_status,
            "updated_at": now
        }
        if new_status == "paid":
            update_fields["compensation.paid_at"] = now
            update_fields["compensation.payout_reference"] = payout_ref or f"PAYOUT-{uuid.uuid4().hex[:8].upper()}"

        res = db.delivery_jobs.find_one_and_update(
            {"id": job_id},
            {"$set": update_fields},
            return_document=True
        )
        if not res:
            raise NotFoundError("Job record not found.")
        return res
