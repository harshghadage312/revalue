from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from app.integrations.courier.base import ShippingRateQuote


class DeliveryStatus(str, Enum):
    PROCESSING = "processing"
    READY_TO_SHIP = "ready_to_ship"
    SHIPMENT_BOOKED = "shipment_booked"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    RECEIPT_CONFIRMED = "receipt_confirmed"
    RTO_INITIATED = "rto_initiated"
    RTO_DELIVERED = "rto_delivered"


class ShippingQuoteRequest(BaseModel):
    product_id: str
    delivery_pincode: str = Field(..., min_length=6, max_length=6)
    is_cod: bool = False
    opt_in_insurance: bool = False


class ShippingQuoteResponse(BaseModel):
    is_serviceable: bool
    pickup_pincode: str
    delivery_pincode: str
    quotes: List[ShippingRateQuote] = []
    message: Optional[str] = None


class ShipmentBookRequest(BaseModel):
    courier_id: Optional[str] = None
    package_weight_kg: float = Field(default=0.45, ge=0.1, le=5.0)
    length_cm: float = Field(default=18.0, ge=5.0, le=50.0)
    breadth_cm: float = Field(default=10.0, ge=5.0, le=50.0)
    height_cm: float = Field(default=5.0, ge=1.0, le=30.0)
    imei_or_serial: Optional[str] = None
    is_battery_declared: bool = True
    pickup_date: Optional[datetime] = None
    pickup_time_slot: Optional[str] = "10:00 - 14:00"


class ShipmentUpdateRequest(BaseModel):
    courier_name: str = Field(..., min_length=2, max_length=100)
    tracking_number: str = Field(..., min_length=3, max_length=100)
    dispatch_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)


class ShipmentInfoResponse(BaseModel):
    courier_name: str
    tracking_number: str
    shipment_id: Optional[str] = None
    awb_code: Optional[str] = None
    dispatch_date: datetime
    shipped_by_seller_at: datetime
    is_courier_verified: bool = False
    label_url: Optional[str] = None
    manifest_url: Optional[str] = None
    pickup_token: Optional[str] = None
    pickup_scheduled_date: Optional[datetime] = None
    handover_confirmed_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    pod_url: Optional[str] = None
    notes: Optional[str] = None


class DeliveryOtpVerifyRequest(BaseModel):
    entered_otp: str = Field(..., min_length=6, max_length=6)


class InspectionChecklistSubmitRequest(BaseModel):
    screen_ok: bool
    touch_ok: bool
    cameras_ok: bool
    audio_ok: bool
    charging_battery_ok: bool
    physical_condition_matches: bool
    imei_matches: bool
    notes: Optional[str] = Field(None, max_length=1000)


class DisputeReason(str, Enum):
    NOT_DELIVERED = "not_delivered"
    DAMAGED_ITEM = "damaged_item"
    WRONG_ITEM = "wrong_item"
    SIGNIFICANTLY_NOT_AS_DESCRIBED = "significantly_not_as_described"
    UNDISCLOSED_DEFECT = "undisclosed_defect"
    MISSING_ACCESSORIES = "missing_accessories"


class DisputeCreateRequest(BaseModel):
    reason: DisputeReason
    details: str = Field(..., min_length=10, max_length=2000)
    evidence_images: List[str] = []
    preferred_resolution: Optional[str] = "return_and_refund"  # "return_and_refund", "partial_refund"
    requested_refund_amount: Optional[float] = None


class DisputeResponse(BaseModel):
    id: str
    order_id: str
    opened_by_user_id: str
    reason: DisputeReason
    details: str
    evidence_images: List[str] = []
    preferred_resolution: Optional[str] = "return_and_refund"
    requested_refund_amount: Optional[float] = None
    status: str = "open"  # "open", "under_review", "resolved", "dismissed"
    resolution_notes: Optional[str] = None
    resolved_action: Optional[str] = None
    refund_amount_issued: Optional[float] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class ReturnBookingRequest(BaseModel):
    dispute_id: Optional[str] = None
    reason: str = Field(..., min_length=5, max_length=500)
    pickup_date: Optional[datetime] = None


class CodReconciliationResponse(BaseModel):
    awb_code: str
    order_id: str
    collected_amount: float
    remitted_amount: float
    difference: float
    status: str  # "reconciled", "mismatch", "pending"
    reconciled_at: datetime
    notes: Optional[str] = None
