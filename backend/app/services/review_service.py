import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse, UserRatingSummary
from app.schemas.orders import OrderStatus
from app.core.logging import logger


class ReviewService:
    @staticmethod
    def create_review(reviewer_id: str, req: ReviewCreateRequest) -> ReviewResponse:
        db = get_db()
        order = db.orders.find_one({"order_id": req.order_id})
        if not order:
            raise NotFoundError("Order not found.")

        # Order must be completed or receipt_confirmed
        if order["status"] not in [OrderStatus.COMPLETED.value, OrderStatus.RECEIPT_CONFIRMED.value]:
            raise ConflictError(f"Reviews are only permitted for completed transactions (current state: {order['status']}).")

        # Reviewer must be the buyer or the seller
        is_buyer = order["buyer_id"] == reviewer_id
        is_seller = order["seller_id"] == reviewer_id
        if not (is_buyer or is_seller):
            raise ForbiddenError("Only participants in this transaction can leave a review.")

        target_user_id = order["seller_id"] if is_buyer else order["buyer_id"]

        # Prevent duplicate reviews by the same reviewer for the same order
        existing = db.reviews.find_one({"order_id": req.order_id, "reviewer_id": reviewer_id})
        if existing:
            raise ConflictError("You have already submitted a review for this transaction.")

        reviewer = db.users.find_one({"id": reviewer_id})
        reviewer_name = reviewer.get("name", "Verified User") if reviewer else "Verified User"

        now = datetime.now(timezone.utc)
        review_id = str(uuid.uuid4())

        review_doc = {
            "_id": review_id,
            "id": review_id,
            "order_id": req.order_id,
            "product_id": order["product_id"],
            "reviewer_id": reviewer_id,
            "reviewer_name": reviewer_name,
            "target_user_id": target_user_id,
            "rating": int(req.rating),
            "comment": req.comment.strip(),
            "is_reported": False,
            "created_at": now,
        }

        db.reviews.insert_one(review_doc)

        # Recalculate target user's aggregate rating from real reviews
        ReviewService.recalculate_user_rating(target_user_id)

        logger.info(f"Review {review_id} created by user {reviewer_id} for target {target_user_id} (Rating: {req.rating})")

        return ReviewResponse(
            id=review_id,
            order_id=req.order_id,
            reviewer_id=reviewer_id,
            reviewer_name=reviewer_name,
            target_user_id=target_user_id,
            rating=req.rating,
            comment=req.comment.strip(),
            created_at=now,
        )

    @staticmethod
    def recalculate_user_rating(user_id: str) -> UserRatingSummary:
        db = get_db()
        cursor = db.reviews.find({"target_user_id": user_id, "is_reported": False})
        reviews = list(cursor)

        total = len(reviews)
        if total == 0:
            avg_rating = 0.0
        else:
            sum_ratings = sum(r["rating"] for r in reviews)
            avg_rating = round(sum_ratings / total, 2)

        db.users.update_one(
            {"id": user_id},
            {"$set": {"average_rating": avg_rating, "review_count": total}}
        )

        return UserRatingSummary(
            user_id=user_id,
            average_rating=avg_rating,
            total_reviews=total
        )

    @staticmethod
    def get_user_reviews(user_id: str) -> List[ReviewResponse]:
        db = get_db()
        cursor = db.reviews.find({"target_user_id": user_id}).sort("created_at", -1)
        return [
            ReviewResponse(
                id=r["id"],
                order_id=r["order_id"],
                reviewer_id=r["reviewer_id"],
                reviewer_name=r.get("reviewer_name", "Verified User"),
                target_user_id=r["target_user_id"],
                rating=r["rating"],
                comment=r["comment"],
                created_at=r["created_at"],
                is_reported=r.get("is_reported", False),
            ) for r in cursor
        ]
