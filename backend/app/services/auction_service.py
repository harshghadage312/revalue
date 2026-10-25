import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.db.connection import get_db
from app.core.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from app.schemas.auctions import (
    AuctionResponse, BidResponse, BidCreateRequest, AuctionStatus
)
from app.schemas.products import ProductStatus
from app.core.logging import logger


class AuctionService:
    @staticmethod
    def _to_auction_response(auction_doc: Dict[str, Any], current_user_id: Optional[str] = None) -> AuctionResponse:
        db = get_db()
        total_bids = db.bids.count_documents({"auction_id": auction_doc["id"]})

        # Fetch current user's own bid if authenticated
        user_bid = None
        if current_user_id:
            bid_doc = db.bids.find_one({"auction_id": auction_doc["id"], "buyer_id": current_user_id})
            if bid_doc:
                user_bid = BidResponse(
                    id=bid_doc["id"],
                    auction_id=bid_doc["auction_id"],
                    product_id=bid_doc["product_id"],
                    amount=float(bid_doc["amount"]),
                    created_at=bid_doc["created_at"],
                    is_winning_bid=bool(auction_doc.get("winner_id") == current_user_id),
                )

        # Winning details only disclosed if finalized or caller is winner/seller
        winner_id = auction_doc.get("winner_id") if auction_doc.get("status") == "finalized" else None
        winning_amount = auction_doc.get("winning_amount") if auction_doc.get("status") == "finalized" else None

        return AuctionResponse(
            id=auction_doc["id"],
            product_id=auction_doc["product_id"],
            seller_id=auction_doc["seller_id"],
            starting_bid=float(auction_doc["starting_bid"]),
            min_increment=float(auction_doc.get("min_increment", 100.0)),
            deadline=auction_doc["deadline"],
            status=AuctionStatus(auction_doc["status"]),
            total_bids_count=total_bids,
            winner_id=winner_id,
            winning_amount=winning_amount,
            has_reserve_price=bool(auction_doc.get("reserve_price")),  # NEVER exposes reserve_price value!
            user_own_bid=user_bid,
            created_at=auction_doc["created_at"],
            finalized_at=auction_doc.get("finalized_at"),
        )

    @staticmethod
    def get_auction_by_id(auction_id: str, current_user_id: Optional[str] = None) -> AuctionResponse:
        db = get_db()
        auction = db.auctions.find_one({"id": auction_id})
        if not auction:
            raise NotFoundError("Auction not found.")
        return AuctionService._to_auction_response(auction, current_user_id)

    @staticmethod
    def get_auction_for_product(product_id: str, current_user_id: Optional[str] = None) -> AuctionResponse:
        db = get_db()
        auction = db.auctions.find_one({"product_id": product_id})
        if not auction:
            raise NotFoundError("No sealed-bid auction exists for this product.")
        return AuctionService._to_auction_response(auction, current_user_id)

    @staticmethod
    def submit_sealed_bid(buyer_id: str, auction_id: str, req: BidCreateRequest) -> BidResponse:
        db = get_db()
        auction = db.auctions.find_one({"id": auction_id})
        if not auction:
            raise NotFoundError("Auction not found.")

        # Check auction status
        if auction.get("status") != AuctionStatus.ACTIVE.value:
            raise ConflictError(f"Auction is '{auction.get('status')}' and no longer accepting bids.")

        now = datetime.now(timezone.utc)
        # Server-enforced deadline check
        deadline = auction["deadline"]
        if isinstance(deadline, str):
            # Parse ISO if stored as string
            deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now >= deadline:
            raise ValidationError("Auction deadline has passed. No further bids can be accepted.")

        # Seller cannot bid on own listing
        if auction["seller_id"] == buyer_id:
            raise ForbiddenError("Sellers are prohibited from bidding on their own auctions.")

        amount = float(req.amount)
        starting_bid = float(auction["starting_bid"])
        min_increment = float(auction.get("min_increment", 100.0))

        if amount < starting_bid:
            raise ValidationError(f"Bid amount must be at least the starting bid of ₹{starting_bid:,.2f}.")

        # Check existing bid by this user
        existing_bid = db.bids.find_one({"auction_id": auction_id, "buyer_id": buyer_id})
        if existing_bid:
            prev_amount = float(existing_bid["amount"])
            if amount < (prev_amount + min_increment):
                raise ValidationError(
                    f"Your new bid must exceed your previous bid of ₹{prev_amount:,.2f} by at least ₹{min_increment:,.2f}."
                )
            # Update existing bid
            db.bids.update_one(
                {"id": existing_bid["id"]},
                {"$set": {"amount": amount, "updated_at": now}}
            )
            bid_id = existing_bid["id"]
            created_at = existing_bid["created_at"]
            logger.info(f"User {buyer_id} updated sealed bid to ₹{amount:,.2f} on auction {auction_id}")
        else:
            bid_id = str(uuid.uuid4())
            created_at = now
            bid_doc = {
                "_id": bid_id,
                "id": bid_id,
                "auction_id": auction_id,
                "product_id": auction["product_id"],
                "buyer_id": buyer_id,
                "amount": amount,
                "created_at": now,
                "updated_at": now,
            }
            db.bids.insert_one(bid_doc)
            db.auctions.update_one({"id": auction_id}, {"$inc": {"total_bids": 1}})
            logger.info(f"User {buyer_id} submitted new sealed bid of ₹{amount:,.2f} on auction {auction_id}")

        return BidResponse(
            id=bid_id,
            auction_id=auction_id,
            product_id=auction["product_id"],
            amount=amount,
            created_at=created_at,
            is_winning_bid=False,
        )

    @staticmethod
    def finalize_auction(auction_id: str, caller_id: Optional[str] = None) -> AuctionResponse:
        """
        Finalizes an auction server-side safely and deterministically.
        Can be triggered by scheduler, worker, or explicit authorized request when deadline has passed.
        """
        db = get_db()
        auction = db.auctions.find_one({"id": auction_id})
        if not auction:
            raise NotFoundError("Auction not found.")

        # Idempotency check: if already finalized or closed, return existing status
        if auction.get("status") in [AuctionStatus.FINALIZED.value, AuctionStatus.CLOSED_NO_WINNER.value]:
            return AuctionService._to_auction_response(auction, caller_id)

        now = datetime.now(timezone.utc)
        deadline = auction["deadline"]
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        # Cannot finalize before server deadline!
        if now < deadline:
            raise ValidationError("Auction cannot be finalized before its scheduled deadline has passed.")

        # Retrieve all valid bids for this auction
        bids_cursor = db.bids.find({"auction_id": auction_id})
        bids = list(bids_cursor)

        reserve_price = auction.get("reserve_price")
        reserve_float = float(reserve_price) if reserve_price else 0.0

        if not bids:
            # No bids placed -> closed without winner
            db.auctions.update_one(
                {"id": auction_id},
                {
                    "$set": {
                        "status": AuctionStatus.CLOSED_NO_WINNER.value,
                        "finalized_at": now,
                    }
                }
            )
            logger.info(f"Auction {auction_id} closed with no bids.")
            updated = db.auctions.find_one({"id": auction_id})
            return AuctionService._to_auction_response(updated, caller_id)

        # Sort deterministically: highest amount first; on tie, earliest created_at wins
        def sort_key(b):
            amt = float(b["amount"])
            dt = b["created_at"]
            if isinstance(dt, str):
                dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            ts = dt.timestamp()
            return (-amt, ts)

        sorted_bids = sorted(bids, key=sort_key)
        highest_bid = sorted_bids[0]
        highest_amount = float(highest_bid["amount"])

        # Check reserve price condition
        if reserve_float > 0 and highest_amount < reserve_float:
            # Highest bid did not meet the seller's private reserve price!
            db.auctions.update_one(
                {"id": auction_id},
                {
                    "$set": {
                        "status": AuctionStatus.CLOSED_NO_WINNER.value,
                        "finalized_at": now,
                    }
                }
            )
            logger.info(f"Auction {auction_id} closed without winner: highest bid ₹{highest_amount:,.2f} did not meet reserve price.")
            updated = db.auctions.find_one({"id": auction_id})
            return AuctionService._to_auction_response(updated, caller_id)

        # Valid winner selected!
        winner_id = highest_bid["buyer_id"]
        winning_amount = highest_amount

        # Atomic transition to finalized
        res = db.auctions.update_one(
            {"id": auction_id, "status": AuctionStatus.ACTIVE.value},
            {
                "$set": {
                    "status": AuctionStatus.FINALIZED.value,
                    "winner_id": winner_id,
                    "winning_amount": winning_amount,
                    "finalized_at": now,
                }
            }
        )

        if res.modified_count > 0:
            # Reserve product for winner
            db.products.update_one(
                {"id": auction["product_id"]},
                {"$set": {"status": ProductStatus.RESERVED.value, "updated_at": now}}
            )

            # Notify winner
            product = db.products.find_one({"id": auction["product_id"]})
            prod_title = product.get("title", "Auction Item") if product else "Auction Item"

            db.notifications.insert_one({
                "_id": str(uuid.uuid4()),
                "user_id": winner_id,
                "title": "You Won the Auction!",
                "message": f"Congratulations! Your sealed bid of ₹{winning_amount:,.2f} won '{prod_title}'. Complete your order now.",
                "link": f"/checkout?order_source=auction&auction_id={auction_id}",
                "is_read": False,
                "created_at": now,
            })

            # Notify seller
            db.notifications.insert_one({
                "_id": str(uuid.uuid4()),
                "user_id": auction["seller_id"],
                "title": "Auction Finalized with Winner",
                "message": f"Your sealed-bid auction for '{prod_title}' finalized with winning bid ₹{winning_amount:,.2f}.",
                "link": f"/dashboard/seller",
                "is_read": False,
                "created_at": now,
            })

            logger.info(f"Auction {auction_id} successfully finalized. Winner: {winner_id}, Amount: ₹{winning_amount:,.2f}")

        updated = db.auctions.find_one({"id": auction_id})
        return AuctionService._to_auction_response(updated, caller_id)
