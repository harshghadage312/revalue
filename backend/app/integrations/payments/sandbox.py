import uuid
import hmac
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.integrations.payments.base import PaymentProviderInterface
from app.core.logging import logger


class SandboxPaymentProvider(PaymentProviderInterface):
    """
    Development & Sandbox payment provider adapter.
    Enables realistic integration testing without real financial transactions.
    """
    def __init__(self, webhook_secret: str = "sandbox_secret_key_revalue_test"):
        self.webhook_secret = webhook_secret

    def is_configured(self) -> bool:
        return True

    def create_payment_order(
        self,
        order_id: str,
        amount: float,
        currency: str,
        customer_email: str,
        customer_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        provider_order_id = f"sandbox_order_{uuid.uuid4().hex[:12]}"
        logger.info(f"[SandboxPayment] Created mock payment order {provider_order_id} for order {order_id} (₹{amount:,.2f})")
        return {
            "provider": "sandbox",
            "provider_order_id": provider_order_id,
            "amount": amount,
            "currency": currency,
            "checkout_url": f"/checkout/mock-provider?order_id={order_id}&provider_order_id={provider_order_id}&amount={amount}",
            "client_secret": f"sandbox_sec_{uuid.uuid4().hex}",
            "is_sandbox": True,
            "status": "created",
        }

    def verify_webhook(self, body_bytes: bytes, signature: str) -> bool:
        if not signature:
            return False
        # Calculate expected HMAC-SHA256
        expected = hmac.new(self.webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        event_type = event_data.get("event", "payment.captured")
        payload = event_data.get("payload", {})
        return {
            "event_type": event_type,
            "order_id": payload.get("order_id"),
            "provider_payment_id": payload.get("payment_id", f"sandbox_pay_{uuid.uuid4().hex[:10]}"),
            "amount": payload.get("amount"),
            "currency": payload.get("currency", "INR"),
            "status": "paid" if "captured" in event_type else "failed",
            "timestamp": datetime.now(timezone.utc),
        }

    def release_payout(
        self,
        order_id: str,
        seller_id: str,
        amount: float,
        currency: str,
        seller_account_details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        payout_id = f"sandbox_payout_{uuid.uuid4().hex[:12]}"
        logger.info(f"[SandboxPayment] Released sandbox payout {payout_id} to seller {seller_id} for order {order_id}")
        return {
            "success": True,
            "provider_payout_id": payout_id,
            "status": "released",
            "message": "Sandbox settlement simulated. No real currency transferred.",
        }
