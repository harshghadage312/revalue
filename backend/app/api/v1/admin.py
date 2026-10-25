from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from app.db.connection import get_db
from app.services.auth_service import require_role
from app.core.errors import NotFoundError, ValidationError
from app.schemas.products import ProductStatus
from app.schemas.orders import OrderStatus
from app.core.logging import logger

router = APIRouter(prefix="/admin", tags=["Administration & Moderation"])


class DisputeResolveRequest(BaseModel):
    resolution: str  # "release_seller", "refund_buyer", "dismiss"
    resolution_notes: str


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
    return list(cursor)


@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: str,
    req: DisputeResolveRequest,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    db = get_db()
    dispute = db.disputes.find_one({"id": dispute_id})
    if not dispute:
        raise NotFoundError("Dispute not found.")

    now = datetime.now(timezone.utc)
    db.disputes.update_one(
        {"id": dispute_id},
        {
            "$set": {
                "status": "resolved",
                "resolution_notes": f"[{req.resolution}] {req.resolution_notes}",
                "resolved_at": now,
            }
        }
    )

    # If resolved in seller favor, unblock payout
    if req.resolution == "release_seller":
        db.orders.update_one(
            {"order_id": dispute["order_id"]},
            {"$set": {"payout_status": "released", "status": OrderStatus.COMPLETED.value}}
        )
    elif req.resolution == "refund_buyer":
        db.orders.update_one(
            {"order_id": dispute["order_id"]},
            {"$set": {"payout_status": "refunded", "status": "refunded"}}
        )

    logger.info(f"Admin {admin['id']} resolved dispute {dispute_id} with resolution '{req.resolution}'")
    return {"message": "Dispute resolved successfully."}


@router.get("/reported-reviews")
def list_reported_reviews(admin: Dict[str, Any] = Depends(require_role("admin"))):
    db = get_db()
    cursor = db.reviews.find({"is_reported": True}).sort("created_at", -1)
    return list(cursor)


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
