import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.offers import (
    OfferCreateRequest, CounterOfferRequest, OfferResponse,
    OfferStatus, CounterHistoryItem, NegotiationSuggestionRequest,
    NegotiationSuggestionResponse
)
from app.schemas.products import ProductStatus, SellingMethod
from app.services.negotiation import NegotiationRuleEngine
from app.core.logging import logger


class OfferService:
    @staticmethod
    def _to_offer_response(doc: Dict[str, Any]) -> OfferResponse:
        db = get_db()
        product = db.products.find_one({"id": doc.get("product_id")})
        buyer = db.users.find_one({"id": doc.get("buyer_id")})
        seller = db.users.find_one({"id": doc.get("seller_id")})

        history = [
            CounterHistoryItem(
                sender_id=item["sender_id"],
                sender_role=item["sender_role"],
                amount=float(item["amount"]),
                note=item.get("note"),
                created_at=item["created_at"],
            ) for item in doc.get("counter_history", [])
        ]

        return OfferResponse(
            id=doc["id"],
            product_id=doc["product_id"],
            product_title=product.get("title") if product else "Product",
            buyer_id=doc["buyer_id"],
            buyer_name=buyer.get("name") if buyer else "Buyer",
            seller_id=doc["seller_id"],
            seller_name=seller.get("name") if seller else "Seller",
            amount=float(doc["amount"]),
            currency=doc.get("currency", "INR"),
            status=OfferStatus(doc["status"]),
            note=doc.get("note"),
            counter_history=history,
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    @staticmethod
    def create_offer(buyer_id: str, req: OfferCreateRequest) -> OfferResponse:
        db = get_db()
        product = db.products.find_one({"id": req.product_id})
        if not product:
            raise NotFoundError("Product listing not found.")

        # Validation: cannot offer on own listing
        if product["seller_id"] == buyer_id:
            raise ForbiddenError("Sellers cannot make offers on their own listings.")

        # Validation: must be open negotiation
        if product.get("selling_method") != SellingMethod.NEGOTIATION.value:
            raise ValidationError("This product is sold via Sealed Bidding, not Open Negotiation.")

        # Validation: product status
        if product.get("status") != ProductStatus.ACTIVE.value:
            raise ConflictError(f"Listing is currently '{product.get('status')}' and not accepting offers.")

        if req.amount <= 0:
            raise ValidationError("Offer amount must be greater than zero.")

        now = datetime.now(timezone.utc)
        offer_id = str(uuid.uuid4())

        initial_history_item = {
            "sender_id": buyer_id,
            "sender_role": "buyer",
            "amount": float(req.amount),
            "note": req.note,
            "created_at": now,
        }

        offer_doc = {
            "_id": offer_id,
            "id": offer_id,
            "product_id": req.product_id,
            "buyer_id": buyer_id,
            "seller_id": product["seller_id"],
            "amount": float(req.amount),
            "currency": product.get("currency", "INR"),
            "status": OfferStatus.PENDING.value,
            "note": req.note,
            "counter_history": [initial_history_item],
            "created_at": now,
            "updated_at": now,
        }

        db.offers.insert_one(offer_doc)

        # Notify seller
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": product["seller_id"],
            "title": "New Offer Received",
            "message": f"Buyer submitted an offer of ₹{req.amount:,.2f} on '{product['title']}'",
            "link": f"/dashboard/seller?offer_id={offer_id}",
            "is_read": False,
            "created_at": now,
        })

        logger.info(f"Created offer {offer_id} for product {req.product_id} by buyer {buyer_id}")
        return OfferService._to_offer_response(offer_doc)

    @staticmethod
    def counter_offer(user_id: str, offer_id: str, req: CounterOfferRequest) -> OfferResponse:
        db = get_db()
        offer = db.offers.find_one({"id": offer_id})
        if not offer:
            raise NotFoundError("Offer not found.")

        if offer["status"] not in [OfferStatus.PENDING.value, OfferStatus.COUNTERED.value]:
            raise ConflictError(f"Cannot counter an offer that is already '{offer['status']}'.")

        is_seller = offer["seller_id"] == user_id
        is_buyer = offer["buyer_id"] == user_id
        if not (is_seller or is_buyer):
            raise ForbiddenError("You are not authorized to respond to this offer.")

        # Turn-taking enforcement
        if offer["status"] == OfferStatus.PENDING.value and is_buyer:
            raise ConflictError("You have already submitted an offer. Please wait for the seller to respond.")
        if offer.get("counter_history"):
            last_sender = offer["counter_history"][-1]["sender_id"]
            if last_sender == user_id:
                raise ConflictError("You must wait for the other party to respond before submitting another counteroffer.")

        sender_role = "seller" if is_seller else "buyer"
        recipient_id = offer["buyer_id"] if is_seller else offer["seller_id"]
        now = datetime.now(timezone.utc)

        history_item = {
            "sender_id": user_id,
            "sender_role": sender_role,
            "amount": float(req.amount),
            "note": req.note,
            "created_at": now,
        }

        db.offers.update_one(
            {"id": offer_id},
            {
                "$set": {
                    "amount": float(req.amount),
                    "status": OfferStatus.COUNTERED.value,
                    "updated_at": now,
                },
                "$push": {"counter_history": history_item}
            }
        )

        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": recipient_id,
            "title": f"Counteroffer from {sender_role.title()}",
            "message": f"New counteroffer of ₹{req.amount:,.2f} on your negotiation.",
            "link": f"/dashboard/buyer?offer_id={offer_id}" if is_seller else f"/dashboard/seller?offer_id={offer_id}",
            "is_read": False,
            "created_at": now,
        })

        updated_offer = db.offers.find_one({"id": offer_id})
        return OfferService._to_offer_response(updated_offer)

    @staticmethod
    def accept_offer(user_id: str, offer_id: str) -> OfferResponse:
        db = get_db()
        offer = db.offers.find_one({"id": offer_id})
        if not offer:
            raise NotFoundError("Offer not found.")

        # Both seller or buyer can accept the other party's counteroffer/offer
        is_seller = offer["seller_id"] == user_id
        is_buyer = offer["buyer_id"] == user_id
        if not (is_seller or is_buyer):
            raise ForbiddenError("Unauthorized to accept this offer.")

        # Turn-taking enforcement: cannot accept own proposal
        if offer["status"] == OfferStatus.PENDING.value:
            if is_buyer:
                raise ForbiddenError("Buyers cannot accept their own opening offer. Only the seller can accept.")
        elif offer["status"] == OfferStatus.COUNTERED.value:
            if offer.get("counter_history"):
                last_sender = offer["counter_history"][-1]["sender_id"]
                if last_sender == user_id:
                    raise ForbiddenError("You cannot accept your own counteroffer. Waiting for the other party to respond.")

        if offer["status"] not in [OfferStatus.PENDING.value, OfferStatus.COUNTERED.value]:
            raise ConflictError(f"Offer cannot be accepted because it is '{offer['status']}'.")

        product = db.products.find_one({"id": offer["product_id"]})
        if not product or product["status"] != ProductStatus.ACTIVE.value:
            raise ConflictError("Product is no longer available for acceptance.")

        now = datetime.now(timezone.utc)

        # Concurrency safety: atomic reservation of product
        res = db.products.update_one(
            {"id": product["id"], "status": ProductStatus.ACTIVE.value},
            {"$set": {"status": ProductStatus.RESERVED.value, "updated_at": now}}
        )
        if res.modified_count == 0:
            raise ConflictError("Product was just reserved by another buyer or transaction. Acceptance failed.")

        # Mark this offer accepted
        db.offers.update_one(
            {"id": offer_id},
            {"$set": {"status": OfferStatus.ACCEPTED.value, "updated_at": now}}
        )

        # Reject all other pending/countered offers for this product
        db.offers.update_many(
            {
                "product_id": product["id"],
                "id": {"$ne": offer_id},
                "status": {"$in": [OfferStatus.PENDING.value, OfferStatus.COUNTERED.value]}
            },
            {
                "$set": {
                    "status": OfferStatus.REJECTED.value,
                    "note": "Automatically closed: Seller accepted another competing offer.",
                    "updated_at": now
                }
            }
        )

        # Notify other party
        other_user_id = offer["buyer_id"] if is_seller else offer["seller_id"]
        db.notifications.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": other_user_id,
            "title": "Offer Accepted!",
            "message": f"Offer for ₹{offer['amount']:,.2f} on '{product['title']}' was accepted. Proceed to checkout.",
            "link": f"/checkout?order_source=offer&offer_id={offer_id}",
            "is_read": False,
            "created_at": now,
        })

        updated = db.offers.find_one({"id": offer_id})
        return OfferService._to_offer_response(updated)

    @staticmethod
    def reject_offer(user_id: str, offer_id: str) -> OfferResponse:
        db = get_db()
        offer = db.offers.find_one({"id": offer_id})
        if not offer:
            raise NotFoundError("Offer not found.")

        if user_id not in [offer["seller_id"], offer["buyer_id"]]:
            raise ForbiddenError("Unauthorized to reject this offer.")

        now = datetime.now(timezone.utc)
        db.offers.update_one(
            {"id": offer_id},
            {"$set": {"status": OfferStatus.REJECTED.value, "updated_at": now}}
        )
        updated = db.offers.find_one({"id": offer_id})
        return OfferService._to_offer_response(updated)

    @staticmethod
    def get_negotiation_suggestion(seller_id: str, offer_id: str) -> NegotiationSuggestionResponse:
        db = get_db()
        offer = db.offers.find_one({"id": offer_id})
        if not offer:
            raise NotFoundError("Offer not found.")

        if offer["seller_id"] != seller_id:
            raise ForbiddenError("Negotiation assistant is only accessible to the listing seller.")

        product = db.products.find_one({"id": offer["product_id"]})
        if not product:
            raise NotFoundError("Product not found.")

        # Retrieve seller's private min price if configured
        private_settings = product.get("private_negotiation_settings", {})
        min_price = private_settings.get("min_acceptable_price")

        req = NegotiationSuggestionRequest(
            asking_price=float(product["asking_price"]),
            buyer_offer=float(offer["amount"]),
            condition=product.get("condition", "good"),
            seller_min_price=float(min_price) if min_price else None,
        )
        return NegotiationRuleEngine.evaluate_offer(req)

    @staticmethod
    def list_user_offers(user_id: str, role: str = "all") -> List[OfferResponse]:
        db = get_db()
        query: Dict[str, Any] = {}
        if role == "buyer":
            query["buyer_id"] = user_id
        elif role == "seller":
            query["seller_id"] = user_id
        else:
            query["$or"] = [{"buyer_id": user_id}, {"seller_id": user_id}]

        cursor = db.offers.find(query).sort("updated_at", -1)
        return [OfferService._to_offer_response(doc) for doc in cursor]
