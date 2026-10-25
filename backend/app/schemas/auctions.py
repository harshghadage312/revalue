from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class AuctionStatus(str, Enum):
    ACTIVE = "active"
    FINALIZED = "finalized"
    CLOSED_NO_WINNER = "closed_no_winner"
    CANCELLED = "cancelled"


class BidCreateRequest(BaseModel):
    amount: float = Field(..., gt=0)


class BidResponse(BaseModel):
    id: str
    auction_id: str
    product_id: str
    amount: float
    created_at: datetime
    is_winning_bid: bool = False


class AuctionResponse(BaseModel):
    id: str
    product_id: str
    seller_id: str
    starting_bid: float
    min_increment: float
    deadline: datetime
    status: AuctionStatus
    total_bids_count: int = 0
    winner_id: Optional[str] = None
    winning_amount: Optional[float] = None
    has_reserve_price: bool = False  # Boolean flag only - NEVER exposes actual reserve amount!
    user_own_bid: Optional[BidResponse] = None
    created_at: datetime
    finalized_at: Optional[datetime] = None
