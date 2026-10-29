from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from app.db.connection import get_db
from app.core.config import settings
from app.services.auth_service import require_role
from app.core.errors import NotFoundError, ValidationError
from app.schemas.products import ProductStatus
from app.schemas.orders import OrderStatus
from app.services.delivery_service import DeliveryService
from app.integrations.courier.manager import get_courier_provider
from app.core.logging import logger

router = APIRouter(prefix="/admin", tags=["Administration & Moderation"])


class DisputeResolveRequest(BaseModel):
    resolution: str  # "release_seller", "refund_buyer", "refund_buyer_full", "refund_buyer_partial", "authorize_return"
    resolution_notes: str
    partial_refund_amount: Optional[float] = None


class CodReconcileRequest(BaseModel):
    awb_code: str
    remitted_amount: float
    courier_reference: str
    notes: Optional[str] = None


@router.get("/metrics")
def get_operational_metrics(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Returns real operational marketplace metrics calculated from database collections."""
    db = get_db()
    total_users = db.users.count_documents({})
    total_listings = db.products.count_documents({})
    active_listings = db.products.count_documents({"status": "active"})
    total_orders = db.orders.count_documents({})
    completed_orders = db.orders.count_documents({"status": "completed"})

    # Calculate real GMV (Gross Merchandise Volume)
    completed_cursor = db.orders.find({"status": "completed"})
    gmv = sum(float(order.get("transaction_price", 0.0)) for order in completed_cursor)

    open_disputes = db.disputes.count_documents({"status": "open"})
    reported_reviews = db.reviews.count_documents({"is_reported": True})

    return {
        "total_users": total_users,
        "total_listings": total_listings,
        "active_listings": active_listings,
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "marketplace_gmv_inr": round(gmv, 2),
        "open_disputes": open_disputes,
        "reported_reviews": reported_reviews,
    }


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    db = get_db()
    skip = (page - 1) * size
    cursor = db.users.find({}).skip(skip).limit(size).sort("created_at", -1)
    users = []
    for u in cursor:
        users.append({
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "created_at": u["created_at"],
            "average_rating": u.get("average_rating", 0.0),
        })
    return {"users": users, "total": db.users.count_documents({})}


@router.put("/users/{user_id}/status")
def set_user_status(
    user_id: str,
    is_active: bool,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    db = get_db()
    res = db.users.update_one({"id": user_id}, {"$set": {"is_active": is_active}})
    if res.matched_count == 0:
        raise NotFoundError("User not found.")
    logger.info(f"Admin {admin['id']} set user {user_id} active status to {is_active}")
    return {"message": f"User status updated to {'active' if is_active else 'disabled'}."}


@router.get("/disputes")
def list_disputes(admin: Dict[str, Any] = Depends(require_role("admin"))):
    db = get_db()
    cursor = db.disputes.find({}).sort("created_at", -1)
    disputes = []
    for d in cursor:
        # Strip internal MongoDB _id to prevent JSON serialization issues
        d_copy = dict(d)
        if "_id" in d_copy:
            d_copy["_id"] = str(d_copy["_id"])
        disputes.append(d_copy)
    return disputes


@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: str,
    req: DisputeResolveRequest,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    action = req.resolution
    if action == "refund_buyer":
        action = "refund_buyer_full"

    res = DeliveryService.resolve_dispute(
        admin_id=admin["id"],
        dispute_id=dispute_id,
        action=action,
        resolution_notes=req.resolution_notes,
        partial_refund_amount=req.partial_refund_amount
    )
    return {"message": "Dispute resolved successfully.", **res}


@router.get("/shipments")
def list_shipments(
    status: Optional[str] = Query(None),
    overdue_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Delivery Operations console: real-time monitoring of all shipments,
    48h dispatch deadlines, exceptions, and deliveries.
    """
    db = get_db()
    query: Dict[str, Any] = {"shipment_info": {"$ne": None}}
    if status:
        query["status"] = status

    now = datetime.now(timezone.utc)
    if overdue_only:
        query["status"] = {"$in": ["paid", "processing", "shipment_booked", "pickup_scheduled"]}
        query["dispatch_deadline"] = {"$lt": now}

    skip = (page - 1) * size
    cursor = db.orders.find(query).skip(skip).limit(size).sort("created_at", -1)
    shipments = []
    for doc in cursor:
        is_overdue = False
        if doc.get("dispatch_deadline"):
            dl = doc["dispatch_deadline"]
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            if dl < now and doc.get("status") in ["paid", "processing", "shipment_booked", "pickup_scheduled"]:
                is_overdue = True

        shipment_data = doc.get("shipment_info") or {}
        shipments.append({
            "order_id": doc["order_id"],
            "product_id": doc.get("product_id"),
            "product_title": doc.get("product_title", "Smartphone"),
            "buyer_id": doc.get("buyer_id"),
            "seller_id": doc.get("seller_id"),
            "status": doc.get("status"),
            "payout_status": doc.get("payout_status"),
            "courier_name": shipment_data.get("courier_name", "Unassigned"),
            "awb_code": shipment_data.get("awb_code") or shipment_data.get("tracking_number"),
            "label_url": shipment_data.get("label_url"),
            "pickup_token": shipment_data.get("pickup_token"),
            "is_courier_verified": shipment_data.get("is_courier_verified", False),
            "dispatch_deadline": doc.get("dispatch_deadline"),
            "is_overdue_dispatch": is_overdue,
            "inspection_deadline": doc.get("inspection_deadline"),
            "payment_method": doc.get("payment_method", "prepaid"),
            "cod_status": doc.get("cod_status", "not_applicable"),
            "total_amount": float(doc.get("total_amount", doc.get("transaction_price", 0.0))),
            "created_at": doc.get("created_at"),
        })

    total = db.orders.count_documents(query)
    return {"shipments": shipments, "total": total, "page": page, "size": size}


@router.get("/cod/reconciliation")
def list_cod_reconciliation(
    status: Optional[str] = Query(None),
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Lists Cash on Delivery orders and their remittance / reconciliation status.
    """
    db = get_db()
    query: Dict[str, Any] = {"payment_method": "cod"}
    if status:
        query["cod_status"] = status
    cursor = db.orders.find(query).sort("created_at", -1)
    results = []
    for doc in cursor:
        results.append({
            "order_id": doc["order_id"],
            "awb_code": doc.get("shipment_info", {}).get("awb_code") if doc.get("shipment_info") else None,
            "buyer_id": doc.get("buyer_id"),
            "seller_id": doc.get("seller_id"),
            "expected_amount": float(doc.get("total_amount", doc.get("transaction_price", 0.0))),
            "cod_status": doc.get("cod_status", "pending_collection"),
            "remittance_info": doc.get("cod_remittance_info"),
            "order_status": doc.get("status"),
            "created_at": doc.get("created_at"),
        })
    return {"cod_orders": results, "total": len(results)}


@router.post("/cod/reconcile")
def reconcile_cod_order(
    req: CodReconcileRequest,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Reconciles courier cash remittance against order ledger.
    """
    return DeliveryService.reconcile_cod(
        awb_code=req.awb_code,
        remitted_amount=req.remitted_amount,
        courier_reference=req.courier_reference,
        notes=req.notes
    )


@router.get("/courier/health")
def get_courier_health(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """
    Inspects provider health, active courier adapter, and serviceability check status.
    """
    courier_provider = get_courier_provider()
    try:
        test_res = courier_provider.check_serviceability(
            pickup_pincode="400001",
            delivery_pincode="560001",
            weight_kg=0.5
        )
        is_healthy = test_res.is_serviceable
        sample_quotes = len(test_res.quotes)
    except Exception as e:
        is_healthy = False
        sample_quotes = 0

    return {
        "active_provider": settings.COURIER_PROVIDER,
        "is_healthy": is_healthy,
        "sample_quotes_available": sample_quotes,
        "shiprocket_configured": bool(settings.SHIPROCKET_EMAIL and settings.SHIPROCKET_PASSWORD),
        "dispatch_deadline_hours": settings.DISPATCH_DEADLINE_HOURS,
        "inspection_window_hours": settings.INSPECTION_WINDOW_HOURS,
    }


@router.get("/reported-reviews")
def list_reported_reviews(admin: Dict[str, Any] = Depends(require_role("admin"))):
    db = get_db()
    cursor = db.reviews.find({"is_reported": True}).sort("created_at", -1)
    reviews = []
    for r in cursor:
        r_copy = dict(r)
        if "_id" in r_copy:
            r_copy["_id"] = str(r_copy["_id"])
        reviews.append(r_copy)
    return reviews


@router.delete("/reviews/{review_id}")
def delete_inappropriate_review(
    review_id: str,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    db = get_db()
    res = db.reviews.delete_one({"id": review_id})
    if res.deleted_count == 0:
        raise NotFoundError("Review not found.")
    logger.info(f"Admin {admin['id']} removed review {review_id}")
    return {"message": "Review deleted by moderator."}
