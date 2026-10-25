from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class OfferStatus(str, Enum):
    PENDING = "pending"
    COUNTERED = "countered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class CounterHistoryItem(BaseModel):
    sender_id: str
    sender_role: str  # "buyer" or "seller"
    amount: float
    note: Optional[str] = None
    created_at: datetime


class OfferCreateRequest(BaseModel):
    product_id: str
    amount: float = Field(..., gt=0)
    note: Optional[str] = Field(None, max_length=500)


class CounterOfferRequest(BaseModel):
    amount: float = Field(..., gt=0)
    note: Optional[str] = Field(None, max_length=500)


class OfferResponse(BaseModel):
    id: str
    product_id: str
    product_title: Optional[str] = None
    buyer_id: str
    buyer_name: Optional[str] = None
    seller_id: str
    seller_name: Optional[str] = None
    amount: float
    currency: str = "INR"
    status: OfferStatus
    note: Optional[str] = None
    counter_history: List[CounterHistoryItem] = []
    created_at: datetime
    updated_at: datetime


class NegotiationDecision(str, Enum):
    ACCEPT = "accept"
    COUNTER = "counter"
    REJECT = "reject"
    MANUAL_REVIEW = "manual_review"


class NegotiationSuggestionRequest(BaseModel):
    asking_price: float = Field(..., gt=0)
    buyer_offer: float = Field(..., gt=0)
    condition: Optional[str] = "good"
    estimated_market_price: Optional[float] = None
    seller_min_price: Optional[float] = None


class NegotiationSuggestionResponse(BaseModel):
    recommendation: NegotiationDecision
    suggested_counter_amount: Optional[float] = None
    discount_percentage: float
    reason: str
    rule_version: str = "rule_v1.0"
