from typing import Dict, Any
from fastapi import APIRouter, Depends, Header
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest,
    UserProfileResponse, UpdateProfileRequest
)
from app.services.auth_service import AuthService, get_current_user
from app.db.connection import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserProfileResponse, status_code=201)
def register(req: UserRegisterRequest):
    return AuthService.register_user(req)


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest):
    return AuthService.login_user(req)


@router.post("/refresh", response_model=TokenResponse)
def refresh(req: RefreshTokenRequest):
    return AuthService.refresh_access_token(req.refresh_token)


@router.post("/logout")
def logout(req: RefreshTokenRequest):
    AuthService.logout_token(req.refresh_token)
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserProfileResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        is_active=current_user.get("is_active", True),
        phone=current_user.get("phone"),
        address=current_user.get("address"),
        created_at=current_user["created_at"],
        average_rating=current_user.get("average_rating", 0.0),
        review_count=current_user.get("review_count", 0),
    )


@router.put("/me", response_model=UserProfileResponse)
def update_me(req: UpdateProfileRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    updates = {}
    if req.name is not None:
        updates["name"] = req.name.strip()
    if req.phone is not None:
        updates["phone"] = req.phone.strip()
    if req.address is not None:
        updates["address"] = req.address.strip()

    if updates:
        db.users.update_one({"id": current_user["id"]}, {"$set": updates})

    updated = db.users.find_one({"id": current_user["id"]})
    return UserProfileResponse(
        id=updated["id"],
        name=updated["name"],
        email=updated["email"],
        role=updated["role"],
        is_active=updated.get("is_active", True),
        phone=updated.get("phone"),
        address=updated.get("address"),
        created_at=updated["created_at"],
        average_rating=updated.get("average_rating", 0.0),
        review_count=updated.get("review_count", 0),
    )


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    return AuthService.request_password_reset(req.email)


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    return AuthService.reset_password(req.token, req.new_password)
