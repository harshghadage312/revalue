from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    order_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=5, max_length=1000)


class ReviewResponse(BaseModel):
    id: str
    order_id: str
    reviewer_id: str
    reviewer_name: str
    target_user_id: str
    rating: int
    comment: str
    created_at: datetime
    is_reported: bool = False


class UserRatingSummary(BaseModel):
    user_id: str
    average_rating: float
    total_reviews: int
