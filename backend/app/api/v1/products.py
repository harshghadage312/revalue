import os
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from app.schemas.products import (
    ProductCreateRequest, ProductUpdateRequest, ProductResponse,
    ProductListResponse
)
from app.services.product_service import ProductService
from app.services.auth_service import get_current_user
from app.core.config import settings
from app.core.errors import ValidationError
from app.core.logging import logger

router = APIRouter(prefix="/products", tags=["Products & Marketplace"])


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return ProductService.create_product(current_user["id"], req)


@router.get("", response_model=ProductListResponse)
def list_products(
    query: Optional[str] = Query(None, description="Search keywords in title/brand/model"),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    selling_method: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    seller_id: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    sort_by: str = Query("newest", pattern="^(newest|price_asc|price_desc)$"),
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=50),
):
    return ProductService.list_products(
        query=query,
        category=category,
        brand=brand,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
        selling_method=selling_method,
        city=city,
        seller_id=seller_id,
        status=status,
        sort_by=sort_by,
        page=page,
        size=size,
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    return ProductService.get_product_by_id(product_id)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    req: ProductUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return ProductService.update_product(current_user["id"], product_id, req)


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return ProductService.deactivate_product(current_user["id"], product_id)


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    # Validate content type
    if file.content_type not in settings.allowed_image_mimes:
        raise ValidationError(
            f"Invalid file type '{file.content_type}'. Allowed types: {', '.join(settings.allowed_image_mimes)}"
        )

    # Read bytes and validate size
    contents = await file.read()
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise ValidationError(f"File size exceeds maximum allowable {settings.MAX_IMAGE_SIZE_MB}MB.")

    # Determine safe extension
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(file.content_type, ".jpg")

    # Generate random filename to prevent path traversal
    safe_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    target_path = os.path.join(upload_dir, safe_name)

    with open(target_path, "wb") as f:
        f.write(contents)

    image_url = f"/uploads/products/{safe_name}"
    logger.info(f"User {current_user['id']} uploaded image {safe_name}")

    return {
        "image_url": image_url,
        "filename": safe_name,
        "size_bytes": len(contents),
    }
