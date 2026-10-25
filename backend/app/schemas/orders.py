from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RECEIPT_CONFIRMED = "receipt_confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class PurchaseSource(str, Enum):
    BUY_NOW = "buy_now"
    OFFER = "offer"
    AUCTION = "auction"


class ShippingAddress(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=7, max_length=20)
    street: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=50)
    state: str = Field(..., min_length=2, max_length=50)
    postal_code: str = Field(..., min_length=3, max_length=20)
    country: str = Field(default="India")


class OrderCreateRequest(BaseModel):
    product_id: str
    purchase_source: PurchaseSource
    offer_id: Optional[str] = None
    auction_id: Optional[str] = None
    shipping_address: ShippingAddress


class OrderStatusHistoryItem(BaseModel):
    status: OrderStatus
    timestamp: datetime
    updated_by: str
    note: Optional[str] = None


class OrderResponse(BaseModel):
    order_id: str
    product_id: str
    product_title: str
    product_image: Optional[str] = None
    buyer_id: str
    buyer_name: Optional[str] = None
    seller_id: str
    seller_name: Optional[str] = None
    transaction_price: float
    currency: str = "INR"
    status: OrderStatus
    purchase_source: PurchaseSource
    shipping_address: ShippingAddress
    shipment_info: Optional[Dict[str, Any]] = None
    payment_info: Optional[Dict[str, Any]] = None
    payout_status: Optional[str] = "held"  # "held", "released", "disputed"
    status_history: List[OrderStatusHistoryItem] = []
    created_at: datetime
    updated_at: datetime
