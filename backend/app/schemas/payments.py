from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class PaymentStatus(str, Enum):
    INITIATED = "initiated"
    AUTHORIZED = "authorized"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentCreateRequest(BaseModel):
    order_id: str


class PaymentResponse(BaseModel):
    payment_id: str
    order_id: str
    amount: float
    currency: str = "INR"
    status: PaymentStatus
    provider: str
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    checkout_url: Optional[str] = None
    client_secret: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None


class PayoutStatus(str, Enum):
    HELD = "held"
    ELIGIBLE = "eligible"
    PROCESSING = "processing"
    RELEASED = "released"
    BLOCKED_DISPUTE = "blocked_dispute"


class PayoutResponse(BaseModel):
    order_id: str
    seller_id: str
    amount: float
    currency: str = "INR"
    status: PayoutStatus
    eligible_release_time: Optional[datetime] = None
    released_at: Optional[datetime] = None
    provider_payout_id: Optional[str] = None
    reason: Optional[str] = None
