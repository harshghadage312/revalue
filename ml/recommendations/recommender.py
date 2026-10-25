from typing import List, Dict, Any, Optional
from app.db.connection import get_db
from app.schemas.ml import RecommendationResponse, RecommendationItem
from app.core.logging import logger


class RecommendationEngine:
    ALGORITHM_VERSION = "content_recommender_v1.1"

    @classmethod
    def get_recommendations(
        cls,
        user_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 6
    ) -> RecommendationResponse:
        db = get_db()
        # Find all active available products
        active_cursor = db.products.find({"status": "active"}).sort("created_at", -1)
        active_products = list(active_cursor)

        if not active_products:
            return RecommendationResponse(
                items=[],
                total=0,
                algorithm_version=cls.ALGORITHM_VERSION,
                is_personalized=False,
            )

        # Collect user signals if user is authenticated
        favored_brands: Dict[str, int] = {}
        target_price_sum = 0.0
        signal_count = 0

        if user_id:
            # 1. Wishlist signals
            wishlist_cursor = db.wishlists.find({"user_id": user_id})
            for item in wishlist_cursor:
                prod = db.products.find_one({"id": item["product_id"]})
                if prod:
                    b = prod.get("brand")
                    if b:
                        favored_brands[b] = favored_brands.get(b, 0) + 2
                    target_price_sum += float(prod.get("asking_price", 0))
                    signal_count += 1

            # 2. Past order signals
            orders_cursor = db.orders.find({"buyer_id": user_id})
            for order in orders_cursor:
                prod = db.products.find_one({"id": order["product_id"]})
                if prod:
                    b = prod.get("brand")
                    if b:
                        favored_brands[b] = favored_brands.get(b, 0) + 3
                    target_price_sum += float(order.get("transaction_price", 0))
                    signal_count += 1

        is_personalized = signal_count > 0
        avg_target_price = (target_price_sum / signal_count) if signal_count > 0 else 0.0

        scored_items: List[RecommendationItem] = []

        for p in active_products:
            # Do not recommend product to its own seller
            if user_id and p.get("seller_id") == user_id:
                continue

            score = 1.0  # Base popularity/freshness score
            reasons = []

            brand = p.get("brand", "")
            asking_price = float(p.get("asking_price", 0))

            if is_personalized:
                if brand in favored_brands:
                    brand_weight = favored_brands[brand]
                    score += (brand_weight * 2.5)
                    reasons.append(f"Matches your affinity for {brand} devices")

                if avg_target_price > 0:
                    price_diff_ratio = abs(asking_price - avg_target_price) / avg_target_price
                    if price_diff_ratio <= 0.25:
                        score += 3.0
                        reasons.append("Aligns with your typical purchase price range")
            else:
                reasons.append("Trending verified listing in the marketplace")

            if p.get("condition") == "excellent":
                score += 1.5
                reasons.append("Mint physical condition")

            primary_reason = reasons[0] if reasons else "Recommended based on marketplace activity"
            img = p.get("images", [None])[0] if p.get("images") else None

            scored_items.append(
                RecommendationItem(
                    product_id=p["id"],
                    title=p["title"],
                    brand=brand,
                    model=p.get("model", ""),
                    asking_price=asking_price,
                    condition=p.get("condition", "good"),
                    image_url=img,
                    similarity_score=round(score, 2),
                    recommendation_reason=primary_reason,
                    is_personalized=is_personalized,
                )
            )

        # Sort by score descending
        scored_items.sort(key=lambda x: x.similarity_score, reverse=True)
        final_items = scored_items[:limit]

        return RecommendationResponse(
            items=final_items,
            total=len(final_items),
            algorithm_version=cls.ALGORITHM_VERSION,
            is_personalized=is_personalized,
        )
