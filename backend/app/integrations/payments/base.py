from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class PaymentProviderInterface(ABC):
    @abstractmethod
    def create_payment_order(
        self,
        order_id: str,
        amount: float,
        currency: str,
        customer_email: str,
        customer_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates a provider order/intent."""
        pass

    @abstractmethod
    def verify_webhook(self, body_bytes: bytes, signature: str) -> bool:
        """Cryptographically verifies incoming webhook payload from provider."""
        pass

    @abstractmethod
    def parse_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes provider webhook event into a standardized ReValue event dict."""
        pass

    @abstractmethod
    def release_payout(
        self,
        order_id: str,
        seller_id: str,
        amount: float,
        currency: str,
        seller_account_details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Requests payout release through provider settlement capabilities."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if provider has valid live credentials configured."""
        pass
