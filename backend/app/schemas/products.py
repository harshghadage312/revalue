from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class ProductCondition(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    BAD = "bad"
    DEFECTIVE = "defective"


class SellingMethod(str, Enum):
    NEGOTIATION = "negotiation"
    BIDDING = "bidding"


class ProductStatus(str, Enum):
    ACTIVE = "active"
    RESERVED = "reserved"
    SOLD = "sold"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"


class SmartphoneSpecs(BaseModel):
    storage_gb: Optional[int] = Field(None, ge=8, le=2048)
    ram_gb: Optional[int] = Field(None, ge=1, le=64)
    battery_health_percent: Optional[int] = Field(None, ge=10, le=100)
    screen_size_inches: Optional[float] = None
    color: Optional[str] = None
    has_original_box: bool = False
    has_original_charger: bool = False
    known_faults: Optional[str] = None


class NegotiationConfig(BaseModel):
    min_acceptable_price: Optional[float] = Field(None, ge=0)
    allow_counteroffers: bool = True


class AuctionConfig(BaseModel):
    starting_bid: float = Field(..., gt=0)
    reserve_price: Optional[float] = Field(None, gt=0)
    deadline: datetime
    min_increment: float = Field(default=100.0, gt=0)


class ProductCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=3000)
    category: str = Field(default="smartphone")
    brand: str = Field(..., min_length=2, max_length=50)
    model: str = Field(..., min_length=1, max_length=50)
    condition: ProductCondition
    asking_price: float = Field(..., gt=0)
    currency: str = Field(default="INR")
    original_retail_price: Optional[float] = Field(None, gt=0)
    approximate_age_months: Optional[int] = Field(None, ge=0)
    specs: Optional[SmartphoneSpecs] = None
    location_city: Optional[str] = None
    selling_method: SellingMethod = SellingMethod.NEGOTIATION
    images: List[str] = Field(default_factory=list)
    # Method-specific settings
    negotiation_settings: Optional[NegotiationConfig] = None
    auction_settings: Optional[AuctionConfig] = None


class ProductUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=120)
    description: Optional[str] = Field(None, min_length=10, max_length=3000)
    condition: Optional[ProductCondition] = None
    asking_price: Optional[float] = Field(None, gt=0)
    specs: Optional[SmartphoneSpecs] = None
    location_city: Optional[str] = None
    images: Optional[List[str]] = None
    status: Optional[ProductStatus] = None


class ProductResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: Optional[str] = None
    title: str
    description: str
    category: str
    brand: str
    model: str
    condition: ProductCondition
    asking_price: float
    starting_bid: Optional[float] = None  # Authoritative starting bid for sealed-bid auctions
    currency: str
    original_retail_price: Optional[float] = None
    approximate_age_months: Optional[int] = None
    specs: Optional[SmartphoneSpecs] = None
    location_city: Optional[str] = None
    selling_method: SellingMethod
    images: List[str] = []
    status: ProductStatus
    created_at: datetime
    updated_at: datetime
    # Public auction info (never leaks reserve_price!)
    auction_info: Optional[Dict[str, Any]] = None
    # Public seller review score
    seller_rating: Optional[float] = 0.0


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    size: int
    total_pages: int
