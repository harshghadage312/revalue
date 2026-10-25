from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse
from app.services.review_service import ReviewService
from app.services.auth_service import get_current_user
from app.db.connection import get_db
from app.core.errors import NotFoundError

router = APIRouter(prefix="/reviews", tags=["Reviews & Ratings"])


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    req: ReviewCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return ReviewService.create_review(current_user["id"], req)


@router.get("/user/{user_id}", response_model=List[ReviewResponse])
def get_user_reviews(user_id: str):
    return ReviewService.get_user_reviews(user_id)


@router.post("/{review_id}/report")
def report_review(
    review_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_db()
    res = db.reviews.update_one(
        {"id": review_id},
        {"$set": {"is_reported": True, "reported_by": current_user["id"]}}
    )
    if res.matched_count == 0:
        raise NotFoundError("Review not found.")
    return {"message": "Review reported for administrator moderation."}
