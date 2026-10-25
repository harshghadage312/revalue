import os
import uuid
import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.config import settings
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.products import (
    ProductCreateRequest, ProductUpdateRequest, ProductResponse,
    ProductListResponse, ProductStatus, SellingMethod
)
from app.core.logging import logger


class ProductService:
    @staticmethod
    def _sanitize_product_doc(doc: Dict[str, Any], current_user_id: Optional[str] = None) -> ProductResponse:
        """Strips private seller secrets (like reserve_price, min_acceptable_price) from public response."""
        db = get_db()
        seller = db.users.find_one({"id": doc.get("seller_id")})
        seller_name = seller.get("name") if seller else "Verified Seller"
        seller_rating = seller.get("average_rating", 0.0) if seller else 0.0

        # Auction info if bidding
        auction_info = None
        starting_bid = None
        if doc.get("selling_method") == SellingMethod.BIDDING.value:
            auction = db.auctions.find_one({"product_id": doc["id"]})
            if auction:
                starting_bid = float(auction["starting_bid"])
                auction_info = {
                    "auction_id": auction["id"],
                    "starting_bid": float(auction["starting_bid"]),
                    "min_increment": auction["min_increment"],
                    "deadline": auction["deadline"],
                    "status": auction["status"],
                    "total_bids": db.bids.count_documents({"auction_id": auction["id"]}),
                    "has_reserve_price": bool(auction.get("reserve_price")),
                }
                # If finalized, show winner & winning amount
                if auction.get("status") == "finalized":
                    auction_info["winning_amount"] = auction.get("winning_amount")
                    auction_info["winner_id"] = auction.get("winner_id")

        return ProductResponse(
            id=doc["id"],
            seller_id=doc["seller_id"],
            seller_name=seller_name,
            title=doc["title"],
            description=doc["description"],
            category=doc.get("category", "smartphone"),
            brand=doc["brand"],
            model=doc["model"],
            condition=doc["condition"],
            asking_price=float(doc["asking_price"]),
            starting_bid=starting_bid,
            currency=doc.get("currency", "INR"),
            original_retail_price=doc.get("original_retail_price"),
            approximate_age_months=doc.get("approximate_age_months"),
            specs=doc.get("specs"),
            location_city=doc.get("location_city"),
            selling_method=SellingMethod(doc["selling_method"]),
            images=doc.get("images", []),
            status=ProductStatus(doc.get("status", "active")),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            auction_info=auction_info,
            seller_rating=seller_rating,
        )

    @staticmethod
    def create_product(seller_id: str, req: ProductCreateRequest) -> ProductResponse:
        db = get_db()
        product_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Enforce image count limit
        if len(req.images) > settings.MAX_IMAGES_PER_LISTING:
            raise ValidationError(f"Maximum {settings.MAX_IMAGES_PER_LISTING} images allowed per listing.")

        # If Sealed Bidding, validate auction settings
        if req.selling_method == SellingMethod.BIDDING:
            if not req.auction_settings:
                raise ValidationError("Auction settings are required for sealed bidding listings.")
            if req.auction_settings.deadline <= now:
                raise ValidationError("Auction closing deadline must be in the future.")

        product_doc = {
            "_id": product_id,
            "id": product_id,
            "seller_id": seller_id,
            "title": req.title.strip(),
            "description": req.description.strip(),
            "category": req.category.strip().lower(),
            "brand": req.brand.strip(),
            "model": req.model.strip(),
            "condition": req.condition.value,
            "asking_price": float(req.auction_settings.starting_bid) if req.selling_method == SellingMethod.BIDDING and req.auction_settings else float(req.asking_price),
            "currency": req.currency,
            "original_retail_price": float(req.original_retail_price) if req.original_retail_price else None,
            "approximate_age_months": req.approximate_age_months,
            "specs": req.specs.model_dump() if req.specs else None,
            "location_city": req.location_city.strip() if req.location_city else None,
            "selling_method": req.selling_method.value,
            "images": req.images,
            "status": ProductStatus.ACTIVE.value,
            "created_at": now,
            "updated_at": now,
        }

        # Store private negotiation settings if provided
        if req.selling_method == SellingMethod.NEGOTIATION and req.negotiation_settings:
            product_doc["private_negotiation_settings"] = {
                "min_acceptable_price": req.negotiation_settings.min_acceptable_price,
                "allow_counteroffers": req.negotiation_settings.allow_counteroffers,
            }

        db.products.insert_one(product_doc)

        # Create auction record if bidding
        if req.selling_method == SellingMethod.BIDDING and req.auction_settings:
            auction_id = str(uuid.uuid4())
            auction_doc = {
                "_id": auction_id,
                "id": auction_id,
                "product_id": product_id,
                "seller_id": seller_id,
                "starting_bid": float(req.auction_settings.starting_bid),
                "reserve_price": float(req.auction_settings.reserve_price) if req.auction_settings.reserve_price else None,
                "min_increment": float(req.auction_settings.min_increment),
                "deadline": req.auction_settings.deadline,
                "status": "active",
                "total_bids": 0,
                "winner_id": None,
                "winning_amount": None,
                "created_at": now,
                "finalized_at": None,
            }
            db.auctions.insert_one(auction_doc)
            logger.info(f"Initialized sealed-bid auction {auction_id} for product {product_id}")

        logger.info(f"Created product listing {product_id} by seller {seller_id}")
        return ProductService._sanitize_product_doc(product_doc, seller_id)

    @staticmethod
    def get_product_by_id(product_id: str, current_user_id: Optional[str] = None) -> ProductResponse:
        db = get_db()
        product = db.products.find_one({"id": product_id})
        if not product:
            raise NotFoundError(f"Product listing with id '{product_id}' was not found.")
        return ProductService._sanitize_product_doc(product, current_user_id)

    @staticmethod
    def list_products(
        query: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        condition: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        selling_method: Optional[str] = None,
        city: Optional[str] = None,
        seller_id: Optional[str] = None,
        status: Optional[str] = "active",
        sort_by: str = "newest",  # "newest", "price_asc", "price_desc"
        page: int = 1,
        size: int = 12,
    ) -> ProductListResponse:
        db = get_db()
        filter_dict: Dict[str, Any] = {}

        if status:
            filter_dict["status"] = status
        if category:
            filter_dict["category"] = category.lower().strip()
        if brand:
            filter_dict["brand"] = {"$regex": f"^{brand.strip()}$"}
        if condition:
            filter_dict["condition"] = condition.lower().strip()
        if selling_method:
            filter_dict["selling_method"] = selling_method.lower().strip()
        if city:
            filter_dict["location_city"] = {"$regex": city.strip()}
        if seller_id:
            filter_dict["seller_id"] = seller_id

        # Price range filter
        if min_price is not None or max_price is not None:
            price_query: Dict[str, Any] = {}
            if min_price is not None:
                price_query["$gte"] = float(min_price)
            if max_price is not None:
                price_query["$lte"] = float(max_price)
            filter_dict["asking_price"] = price_query

        # Text query in title or description or brand
        if query:
            q_clean = query.strip()
            filter_dict["$or"] = [
                {"title": {"$regex": q_clean}},
                {"brand": {"$regex": q_clean}},
                {"model": {"$regex": q_clean}},
                {"description": {"$regex": q_clean}},
            ]

        total = db.products.count_documents(filter_dict)
        total_pages = max(1, math.ceil(total / size))
        skip = (page - 1) * size

        cursor = db.products.find(filter_dict)
        if sort_by == "price_asc":
            cursor = cursor.sort("asking_price", 1)
        elif sort_by == "price_desc":
            cursor = cursor.sort("asking_price", -1)
        else:
            cursor = cursor.sort("created_at", -1)

        cursor = cursor.skip(skip).limit(size)
        items = [ProductService._sanitize_product_doc(doc) for doc in cursor]

        return ProductListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=total_pages,
        )

    @staticmethod
    def update_product(seller_id: str, product_id: str, req: ProductUpdateRequest) -> ProductResponse:
        db = get_db()
        product = db.products.find_one({"id": product_id})
        if not product:
            raise NotFoundError(f"Product with id '{product_id}' not found.")

        if product["seller_id"] != seller_id:
            raise ForbiddenError("You can only modify your own listings.")

        # Cannot edit a sold or reserved listing
        if product["status"] in [ProductStatus.SOLD.value, ProductStatus.RESERVED.value]:
            raise ConflictError(f"Cannot edit listing in '{product['status']}' state.")

        update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if req.title is not None:
            update_fields["title"] = req.title.strip()
        if req.description is not None:
            update_fields["description"] = req.description.strip()
        if req.condition is not None:
            update_fields["condition"] = req.condition.value
        if req.asking_price is not None:
            update_fields["asking_price"] = float(req.asking_price)
        if req.specs is not None:
            update_fields["specs"] = req.specs.model_dump()
        if req.location_city is not None:
            update_fields["location_city"] = req.location_city.strip()
        if req.images is not None:
            update_fields["images"] = req.images
        if req.status is not None:
            update_fields["status"] = req.status.value

        db.products.update_one({"id": product_id}, {"$set": update_fields})
        updated_doc = db.products.find_one({"id": product_id})
        return ProductService._sanitize_product_doc(updated_doc, seller_id)

    @staticmethod
    def deactivate_product(seller_id: str, product_id: str) -> Dict[str, Any]:
        db = get_db()
        product = db.products.find_one({"id": product_id})
        if not product:
            raise NotFoundError(f"Product with id '{product_id}' not found.")

        if product["seller_id"] != seller_id:
            raise ForbiddenError("You can only deactivate your own listings.")

        if product["status"] in [ProductStatus.SOLD.value, ProductStatus.RESERVED.value]:
            raise ConflictError(f"Cannot deactivate listing in '{product['status']}' state.")

        db.products.update_one(
            {"id": product_id},
            {"$set": {"status": ProductStatus.INACTIVE.value, "updated_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Product listing deactivated successfully."}
