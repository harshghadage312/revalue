import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, Request, status
from app.db.connection import get_db
from app.core.config import settings
from app.schemas.payments import PaymentCreateRequest, PaymentResponse, PaymentStatus
from app.services.auth_service import get_current_user
from app.services.order_service import OrderService
from app.integrations.payments.manager import get_payment_provider
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, UnauthorizedError, ServiceUnavailableError
from app.core.logging import logger

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse)
def initiate_payment(
    req: PaymentCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_db()
    order = db.orders.find_one({"order_id": req.order_id})
    if not order:
        raise NotFoundError("Order not found.")

    if order["buyer_id"] != current_user["id"]:
        raise ForbiddenError("Only the buyer who created this order can initiate payment.")

    if order["status"] != "pending_payment":
        raise ValidationError(f"Order is not in pending_payment state (current: {order['status']}).")

    provider = get_payment_provider()
    if not provider.is_configured():
        raise ServiceUnavailableError(
            "Payment provider is not currently configured on this instance. "
            "Please configure Razorpay merchant credentials or enable the Sandbox provider in .env."
        )

    provider_order = provider.create_payment_order(
        order_id=order["order_id"],
        amount=float(order["transaction_price"]),
        currency=order.get("currency", "INR"),
        customer_email=current_user["email"],
        customer_name=current_user["name"],
    )

    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    payment_doc = {
        "_id": payment_id,
        "payment_id": payment_id,
        "order_id": order["order_id"],
        "buyer_id": current_user["id"],
        "amount": float(order["transaction_price"]),
        "currency": order.get("currency", "INR"),
        "status": PaymentStatus.INITIATED.value,
        "provider": provider_order.get("provider", settings.PAYMENT_PROVIDER),
        "provider_order_id": provider_order.get("provider_order_id"),
        "checkout_url": provider_order.get("checkout_url"),
        "created_at": order["created_at"],
    }
    db.payments.insert_one(payment_doc)

    return PaymentResponse(
        payment_id=payment_id,
        order_id=order["order_id"],
        amount=payment_doc["amount"],
        currency=payment_doc["currency"],
        status=PaymentStatus.INITIATED,
        provider=payment_doc["provider"],
        provider_order_id=payment_doc["provider_order_id"],
        checkout_url=payment_doc["checkout_url"],
        created_at=payment_doc["created_at"],
    )


@router.post("/sandbox-complete")
def complete_sandbox_payment(
    order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Development-only endpoint for executing mock payment completion when PAYMENT_PROVIDER=sandbox.
    Blocked in production mode.
    """
    if settings.ENVIRONMENT == "production" or settings.PAYMENT_PROVIDER != "sandbox":
        raise ForbiddenError("Sandbox mock payments are strictly disabled in production mode.")

    db = get_db()
    order = db.orders.find_one({"order_id": order_id})
    if not order:
        raise NotFoundError("Order not found.")

    if order["buyer_id"] != current_user["id"]:
        raise ForbiddenError("Unauthorized to complete payment for this order.")

    mock_payment_id = f"sandbox_txn_{uuid.uuid4().hex[:10]}"
    OrderService.mark_order_paid(
        order_id=order_id,
        provider_payment_id=mock_payment_id,
        provider="sandbox",
        amount_paid=float(order["transaction_price"])
    )

    return {
        "success": True,
        "message": "Sandbox payment successfully confirmed. Order status updated to PAID.",
        "provider_payment_id": mock_payment_id,
    }


@router.post("/webhooks/{provider_name}")
async def payment_webhook(
    provider_name: str,
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
):
    """
    Receives and cryptographically verifies webhooks from the payment provider.
    Changes payment and order status ONLY upon verified provider signature.
    """
    provider = get_payment_provider()
    body_bytes = await request.body()
    signature = x_razorpay_signature or request.headers.get("x-webhook-signature", "")

    # Cryptographic signature verification
    if not provider.verify_webhook(body_bytes, signature):
        logger.warning(f"Rejected invalid payment webhook signature for provider '{provider_name}'")
        raise UnauthorizedError("Invalid or missing webhook signature.")

    event_data = await request.json()
    normalized = provider.parse_webhook_event(event_data)

    order_id = normalized.get("order_id")
    if not order_id:
        return {"status": "ignored", "reason": "No order_id in payload"}

    if normalized.get("status") == "paid":
        OrderService.mark_order_paid(
            order_id=order_id,
            provider_payment_id=normalized.get("provider_payment_id", "verified_txn"),
            provider=provider_name,
            amount_paid=float(normalized.get("amount", 0.0))
        )
        logger.info(f"Verified payment webhook processed for order {order_id}")

    return {"status": "success", "order_id": order_id}
