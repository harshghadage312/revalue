from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from app.schemas.delivery import (
    ShipmentUpdateRequest, DisputeCreateRequest, DisputeResponse
)
from app.services.delivery_service import DeliveryService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/orders", tags=["Delivery & Fulfillment"])


@router.post("/{order_id}/shipment")
def update_shipment(
    order_id: str,
    req: ShipmentUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return DeliveryService.update_shipment(current_user["id"], order_id, req)


@router.post("/{order_id}/confirm-receipt")
def confirm_receipt(
    order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return DeliveryService.confirm_receipt(current_user["id"], order_id)


@router.post("/{order_id}/disputes", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
def open_dispute(
    order_id: str,
    req: DisputeCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return DeliveryService.open_dispute(current_user["id"], order_id, req)
