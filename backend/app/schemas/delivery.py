from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class DeliveryStatus(str, Enum):
    PROCESSING = "processing"
    READY_TO_SHIP = "ready_to_ship"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RECEIPT_CONFIRMED = "receipt_confirmed"


class ShipmentUpdateRequest(BaseModel):
    courier_name: str = Field(..., min_length=2, max_length=100)
    tracking_number: str = Field(..., min_length=3, max_length=100)
    dispatch_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)


class ShipmentInfoResponse(BaseModel):
    courier_name: str
    tracking_number: str
    dispatch_date: datetime
    shipped_by_seller_at: datetime
    is_courier_verified: bool = False  # Explicitly distinguishes manual seller entry from courier webhook
    notes: Optional[str] = None


class DisputeReason(str, Enum):
    NOT_DELIVERED = "not_delivered"
    DAMAGED_ITEM = "damaged_item"
    WRONG_ITEM = "wrong_item"
    SIGNIFICANTLY_NOT_AS_DESCRIBED = "significantly_not_as_described"


class DisputeCreateRequest(BaseModel):
    reason: DisputeReason
    details: str = Field(..., min_length=10, max_length=2000)
    evidence_images: List[str] = []


class DisputeResponse(BaseModel):
    id: str
    order_id: str
    opened_by_user_id: str
    reason: DisputeReason
    details: str
    evidence_images: List[str] = []
    status: str = "open"  # "open", "under_review", "resolved", "dismissed"
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
