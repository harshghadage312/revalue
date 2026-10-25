import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.db.connection import get_db
from app.core.errors import NotFoundError, ConflictError
from app.schemas.products import ProductResponse
from app.services.product_service import ProductService


class NotificationService:
    @staticmethod
    def get_user_notifications(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        db = get_db()
        cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        return list(cursor)

    @staticmethod
    def mark_notification_read(user_id: str, notification_id: str) -> Dict[str, Any]:
        db = get_db()
        res = db.notifications.update_one(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"is_read": True}}
        )
        return {"success": res.modified_count > 0}


class WishlistService:
    @staticmethod
    def add_to_wishlist(user_id: str, product_id: str) -> Dict[str, Any]:
        db = get_db()
        product = db.products.find_one({"id": product_id})
        if not product:
            raise NotFoundError("Product not found.")

        existing = db.wishlists.find_one({"user_id": user_id, "product_id": product_id})
        if existing:
            return {"message": "Product is already in wishlist."}

        db.wishlists.insert_one({
            "_id": f"{user_id}_{product_id}",
            "user_id": user_id,
            "product_id": product_id,
            "created_at": datetime.now(timezone.utc),
        })
        return {"message": "Added to wishlist."}

    @staticmethod
    def remove_from_wishlist(user_id: str, product_id: str) -> Dict[str, Any]:
        db = get_db()
        db.wishlists.delete_one({"user_id": user_id, "product_id": product_id})
        return {"message": "Removed from wishlist."}

    @staticmethod
    def get_user_wishlist(user_id: str) -> List[ProductResponse]:
        db = get_db()
        cursor = db.wishlists.find({"user_id": user_id}).sort("created_at", -1)
        product_ids = [item["product_id"] for item in cursor]
        products = []
        for pid in product_ids:
            p_doc = db.products.find_one({"id": pid, "status": "active"})
            if p_doc:
                products.append(ProductService._sanitize_product_doc(p_doc))
        return products
