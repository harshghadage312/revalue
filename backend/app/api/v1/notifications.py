from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.services.wishlist_service import NotificationService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return NotificationService.get_user_notifications(current_user["id"], limit=limit)


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return NotificationService.mark_notification_read(current_user["id"], notification_id)
