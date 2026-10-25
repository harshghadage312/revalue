from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from app.schemas.products import ProductResponse
from app.services.wishlist_service import WishlistService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.post("/{product_id}")
def add_to_wishlist(
    product_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return WishlistService.add_to_wishlist(current_user["id"], product_id)


@router.delete("/{product_id}")
def remove_from_wishlist(
    product_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return WishlistService.remove_from_wishlist(current_user["id"], product_id)


@router.get("", response_model=List[ProductResponse])
def get_wishlist(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return WishlistService.get_user_wishlist(current_user["id"])
