from app.core.config import settings
from app.integrations.courier.base import (
    CourierProviderInterface, ServiceabilityResult, ShipmentBookingRequest,
    ShipmentBookingResult, PickupScheduleRequest, PickupScheduleResult,
    LabelResult, TrackingResult, DeliveryOtpResult, ReturnBookingResult,
    CodStatusResult
)
from app.integrations.courier.mock_adapter import MockCourierAdapter
from app.integrations.courier.shiprocket_adapter import ShiprocketAdapter
from app.core.errors import ServiceUnavailableError

# In-memory singleton mock adapter to preserve state during server runtime
_singleton_mock_courier: MockCourierAdapter = MockCourierAdapter()


class DisabledCourierProvider(CourierProviderInterface):
    def is_configured(self) -> bool:
        return False

    def check_serviceability(self, *args, **kwargs) -> ServiceabilityResult:
        raise ServiceUnavailableError("Logistics & delivery integration is currently disabled on this instance.")

    def create_shipment(self, *args, **kwargs) -> ShipmentBookingResult:
        raise ServiceUnavailableError("Logistics & delivery integration is currently disabled.")

    def generate_label(self, *args, **kwargs) -> LabelResult:
        raise ServiceUnavailableError("Logistics integration disabled.")

    def schedule_pickup(self, *args, **kwargs) -> PickupScheduleResult:
        raise ServiceUnavailableError("Logistics integration disabled.")

    def cancel_shipment(self, *args, **kwargs):
        raise ServiceUnavailableError("Logistics integration disabled.")

    def get_tracking(self, *args, **kwargs) -> TrackingResult:
        raise ServiceUnavailableError("Logistics integration disabled.")

    def verify_webhook(self, *args, **kwargs) -> bool:
        return False

    def parse_webhook_event(self, *args, **kwargs):
        raise ServiceUnavailableError("Logistics integration disabled.")

    def generate_delivery_otp(self, *args, **kwargs) -> DeliveryOtpResult:
        raise ServiceUnavailableError("Logistics integration disabled.")

    def verify_delivery_otp(self, *args, **kwargs) -> bool:
        return False

    def request_return_pickup(self, *args, **kwargs) -> ReturnBookingResult:
        raise ServiceUnavailableError("Logistics integration disabled.")

    def get_cod_status(self, *args, **kwargs) -> CodStatusResult:
        raise ServiceUnavailableError("Logistics integration disabled.")


def get_courier_provider() -> CourierProviderInterface:
    provider_name = settings.COURIER_PROVIDER.lower().strip()
    if provider_name == "shiprocket":
        adapter = ShiprocketAdapter()
        if adapter.is_configured():
            return adapter
        # Fall back to sandbox with log notice if credentials missing in non-production
        if settings.ENVIRONMENT != "production":
            return _singleton_mock_courier
        return adapter
    elif provider_name == "sandbox":
        return _singleton_mock_courier
    else:
        return DisabledCourierProvider()
