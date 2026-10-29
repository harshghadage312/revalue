from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ShippingRateQuote(BaseModel):
    courier_id: str
    courier_name: str
    rate: float
    currency: str = "INR"
    estimated_delivery_days: int
    estimated_delivery_date: Optional[datetime] = None
    service_type: str = "surface"  # "surface", "express", "hyperlocal"
    is_cod_available: bool = True
    cod_charges: float = 0.0
    insurance_available: bool = True
    insurance_fee: float = 0.0
    quote_id: str
    expires_at: datetime
    provider: str


class ServiceabilityResult(BaseModel):
    is_serviceable: bool
    pickup_pincode: str
    delivery_pincode: str
    quotes: List[ShippingRateQuote] = []
    message: Optional[str] = None


class ShipmentBookingRequest(BaseModel):
    order_id: str
    quote_id: Optional[str] = None
    courier_id: Optional[str] = None
    seller_pickup_address: Dict[str, Any]
    buyer_delivery_address: Dict[str, Any]
    package_weight_kg: float = Field(..., ge=0.1, le=5.0)
    length_cm: float = Field(..., ge=5.0, le=50.0)
    breadth_cm: float = Field(..., ge=5.0, le=50.0)
    height_cm: float = Field(..., ge=1.0, le=30.0)
    declared_value: float = Field(..., gt=0)
    product_title: str
    imei_or_serial: Optional[str] = None
    is_battery_declared: bool = True
    is_cod: bool = False
    cod_amount: float = 0.0
    opt_in_insurance: bool = False


class ShipmentBookingResult(BaseModel):
    success: bool
    shipment_id: str
    awb_code: str
    courier_name: str
    courier_id: str
    label_url: Optional[str] = None
    manifest_url: Optional[str] = None
    pickup_token: Optional[str] = None
    status: str
    is_sandbox: bool = False
    message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PickupScheduleRequest(BaseModel):
    shipment_id: str
    awb_code: str
    pickup_date: datetime
    pickup_time_slot: Optional[str] = None
    pickup_address: Dict[str, Any]


class PickupScheduleResult(BaseModel):
    success: bool
    pickup_scheduled_date: datetime
    pickup_token_number: Optional[str] = None
    status: str
    message: Optional[str] = None


class LabelResult(BaseModel):
    success: bool
    label_url: str
    awb_code: str
    courier_name: str


class TrackingMilestone(BaseModel):
    status: str
    activity: str
    location: Optional[str] = None
    timestamp: datetime
    raw_status: Optional[str] = None


class TrackingResult(BaseModel):
    awb_code: str
    courier_name: str
    current_status: str
    current_location: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    recipient_name: Optional[str] = None
    pod_url: Optional[str] = None
    milestones: List[TrackingMilestone] = []
    is_rto: bool = False
    rto_reason: Optional[str] = None


class DeliveryOtpResult(BaseModel):
    success: bool
    order_id: str
    otp_masked: str  # Displayed in logs/responses masked: e.g. "**34"
    expires_at: datetime
    message: str


class ReturnBookingResult(BaseModel):
    success: bool
    return_shipment_id: str
    return_awb_code: str
    courier_name: str
    status: str
    label_url: Optional[str] = None
    message: Optional[str] = None


class CodStatusResult(BaseModel):
    awb_code: str
    collected: bool
    amount_collected: float
    remittance_status: str  # "pending", "remitted", "failed"
    remittance_reference: Optional[str] = None
    remitted_at: Optional[datetime] = None


class CourierProviderInterface(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the provider has valid live credentials."""
        pass

    @abstractmethod
    def check_serviceability(
        self,
        pickup_pincode: str,
        delivery_pincode: str,
        weight_kg: float,
        is_cod: bool = False,
        declared_value: float = 0.0
    ) -> ServiceabilityResult:
        """Queries real or sandbox courier serviceability and rates."""
        pass

    @abstractmethod
    def create_shipment(self, req: ShipmentBookingRequest) -> ShipmentBookingResult:
        """Books shipment order with the courier and assigns AWB."""
        pass

    @abstractmethod
    def generate_label(self, shipment_id_or_awb: str) -> LabelResult:
        """Generates or retrieves downloadable shipping label PDF."""
        pass

    @abstractmethod
    def schedule_pickup(self, req: PickupScheduleRequest) -> PickupScheduleResult:
        """Schedules physical courier pickup from seller's verified address."""
        pass

    @abstractmethod
    def cancel_shipment(self, awb_or_shipment_id: str) -> Dict[str, Any]:
        """Cancels a booked shipment before physical handover."""
        pass

    @abstractmethod
    def get_tracking(self, awb_code: str) -> TrackingResult:
        """Retrieves tracking milestones and delivery status."""
        pass

    @abstractmethod
    def verify_webhook(self, body_bytes: bytes, headers: Dict[str, Any]) -> bool:
        """Cryptographically verifies incoming webhook signature/header."""
        pass

    @abstractmethod
    def parse_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Maps provider webhook payload into canonical ReValue tracking event."""
        pass

    @abstractmethod
    def generate_delivery_otp(self, order_id: str, buyer_phone: str) -> DeliveryOtpResult:
        """Generates or registers delivery OTP for high-value smartphone delivery."""
        pass

    @abstractmethod
    def verify_delivery_otp(self, order_id: str, entered_otp: str) -> bool:
        """Verifies delivery OTP presented at physical handover."""
        pass

    @abstractmethod
    def request_return_pickup(
        self,
        order_id: str,
        buyer_pickup_address: Dict[str, Any],
        seller_return_address: Dict[str, Any],
        package_weight_kg: float,
        reason: str
    ) -> ReturnBookingResult:
        """Books a reverse pickup for return / dispute fulfillment."""
        pass

    @abstractmethod
    def get_cod_status(self, awb_code: str) -> CodStatusResult:
        """Retrieves COD collection and remittance status."""
        pass
