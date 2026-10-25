from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.offers import (
    OfferCreateRequest, CounterOfferRequest, OfferResponse,
    NegotiationSuggestionResponse
)
from app.services.offer_service import OfferService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/offers", tags=["Open Negotiation"])


@router.post("", response_model=OfferResponse, status_code=status.HTTP_201_CREATED)
def create_offer(
    req: OfferCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OfferService.create_offer(current_user["id"], req)


@router.get("/my", response_model=List[OfferResponse])
def get_my_offers(
    role: str = Query("all", pattern="^(all|buyer|seller)$"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OfferService.list_user_offers(current_user["id"], role=role)


@router.post("/{offer_id}/counter", response_model=OfferResponse)
def counter_offer(
    offer_id: str,
    req: CounterOfferRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OfferService.counter_offer(current_user["id"], offer_id, req)


@router.post("/{offer_id}/accept", response_model=OfferResponse)
def accept_offer(
    offer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OfferService.accept_offer(current_user["id"], offer_id)


@router.post("/{offer_id}/reject", response_model=OfferResponse)
def reject_offer(
    offer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OfferService.reject_offer(current_user["id"], offer_id)


@router.get("/{offer_id}/suggestion", response_model=NegotiationSuggestionResponse)
def get_negotiation_suggestion(
    offer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return OfferService.get_negotiation_suggestion(current_user["id"], offer_id)
