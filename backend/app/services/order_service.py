import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.orders import (
    OrderCreateRequest, OrderResponse, OrderStatus, PurchaseSource,
    OrderStatusHistoryItem, ShippingAddress
)
from app.schemas.products import ProductStatus, SellingMethod
from app.core.logging import logger


class OrderService:
    @staticmethod
    def _to_order_response(doc: Dict[str, Any]) -> OrderResponse:
        db = get_db()
        product = db.products.find_one({"id": doc.get("product_id")})
        buyer = db.users.find_one({"id": doc.get("buyer_id")})
        seller = db.users.find_one({"id": doc.get("seller_id")})

        history = [
            OrderStatusHistoryItem(
                status=OrderStatus(h["status"]),
                timestamp=h["timestamp"],
                updated_by=h["updated_by"],
                note=h.get("note")
            ) for h in doc.get("status_history", [])
        ]

        product_image = None
        if product and product.get("images"):
            product_image = product["images"][0]

        return OrderResponse(
            order_id=doc["order_id"],
            product_id=doc["product_id"],
            product_title=doc.get("product_title", product.get("title", "Product") if product else "Product"),
            product_image=product_image,
            buyer_id=doc["buyer_id"],
            buyer_name=buyer.get("name") if buyer else "Buyer",
            seller_id=doc["seller_id"],
            seller_name=seller.get("name") if seller else "Seller",
            transaction_price=float(doc["transaction_price"]),
            currency=doc.get("currency", "INR"),
            status=OrderStatus(doc["status"]),
            purchase_source=PurchaseSource(doc["purchase_source"]),
            shipping_address=ShippingAddress(**doc["shipping_address"]),
            shipment_info=doc.get("shipment_info"),
            payment_info=doc.get("payment_info"),
            payout_status=doc.get("payout_status", "held"),
            status_history=history,
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    @staticmethod
    def create_order(buyer_id: str, req: OrderCreateRequest) -> OrderResponse:
        db = get_db()
        product = db.products.find_one({"id": req.product_id})
        if not product:
            raise NotFoundError("Product listing not found.")

        # Buyer cannot be the seller
        if product["seller_id"] == buyer_id:
            raise ForbiddenError("Sellers cannot purchase their own products.")

        now = datetime.now(timezone.utc)
        transaction_price: float = 0.0

        # Validate purchase source terms
        if req.purchase_source == PurchaseSource.BUY_NOW:
            if product.get("selling_method") == SellingMethod.BIDDING.value:
                raise ValidationError("Buy Now is strictly disabled for Sealed Bidding listings.")
            if product.get("status") != ProductStatus.ACTIVE.value:
                raise ConflictError(f"Listing is currently '{product.get('status')}' and cannot be purchased.")
            transaction_price = float(product["asking_price"])

        elif req.purchase_source == PurchaseSource.OFFER:
            if not req.offer_id:
                raise ValidationError("offer_id is required when purchase_source is 'offer'.")
            offer = db.offers.find_one({"id": req.offer_id, "buyer_id": buyer_id, "product_id": req.product_id})
            if not offer:
                raise NotFoundError("Offer not found or unauthorized.")
            if offer.get("status") != "accepted":
                raise ConflictError("Cannot create order from an unaccepted offer.")
            transaction_price = float(offer["amount"])

        elif req.purchase_source == PurchaseSource.AUCTION:
            if not req.auction_id:
                raise ValidationError("auction_id is required when purchase_source is 'auction'.")
            auction = db.auctions.find_one({"id": req.auction_id, "product_id": req.product_id})
            if not auction:
                raise NotFoundError("Auction not found.")
            if auction.get("status") != "finalized":
                raise ConflictError("Auction has not been finalized yet.")
            if auction.get("winner_id") != buyer_id:
                raise ForbiddenError("You are not the designated winner of this auction.")
            transaction_price = float(auction["winning_amount"])

        # Check for existing active order for this product to prevent duplicate orders
        existing_order = db.orders.find_one({
            "product_id": req.product_id,
            "status": {"$in": ["pending_payment", "paid", "processing", "shipped", "delivered", "receipt_confirmed", "completed"]}
        })
        if existing_order:
            if existing_order["buyer_id"] == buyer_id and existing_order["status"] == "pending_payment":
                # Return existing pending order rather than creating duplicate
                return OrderService._to_order_response(existing_order)
            raise ConflictError("An order has already been initiated or completed for this product.")

        # Atomic reservation of product
        res = db.products.update_one(
            {"id": product["id"], "status": {"$in": [ProductStatus.ACTIVE.value, ProductStatus.RESERVED.value]}},
            {"$set": {"status": ProductStatus.RESERVED.value, "updated_at": now}}
        )

        order_id = f"ord_{uuid.uuid4().hex[:12]}"
        initial_history = [{
            "status": OrderStatus.PENDING_PAYMENT.value,
            "timestamp": now,
            "updated_by": buyer_id,
            "note": f"Order created via {req.purchase_source.value}"
        }]

        order_doc = {
            "_id": order_id,
            "order_id": order_id,
            "product_id": req.product_id,
            "product_title": product["title"],
            "buyer_id": buyer_id,
            "seller_id": product["seller_id"],
            "transaction_price": transaction_price,
            "currency": product.get("currency", "INR"),
            "status": OrderStatus.PENDING_PAYMENT.value,
            "purchase_source": req.purchase_source.value,
            "offer_id": req.offer_id,
            "auction_id": req.auction_id,
            "shipping_address": req.shipping_address.model_dump(),
            "shipment_info": None,
            "payment_info": None,
            "payout_status": "held",
            "status_history": initial_history,
            "created_at": now,
            "updated_at": now,
        }

        db.orders.insert_one(order_doc)
        logger.info(f"Order {order_id} created for product {req.product_id} by buyer {buyer_id} (amount: ₹{transaction_price:,.2f})")
        return OrderService._to_order_response(order_doc)

    @staticmethod
    def get_order_by_id(order_id: str, user_id: str) -> OrderResponse:
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        user = db.users.find_one({"id": user_id})
        is_admin = user and user.get("role") == "admin"

        if not (order["buyer_id"] == user_id or order["seller_id"] == user_id or is_admin):
            raise ForbiddenError("Unauthorized to access this order.")

        return OrderService._to_order_response(order)

    @staticmethod
    def mark_order_paid(order_id: str, provider_payment_id: str, provider: str, amount_paid: float) -> OrderResponse:
        """
        Internal transition called ONLY by verified payment webhook or authenticated sandbox runner.
        Never callable by unverified client request.
        """
        db = get_db()
        order = db.orders.find_one({"order_id": order_id})
        if not order:
            raise NotFoundError("Order not found.")

        if order["status"] != OrderStatus.PENDING_PAYMENT.value:
            # Already processed (idempotent)
            return OrderService._to_order_response(order)

        now = datetime.now(timezone.utc)
        payment_info = {
            "provider": provider,
            "provider_payment_id": provider_payment_id,
            "amount_paid": amount_paid,
            "paid_at": now,
        }

        history_item = {
            "status": OrderStatus.PAID.value,
            "timestamp": now,
            "updated_by": f"system_{provider}",
            "note": f"Payment of ₹{amount_paid:,.2f} confirmed by {provider}."
        }

        db.orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.PAID.value,
                    "payment_info": payment_info,
                    "updated_at": now,
                },
                "$push": {"status_history": history_item}
            }
        )

        # Transition product to sold
        db.products.update_one(
            {"id": order["product_id"]},
            {"$set": {"status": ProductStatus.SOLD.value, "updated_at": now}}
        )

        # Notify seller to ship
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": order["seller_id"],
            "title": "Payment Confirmed — Ready to Ship",
            "message": f"Payment for order {order_id} has been verified. Please dispatch the package.",
            "link": f"/dashboard/seller?order_id={order_id}",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Order {order_id} marked as PAID. Product {order['product_id']} set to SOLD.")
        updated = db.orders.find_one({"order_id": order_id})
        return OrderService._to_order_response(updated)

    @staticmethod
    def list_user_orders(user_id: str, role: str = "buyer") -> List[OrderResponse]:
        db = get_db()
        query = {"buyer_id": user_id} if role == "buyer" else {"seller_id": user_id}
        cursor = db.orders.find(query).sort("created_at", -1)
        return [OrderService._to_order_response(doc) for doc in cursor]
