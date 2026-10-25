from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from app.schemas.orders import OrderCreateRequest, OrderResponse
from app.services.order_service import OrderService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    req: OrderCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OrderService.create_order(current_user["id"], req)


@router.get("/my", response_model=List[OrderResponse])
def get_my_orders(
    role: str = Query("buyer", pattern="^(buyer|seller)$"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OrderService.list_user_orders(current_user["id"], role=role)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OrderService.get_order_by_id(order_id, current_user["id"])
