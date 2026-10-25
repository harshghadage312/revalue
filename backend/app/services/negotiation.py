import math
from typing import Optional, Dict, Any
from app.schemas.offers import (
    NegotiationDecision, NegotiationSuggestionRequest, NegotiationSuggestionResponse
)
from app.core.logging import logger


class NegotiationRuleEngine:
    RULE_VERSION = "revalue_rule_v1.2"

    @classmethod
    def evaluate_offer(cls, req: NegotiationSuggestionRequest) -> NegotiationSuggestionResponse:
        """
        Deterministic, rule-based negotiation assistance.
        Safely evaluates buyer's offer without exposing seller's confidential limits.
        """
        asking = float(req.asking_price)
        offer = float(req.buyer_offer)

        if asking <= 0 or offer <= 0:
            return NegotiationSuggestionResponse(
                recommendation=NegotiationDecision.REJECT,
                suggested_counter_amount=None,
                discount_percentage=100.0,
                reason="Invalid non-positive pricing provided.",
                rule_version=cls.RULE_VERSION,
            )

        discount_pct = round(((asking - offer) / asking) * 100, 2)
        seller_min = float(req.seller_min_price) if req.seller_min_price else None
        market_est = float(req.estimated_market_price) if req.estimated_market_price else None

        # Condition modifiers for counter-offer aggression
        condition_counter_weights = {
            "excellent": 0.95,  # Hold firm on mint condition
            "good": 0.90,       # Standard reasonable counter
            "bad": 0.82,        # More flexible
            "defective": 0.75   # High flexibility
        }
        target_weight = condition_counter_weights.get(req.condition.lower() if req.condition else "good", 0.90)

        # Rule 1: Buyer offered full asking price or higher
        if offer >= asking:
            return NegotiationSuggestionResponse(
                recommendation=NegotiationDecision.ACCEPT,
                suggested_counter_amount=offer,
                discount_percentage=discount_pct,
                reason="The buyer's offer meets or exceeds your full asking price.",
                rule_version=cls.RULE_VERSION,
            )

        # Rule 2: Offer violates seller's explicit private minimum floor
        if seller_min and offer < seller_min:
            # If offer is far below min (more than 20% below seller min), reject outright
            if offer < (seller_min * 0.80):
                return NegotiationSuggestionResponse(
                    recommendation=NegotiationDecision.REJECT,
                    suggested_counter_amount=None,
                    discount_percentage=discount_pct,
                    reason="Offer is significantly below your acceptable threshold.",
                    rule_version=cls.RULE_VERSION,
                )
            else:
                # Suggest a counter at or slightly above seller min
                suggested = max(seller_min, round(asking * target_weight, -1))
                return NegotiationSuggestionResponse(
                    recommendation=NegotiationDecision.COUNTER,
                    suggested_counter_amount=suggested,
                    discount_percentage=discount_pct,
                    reason="Offer is below your threshold. A counteroffer near your desired range is advised.",
                    rule_version=cls.RULE_VERSION,
                )

        # Rule 3: Lowball offer (< 55% of asking)
        if offer < (asking * 0.55):
            return NegotiationSuggestionResponse(
                recommendation=NegotiationDecision.REJECT,
                suggested_counter_amount=None,
                discount_percentage=discount_pct,
                reason="The offer is a severe discount (over 45% off) compared to current market valuation.",
                rule_version=cls.RULE_VERSION,
            )

        # Rule 4: Very close to asking (within 6% discount)
        if discount_pct <= 6.0:
            return NegotiationSuggestionResponse(
                recommendation=NegotiationDecision.ACCEPT,
                suggested_counter_amount=offer,
                discount_percentage=discount_pct,
                reason="The offer is very strong (within 6% of your asking price). Accepting ensures a fast, reliable sale.",
                rule_version=cls.RULE_VERSION,
            )

        # Rule 5: Moderate discount (6% to 25% off) -> Recommend balanced counteroffer
        if discount_pct <= 25.0:
            # Split difference weighted towards asking price
            midpoint = (asking * 0.65) + (offer * 0.35)
            suggested = round(max(offer + 100, midpoint), -1)
            # Ensure it doesn't exceed asking
            suggested = min(suggested, asking)
            if seller_min:
                suggested = max(suggested, seller_min)

            return NegotiationSuggestionResponse(
                recommendation=NegotiationDecision.COUNTER,
                suggested_counter_amount=suggested,
                discount_percentage=discount_pct,
                reason=f"A {discount_pct}% discount is a viable starting point. We recommend countering to protect resale value.",
                rule_version=cls.RULE_VERSION,
            )

        # Rule 6: Heavy discount (25% to 45% off) -> Counter closer to asking or manual review
        if market_est and offer >= (market_est * 0.85):
            # Market estimate shows this is actually close to fair market value
            suggested = round(asking * target_weight, -1)
            if seller_min:
                suggested = max(suggested, seller_min)
            return NegotiationSuggestionResponse(
                recommendation=NegotiationDecision.COUNTER,
                suggested_counter_amount=suggested,
                discount_percentage=discount_pct,
                reason="The offer is below your listing price but aligns with broader secondary market trends.",
                rule_version=cls.RULE_VERSION,
            )

        # Fallback to manual review
        suggested = round(asking * target_weight, -1)
        if seller_min:
            suggested = max(suggested, seller_min)

        return NegotiationSuggestionResponse(
            recommendation=NegotiationDecision.MANUAL_REVIEW,
            suggested_counter_amount=suggested,
            discount_percentage=discount_pct,
            reason="Offer falls in a gray area. Manual evaluation recommended based on current buyer demand.",
            rule_version=cls.RULE_VERSION,
        )
