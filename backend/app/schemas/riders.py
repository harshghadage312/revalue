from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class RiderRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    email: EmailStr
    phone: str = Field(..., pattern=r"^[6-9][0-9]{9}$", description="10-digit Indian mobile number")
    password: str = Field(..., min_length=8, max_length=128)
    city: str = Field(..., min_length=2, max_length=50)
    service_pincodes: List[str] = Field(..., min_length=1, max_length=20)
    vehicle_type: str = Field(..., pattern="^(bike|scooter|ev_two_wheeler|van|cycle)$")
    vehicle_registration_number: Optional[str] = Field(None, max_length=20)
    driving_license_number: Optional[str] = Field(None, max_length=25)
    emergency_contact_name: Optional[str] = Field(None, max_length=60)
    emergency_contact_phone: Optional[str] = Field(None, pattern=r"^[6-9][0-9]{9}$")


class RiderProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: EmailStr
    phone: str
    city: str
    service_pincodes: List[str]
    vehicle_type: str
    vehicle_registration_number: Optional[str] = None
    driving_license_masked: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    application_status: str  # "pending", "under_review", "approved", "rejected", "suspended"
    rejection_reason: Optional[str] = None
    suspension_reason: Optional[str] = None
    is_online: bool = False
    last_location: Optional[Dict[str, Any]] = None
    last_active_at: Optional[datetime] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    total_deliveries_completed: int = 0
    average_rating: float = 5.0


class RiderStatusUpdateRequest(BaseModel):
    is_online: bool


class RiderLocationUpdateRequest(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    pincode: Optional[str] = Field(None, pattern=r"^[1-9][0-9]{5}$")


class RiderStatusAdminUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(pending|under_review|approved|rejected|suspended)$")
    reason: Optional[str] = None


class ServiceAreaCreateRequest(BaseModel):
    city: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=60)
    pincodes: List[str] = Field(..., min_length=1)
    is_active: bool = True
    max_weight_kg: float = Field(default=5.0, ge=0.5, le=25.0)
    base_fare: float = Field(default=70.0, ge=30.0, le=300.0)
    per_km_rate: float = Field(default=10.0, ge=0.0, le=50.0)
    handling_fee: float = Field(default=25.0, ge=0.0, le=100.0)
    commission_percent: float = Field(default=15.0, ge=0.0, le=50.0)


class ServiceAreaResponse(BaseModel):
    id: str
    city: str
    name: str
    pincodes: List[str]
    is_active: bool
    max_weight_kg: float
    base_fare: float
    per_km_rate: float
    handling_fee: float
    commission_percent: float
    created_at: datetime
    updated_at: datetime


class DeliveryJobCompensation(BaseModel):
    base_fare: float
    distance_fare: float
    handling_fee: float
    total_rider_earnings: float
    payout_status: str = "pending"  # "pending", "eligible", "processing", "paid", "failed", "on_hold"
    rate_version: str = "v1.0"
    paid_at: Optional[datetime] = None
    payout_reference: Optional[str] = None


class DeliveryJobResponse(BaseModel):
    id: str
    order_id: str
    product_title: str
    status: str
    delivery_type: str = "revalue_local"
    pickup_address: Dict[str, Any]
    delivery_address: Dict[str, Any]
    pickup_pincode: str
    delivery_pincode: str
    package_weight_kg: float
    declared_value: float
    is_cod: bool
    cod_amount: float
    assigned_rider_id: Optional[str] = None
    assigned_rider_name: Optional[str] = None
    offer_expires_at: Optional[datetime] = None
    compensation: DeliveryJobCompensation
    pickup_notes: Optional[str] = None
    delivery_notes: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    timeline: List[Dict[str, Any]] = []


class JobReportFailureRequest(BaseModel):
    reason: str = Field(..., pattern="^(buyer_unavailable|incorrect_address|buyer_rescheduled|unsafe_conditions|parcel_damaged|technical_failure|seller_unavailable|other)$")
    notes: Optional[str] = Field(None, max_length=500)


class JobPickupConfirmRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=300)


class JobDeliveryOtpVerifyRequest(BaseModel):
    entered_otp: str = Field(..., min_length=4, max_length=6)
    notes: Optional[str] = Field(None, max_length=300)
