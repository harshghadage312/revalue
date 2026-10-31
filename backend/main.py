import os
import sys

# Ensure root directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import logger
from app.core.errors import (
    AppException, app_exception_handler,
    validation_exception_handler, generic_exception_handler
)
from app.db.connection import DatabaseManager
from app.db.indexes import init_indexes

# Import API Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.offers import router as offers_router
from app.api.v1.auctions import router as auctions_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.delivery import router as delivery_router, webhook_router as courier_webhook_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.wishlist import router as wishlist_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.admin import router as admin_router
from app.api.v1.riders import router as riders_router
from app.api.v1.ml import router as ml_router
from app.api.v1.health import router as health_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ReValue — AI-Assisted Resale Marketplace API with Sealed Bidding, Open Negotiation, and Payments.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Mount Local Uploads Directory for serving product photos
upload_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads/products", StaticFiles(directory=upload_dir), name="uploads")

# Include Versioned API Routers
api_v1_prefix = "/api/v1"

@app.get("/docs", include_in_schema=False)
async def redirect_docs():
    return RedirectResponse(url="/api/docs")

app.include_router(health_router, prefix="/api")
app.include_router(health_router, prefix=api_v1_prefix)
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(products_router, prefix=api_v1_prefix)
app.include_router(offers_router, prefix=api_v1_prefix)
app.include_router(auctions_router, prefix=api_v1_prefix)
app.include_router(orders_router, prefix=api_v1_prefix)
app.include_router(payments_router, prefix=api_v1_prefix)
app.include_router(delivery_router, prefix=api_v1_prefix)
app.include_router(courier_webhook_router, prefix=api_v1_prefix)
app.include_router(courier_webhook_router, prefix="")
app.include_router(reviews_router, prefix=api_v1_prefix)
app.include_router(wishlist_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)
app.include_router(admin_router, prefix=api_v1_prefix)
app.include_router(riders_router, prefix=api_v1_prefix)
app.include_router(ml_router, prefix=api_v1_prefix)


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.ENVIRONMENT} mode)")
    DatabaseManager.connect()
    init_indexes()


@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.APP_NAME}...")
    DatabaseManager.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
