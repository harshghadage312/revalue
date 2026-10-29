from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, status, Header
from app.schemas.delivery import (
    ShipmentUpdateRequest, ShipmentBookRequest, DisputeCreateRequest,
    DisputeResponse, InspectionChecklistSubmitRequest, DeliveryOtpVerifyRequest,
    ReturnBookingRequest, ShippingQuoteRequest, ShippingQuoteResponse
)
from app.services.delivery_service import DeliveryService
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/orders", tags=["Delivery & Fulfillment"])
webhook_router = APIRouter(prefix="/courier", tags=["Courier Webhooks"])


@router.post("/shipping/quotes", response_model=ShippingQuoteResponse)
def get_shipping_quotes(req: ShippingQuoteRequest):
    """
    Calculates live courier rates and PIN code serviceability across Indian logistics providers.
    """
    return DeliveryService.get_shipping_quotes(
        product_id=req.product_id,
        delivery_pincode=req.delivery_pincode,
        is_cod=req.is_cod,
        opt_in_insurance=req.opt_in_insurance
    )


@router.post("/{order_id}/shipment/book")
def book_shipment(
    order_id: str,
    req: ShipmentBookRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Seller books carrier AWB, generates shipping label, and schedules parcel pickup.
    Enforces battery safety declaration and package dimensions.
    """
    return DeliveryService.book_shipment(current_user["id"], order_id, req)


@router.get("/{order_id}/shipment/label")
def get_shipment_label(
    order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves printable AWB shipping label with routing barcodes.
    """
    return DeliveryService.get_shipment_label(current_user["id"], order_id)


@router.post("/{order_id}/shipment/handover")
def confirm_handover(
    order_id: str,
    payload: Optional[Dict[str, str]] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Confirms physical parcel handover to courier agent.
    Generating a label is NOT a handover.
    Generates masked delivery OTP for buyer upon verified handover.
    """
    notes = payload.get("notes") if payload else None
    return DeliveryService.confirm_handover(current_user["id"], order_id, notes=notes)


@router.get("/{order_id}/tracking")
def get_order_tracking(
    order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves canonical tracking timeline, milestones, inspection window countdown, and OTP state.
    """
    return DeliveryService.get_tracking(current_user["id"], order_id)


@router.post("/{order_id}/delivery/otp/verify")
def verify_delivery_otp(
    order_id: str,
    req: DeliveryOtpVerifyRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Doorstep delivery OTP verification. Transitions order to DELIVERED and
    activates the 48-Hour Buyer Inspection Period.
    """
    return DeliveryService.verify_delivery_otp_and_complete(
        actor_id=current_user["id"],
        order_id=order_id,
        entered_otp=req.entered_otp
    )


@router.post("/{order_id}/inspection/checklist")
def submit_inspection_checklist(
    order_id: str,
    req: InspectionChecklistSubmitRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits buyer hardware inspection checklist during the 48-hour inspection period.
    """
    return DeliveryService.submit_inspection_checklist(current_user["id"], order_id, req)


@router.post("/inspection/process-timeouts")
def process_inspection_timeouts(
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Admin or scheduled worker to auto-accept delivered orders whose 48-hour inspection
    deadline expired without dispute, releasing held payouts to sellers.
    """
    count = DeliveryService.process_inspection_timeouts()
    return {"processed_count": count, "message": f"Successfully processed {count} inspection timeout(s)."}


@router.post("/{order_id}/return/book")
def book_return(
    order_id: str,
    req: ReturnBookingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Books reverse courier pickup for authorized returns.
    """
    return DeliveryService.book_return(current_user["id"], order_id, req)


@router.post("/{order_id}/shipment")
def update_shipment(
    order_id: str,
    req: ShipmentUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Legacy manual shipping update by seller.
    """
    return DeliveryService.update_shipment(current_user["id"], order_id, req)


@router.post("/{order_id}/confirm-receipt")
def confirm_receipt(
    order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Buyer manually confirms device acceptance and releases held payout to seller.
    """
    return DeliveryService.confirm_receipt(current_user["id"], order_id)


@router.post("/{order_id}/disputes", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
def open_dispute(
    order_id: str,
    req: DisputeCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Buyer opens dispute during inspection window. Immediately blocks seller payout.
    """
    return DeliveryService.open_dispute(current_user["id"], order_id, req)


@webhook_router.post("/webhook/{provider}")
async def handle_courier_webhook(provider: str, request: Request):
    """
    Public webhook receiver for Shiprocket or sandbox courier tracking updates.
    Verifies cryptographic signature / secret before applying state changes.
    """
    headers = dict(request.headers)
    body_bytes = await request.body()
    try:
        import json
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception:
        payload = {}
    return DeliveryService.process_courier_webhook(body_bytes, payload, headers)
