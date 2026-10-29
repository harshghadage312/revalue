from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPMENT_BOOKED = "shipment_booked"
    PICKUP_SCHEDULED = "pickup_scheduled"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERY_ATTEMPTED = "delivery_attempted"
    DELIVERED = "delivered"
    INSPECTION_PASSED = "inspection_passed"
    RECEIPT_CONFIRMED = "receipt_confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"
    RETURN_REQUESTED = "return_requested"
    RETURN_IN_TRANSIT = "return_in_transit"
    RETURNED = "returned"
    REFUNDED = "refunded"
    RTO_INITIATED = "rto_initiated"
    RTO_DELIVERED = "rto_delivered"


class PayoutStatus(str, Enum):
    HELD = "held"
    HELD_INSPECTION = "held_inspection"
    ELIGIBLE = "eligible"
    PROCESSING = "processing"
    RELEASED = "released"
    BLOCKED_DISPUTE = "blocked_dispute"
    REFUNDED_TO_BUYER = "refunded_to_buyer"


class PaymentMethod(str, Enum):
    PREPAID = "prepaid"
    COD = "cod"


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
    payment_method: PaymentMethod = PaymentMethod.PREPAID
    quote_id: Optional[str] = None
    courier_id: Optional[str] = None
    opt_in_insurance: bool = False


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
    item_price: float = 0.0
    shipping_fee: float = 0.0
    insurance_fee: float = 0.0
    cod_fee: float = 0.0
    transaction_price: float
    total_amount: float = 0.0
    currency: str = "INR"
    status: OrderStatus
    payment_method: PaymentMethod = PaymentMethod.PREPAID
    purchase_source: PurchaseSource
    shipping_address: ShippingAddress
    shipment_info: Optional[Dict[str, Any]] = None
    payment_info: Optional[Dict[str, Any]] = None
    payout_status: Optional[str] = "held"
    dispatch_deadline: Optional[datetime] = None
    inspection_deadline: Optional[datetime] = None
    delivery_otp_masked: Optional[str] = None
    cod_status: Optional[str] = "not_applicable"
    status_history: List[OrderStatusHistoryItem] = []
    created_at: datetime
    updated_at: datetime
