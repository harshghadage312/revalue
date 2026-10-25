from app.core.config import settings
from app.integrations.payments.base import PaymentProviderInterface
from app.integrations.payments.sandbox import SandboxPaymentProvider
from app.integrations.payments.razorpay_provider import RazorpayMarketplaceProvider
from app.core.errors import ServiceUnavailableError


class DisabledPaymentProvider(PaymentProviderInterface):
    def is_configured(self) -> bool:
        return False

    def create_payment_order(self, *args, **kwargs):
        raise ServiceUnavailableError("Payment processing is currently disabled on this instance.")

    def verify_webhook(self, *args, **kwargs) -> bool:
        return False

    def parse_webhook_event(self, *args, **kwargs):
        raise ServiceUnavailableError("Payment processing is disabled.")

    def release_payout(self, *args, **kwargs):
        raise ServiceUnavailableError("Payment processing is disabled.")


def get_payment_provider() -> PaymentProviderInterface:
    provider_name = settings.PAYMENT_PROVIDER.lower().strip()
    if provider_name == "razorpay":
        return RazorpayMarketplaceProvider()
    elif provider_name == "sandbox":
        return SandboxPaymentProvider()
    else:
        return DisabledPaymentProvider()
