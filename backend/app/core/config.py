import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, model_validator


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "ReValue"
    APP_VERSION: str = "1.0.0"

    # Server URLs
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Database
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "revalue_db"
    MONGODB_TIMEOUT_MS: int = 2000

    # Authentication & JWT
    JWT_SECRET_KEY: str = "revalue_local_development_secret_key_8f39b2e1a4c7d0e5f2a8b9c1d3e7f0a2"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # Storage
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "./uploads/products"
    MAX_IMAGE_SIZE_MB: int = 5
    MAX_IMAGES_PER_LISTING: int = 6
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp"

    # Email
    SMTP_ENABLED: bool = False
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "no-reply@revalue.market"
    SMTP_FROM_NAME: str = "ReValue Marketplace"

    # Payments
    PAYMENT_PROVIDER: str = "sandbox"  # "sandbox", "razorpay", "disabled"
    PAYMENT_CURRENCY: str = "INR"
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None
    PAYMENT_RELEASE_HOLD_HOURS: int = 48

    # Machine Learning Models
    PRICE_MODEL_PATH: str = "./ml/price_prediction/artifacts/mindvalue_random_forest_model.pkl"
    MOBILE_CONDITION_MODEL_PATH: str = "./ml/mobile_condition/artifacts/mobilenet_condition.keras"

    # Initial Admin Provisioning
    INITIAL_ADMIN_EMAIL: str = "admin@revalue.market"
    INITIAL_ADMIN_PASSWORD: str = "AdminSecurePass!2026"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_image_mimes(self) -> List[str]:
        return [mime.strip() for mime in self.ALLOWED_IMAGE_TYPES.split(",") if mime.strip()]

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.ENVIRONMENT == "production":
            if "local" in self.JWT_SECRET_KEY.lower() or "development" in self.JWT_SECRET_KEY.lower():
                raise ValueError("FATAL: In production mode, JWT_SECRET_KEY must be a cryptographically strong unique secret, not the default development key.")
            if self.INITIAL_ADMIN_PASSWORD == "AdminSecurePass!2026":
                raise ValueError("FATAL: In production mode, INITIAL_ADMIN_PASSWORD must be explicitly changed from the default value.")
        return self

    class Config:
        env_file = [".env", "../.env", "../../.env"]
        extra = "ignore"


settings = Settings()
