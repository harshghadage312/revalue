from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, status
from app.schemas.auctions import AuctionResponse, BidResponse, BidCreateRequest
from app.services.auction_service import AuctionService
from app.services.auth_service import get_current_user
from app.core.security import decode_token

router = APIRouter(prefix="/auctions", tags=["Sealed Bidding"])


def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Helper to extract user_id if token is supplied, without blocking unauthenticated requests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = decode_token(authorization.split(" ")[1])
        return payload.get("sub")
    except Exception:
        return None


@router.get("/{auction_id}", response_model=AuctionResponse)
def get_auction(auction_id: str, authorization: Optional[str] = Header(None)):
    user_id = get_optional_user_id(authorization)
    return AuctionService.get_auction_by_id(auction_id, current_user_id=user_id)


@router.get("/product/{product_id}", response_model=AuctionResponse)
def get_auction_for_product(product_id: str, authorization: Optional[str] = Header(None)):
    user_id = get_optional_user_id(authorization)
    return AuctionService.get_auction_for_product(product_id, current_user_id=user_id)


@router.post("/{auction_id}/bids", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
def submit_bid(
    auction_id: str,
    req: BidCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return AuctionService.submit_sealed_bid(current_user["id"], auction_id, req)


@router.post("/{auction_id}/finalize", response_model=AuctionResponse)
def finalize_auction(
    auction_id: str,
    authorization: Optional[str] = Header(None)
):
    user_id = get_optional_user_id(authorization)
    return AuctionService.finalize_auction(auction_id, caller_id=user_id)
