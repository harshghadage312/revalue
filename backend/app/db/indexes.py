import pymongo
from app.db.connection import get_db
from app.core.logging import logger


def init_indexes():
    """Initializes explicit database indexes on all collections."""
    db = get_db()
    logger.info("Initializing database indexes...")

    try:
        # Users collection
        db.users.create_index("email", unique=True, name="idx_users_email_unique")
        db.users.create_index("role", name="idx_users_role")

        # Refresh tokens collection
        db.refresh_tokens.create_index("jti", unique=True, name="idx_tokens_jti_unique")
        db.refresh_tokens.create_index("user_id", name="idx_tokens_user_id")
        db.refresh_tokens.create_index("expires_at", name="idx_tokens_expires_at")

        # Products collection
        db.products.create_index("seller_id", name="idx_products_seller_id")
        db.products.create_index("status", name="idx_products_status")
        db.products.create_index("selling_method", name="idx_products_selling_method")
        db.products.create_index([("category", pymongo.ASCENDING), ("asking_price", pymongo.ASCENDING)], name="idx_products_cat_price")
        db.products.create_index("created_at", name="idx_products_created_at")

        # Offers collection (Open Negotiation)
        db.offers.create_index("product_id", name="idx_offers_product_id")
        db.offers.create_index("buyer_id", name="idx_offers_buyer_id")
        db.offers.create_index("seller_id", name="idx_offers_seller_id")
        db.offers.create_index("status", name="idx_offers_status")

        # Auctions collection (Sealed Bidding)
        db.auctions.create_index("product_id", unique=True, name="idx_auctions_product_unique")
        db.auctions.create_index("seller_id", name="idx_auctions_seller_id")
        db.auctions.create_index("status", name="idx_auctions_status")
        db.auctions.create_index("deadline", name="idx_auctions_deadline")

        # Bids collection
        db.bids.create_index("auction_id", name="idx_bids_auction_id")
        db.bids.create_index("buyer_id", name="idx_bids_buyer_id")
        db.bids.create_index([("auction_id", pymongo.ASCENDING), ("amount", pymongo.DESCENDING)], name="idx_bids_amount_desc")

        # Orders collection
        db.orders.create_index("order_id", unique=True, name="idx_orders_order_id_unique")
        db.orders.create_index("buyer_id", name="idx_orders_buyer_id")
        db.orders.create_index("seller_id", name="idx_orders_seller_id")
        db.orders.create_index("product_id", name="idx_orders_product_id")
        db.orders.create_index("status", name="idx_orders_status")

        # Payments collection
        db.payments.create_index("payment_id", unique=True, name="idx_payments_id_unique")
        db.payments.create_index("order_id", name="idx_payments_order_id")

        # Reviews collection: One review per reviewer per order
        db.reviews.create_index([("order_id", pymongo.ASCENDING), ("reviewer_id", pymongo.ASCENDING)], unique=True, name="idx_reviews_order_reviewer_unique")
        db.reviews.create_index("target_user_id", name="idx_reviews_target_user_id")

        # Wishlists collection: Unique user-product pair
        db.wishlists.create_index([("user_id", pymongo.ASCENDING), ("product_id", pymongo.ASCENDING)], unique=True, name="idx_wishlist_user_prod_unique")

        # Notifications collection
        db.notifications.create_index("user_id", name="idx_notif_user_id")
        db.notifications.create_index("created_at", name="idx_notif_created_at")

        # Disputes collection
        db.disputes.create_index("order_id", name="idx_disputes_order_id")

        logger.info("Database indexes successfully initialized.")
    except Exception as e:
        logger.warning(f"Note on index creation: {str(e)}")
