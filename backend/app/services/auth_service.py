import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import Depends, Header
from app.db.connection import get_db
from app.core.config import settings
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_secure_token
)
from app.core.errors import (
    ConflictError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError
)
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    UserProfileResponse, UpdateProfileRequest
)
from app.core.logging import logger


class AuthService:
    @staticmethod
    def register_user(req: UserRegisterRequest) -> UserProfileResponse:
        db = get_db()
        email = req.email.lower().strip()

        # Check existing user
        if db.users.find_one({"email": email}):
            raise ConflictError(f"User with email '{email}' already exists.")

        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        hashed_pw = hash_password(req.password)

        user_doc = {
            "_id": user_id,
            "id": user_id,
            "name": req.name.strip(),
            "email": email,
            "password_hash": hashed_pw,
            "role": req.role,
            "is_active": True,
            "is_email_verified": False,
            "phone": None,
            "address": None,
            "created_at": now,
            "updated_at": now,
            "average_rating": 0.0,
            "review_count": 0,
        }
        db.users.insert_one(user_doc)
        logger.info(f"Registered new user {user_id} with role '{req.role}'")

        return UserProfileResponse(
            id=user_id,
            name=user_doc["name"],
            email=user_doc["email"],
            role=user_doc["role"],
            is_active=user_doc["is_active"],
            phone=user_doc["phone"],
            address=user_doc["address"],
            created_at=user_doc["created_at"],
            average_rating=0.0,
            review_count=0,
        )

    @staticmethod
    def login_user(req: UserLoginRequest) -> TokenResponse:
        db = get_db()
        email = req.email.lower().strip()
        user = db.users.find_one({"email": email})

        if not user or not verify_password(req.password, user["password_hash"]):
            raise UnauthorizedError("Invalid email or password.")

        if not user.get("is_active", True):
            raise ForbiddenError("Account is inactive or disabled.")

        token_payload = {
            "sub": user["id"],
            "email": user["email"],
            "role": user["role"],
        }
        access_token = create_access_token(token_payload)
        refresh_token, jti, expire_time = create_refresh_token(token_payload)

        # Store refresh token record for revocation & rotation tracking
        db.refresh_tokens.insert_one({
            "_id": jti,
            "jti": jti,
            "user_id": user["id"],
            "token": refresh_token,
            "expires_at": expire_time,
            "is_revoked": False,
            "created_at": datetime.now(timezone.utc),
        })

        user_profile = UserProfileResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            is_active=user.get("is_active", True),
            phone=user.get("phone"),
            address=user.get("address"),
            created_at=user["created_at"],
            average_rating=user.get("average_rating", 0.0),
            review_count=user.get("review_count", 0),
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=user_profile,
        )

    @staticmethod
    def refresh_access_token(refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid token type. Refresh token required.")

        jti = payload.get("jti")
        user_id = payload.get("sub")
        db = get_db()

        token_record = db.refresh_tokens.find_one({"jti": jti, "is_revoked": False})
        if not token_record:
            raise UnauthorizedError("Refresh token has been revoked or is invalid.")

        user = db.users.find_one({"id": user_id})
        if not user or not user.get("is_active", True):
            raise UnauthorizedError("User account not found or disabled.")

        # Revoke old refresh token (Token Rotation)
        db.refresh_tokens.update_one({"jti": jti}, {"$set": {"is_revoked": True}})

        token_payload = {
            "sub": user["id"],
            "email": user["email"],
            "role": user["role"],
        }
        new_access_token = create_access_token(token_payload)
        new_refresh_token, new_jti, new_expire = create_refresh_token(token_payload)

        db.refresh_tokens.insert_one({
            "_id": new_jti,
            "jti": new_jti,
            "user_id": user["id"],
            "token": new_refresh_token,
            "expires_at": new_expire,
            "is_revoked": False,
            "created_at": datetime.now(timezone.utc),
        })

        user_profile = UserProfileResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            is_active=user.get("is_active", True),
            phone=user.get("phone"),
            address=user.get("address"),
            created_at=user["created_at"],
            average_rating=user.get("average_rating", 0.0),
            review_count=user.get("review_count", 0),
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="Bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=user_profile,
        )

    @staticmethod
    def logout_token(refresh_token: str):
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            if jti:
                db = get_db()
                db.refresh_tokens.update_one({"jti": jti}, {"$set": {"is_revoked": True}})
        except Exception:
            pass  # Fail gracefully on logout

    @staticmethod
    def request_password_reset(email: str) -> Dict[str, Any]:
        db = get_db()
        email = email.lower().strip()
        user = db.users.find_one({"email": email})

        # Do not leak whether user exists to prevent email enumeration
        if not user:
            return {"message": "If this email is registered, a password reset token has been generated."}

        reset_token = generate_secure_token()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)

        db.password_resets.insert_one({
            "_id": reset_token,
            "token": reset_token,
            "user_id": user["id"],
            "email": email,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })

        logger.info(f"Password reset token created for user {user['id']}")

        # If SMTP is not configured, we provide dev testing info safely in logs
        response_data = {"message": "If this email is registered, a password reset token has been generated."}
        if settings.ENVIRONMENT == "development" or not settings.SMTP_ENABLED:
            response_data["dev_reset_token"] = reset_token
            response_data["notice"] = "SMTP is disabled. Dev reset token provided for testing."
        return response_data

    @staticmethod
    def reset_password(token: str, new_password: str) -> Dict[str, Any]:
        db = get_db()
        record = db.password_resets.find_one({"token": token, "used": False})
        now = datetime.now(timezone.utc)

        if not record or record.get("expires_at") < now:
            raise ValidationError("Password reset token is invalid or has expired.")

        hashed_pw = hash_password(new_password)
        db.users.update_one(
            {"id": record["user_id"]},
            {"$set": {"password_hash": hashed_pw, "updated_at": now}}
        )
        db.password_resets.update_one({"token": token}, {"$set": {"used": True}})

        # Revoke all existing refresh tokens for security
        db.refresh_tokens.update_many({"user_id": record["user_id"]}, {"$set": {"is_revoked": True}})

        return {"message": "Password has been successfully updated. Please log in with your new password."}


# FastAuth dependencies
def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header.")

    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type. Access token required.")

    user_id = payload.get("sub")
    db = get_db()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise UnauthorizedError("User associated with token no longer exists.")
    if not user.get("is_active", True):
        raise ForbiddenError("Account is inactive.")
    return user


def require_role(required_role: str):
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        # Admin can access all endpoints; otherwise check user's role
        if current_user.get("role") == "admin" or current_user.get("role") == required_role:
            return current_user
        raise ForbiddenError(f"Action requires '{required_role}' permissions.")
    return role_checker
