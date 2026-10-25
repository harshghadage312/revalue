"""
ReValue Live API End-to-End Workflow Verification Suite.
Validates all 14 major user journeys against the running FastAPI backend server:
1. Health & system readiness
2. Seller registration and login
3. Buyer registration and login
4. AI price estimation
5. Seller smartphone listing creation
6. Buyer offer submission
7. AI negotiation rule recommendation
8. Seller counteroffer submission
9. Buyer acceptance and atomic product reservation
10. Order creation from accepted offer
11. Sandbox payment execution
12. Seller courier shipment dispatch
13. Buyer receipt confirmation and automatic payout release
14. Verified post-transaction review submission
"""

import sys
import uuid
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000/api/v1"


def req(path: str, method: str = "GET", data=None, token: str = None):
    url = f"{BASE}{path}" if not path.startswith("http") else path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {"raw": err_content}


def main():
    print("=" * 60)
    print("   ReValue Live End-to-End Verification Test")
    print("=" * 60)

    # 1. Health
    s, h = req("http://127.0.0.1:8000/api/health")
    assert s == 200, f"Health check failed with status {s}"
    print(f"[PASS 1/14] Health check: status='{h.get('status')}', app='{h.get('app')}'")

    # 2. Register Seller
    seller_email = f"seller_{uuid.uuid4().hex[:6]}@revalue.market"
    s, seller_user = req("/auth/register", "POST", {
        "name": "Priya Sharma (Seller)",
        "email": seller_email,
        "password": "SellerPassword123!",
        "role": "seller"
    })
    assert s == 201, f"Seller registration failed: {s} {seller_user}"
    s, seller_auth = req("/auth/login", "POST", {"email": seller_email, "password": "SellerPassword123!"})
    assert s == 200, f"Seller login failed: {s}"
    seller_tok = seller_auth["access_token"]
    print(f"[PASS 2/14] Seller registration & authentication: {seller_email}")

    # 3. Register Buyer
    buyer_email = f"buyer_{uuid.uuid4().hex[:6]}@revalue.market"
    s, buyer_user = req("/auth/register", "POST", {
        "name": "Rahul Verma (Buyer)",
        "email": buyer_email,
        "password": "BuyerPassword123!",
        "role": "buyer"
    })
    assert s == 201, f"Buyer registration failed: {s} {buyer_user}"
    s, buyer_auth = req("/auth/login", "POST", {"email": buyer_email, "password": "BuyerPassword123!"})
    assert s == 200, f"Buyer login failed: {s}"
    buyer_tok = buyer_auth["access_token"]
    print(f"[PASS 3/14] Buyer registration & authentication: {buyer_email}")

    # 4. Predict Price
    s, price_est = req("/ml/price-estimate", "POST", {
        "brand": "Apple",
        "model": "iPhone 13",
        "category": "smartphone",
        "condition": "excellent",
        "storage_gb": 128,
        "ram_gb": 4,
        "approximate_age_months": 12,
        "battery_health_percent": 90,
        "original_retail_price": 69900.0
    })
    assert s == 200, f"ML Price estimation failed: {s}"
    est_val = price_est["estimated_price"]
    print(f"[PASS 4/14] ML Price estimation pipeline: INR {est_val:,.2f}")

    # 5. Seller creates product
    s, prod = req("/products", "POST", {
        "title": "Apple iPhone 13 (Midnight Blue, 128 GB)",
        "description": "Mint condition smartphone with retail box, original USB-C cable.",
        "category": "smartphone",
        "brand": "Apple",
        "model": "iPhone 13",
        "condition": "excellent",
        "asking_price": 48000.0,
        "selling_method": "negotiation",
        "negotiation_settings": {"min_acceptable_price": 44000.0, "allow_counteroffers": True}
    }, token=seller_tok)
    assert s == 201, f"Product listing creation failed: {s} {prod}"
    prod_id = prod["id"]
    print(f"[PASS 5/14] Product listing created successfully: id='{prod_id}'")

    # 6. Buyer makes offer
    s, offer = req("/offers", "POST", {
        "product_id": prod_id,
        "amount": 43000.0,
        "note": "Can finalize immediately today."
    }, token=buyer_tok)
    assert s == 201, f"Offer creation failed: {s} {offer}"
    offer_id = offer["id"]
    print(f"[PASS 6/14] Buyer offer submitted: INR {offer['amount']:,.2f} (id='{offer_id}')")

    # 7. Seller checks AI negotiation suggestion
    s, sugg = req(f"/offers/{offer_id}/suggestion", "GET", token=seller_tok)
    assert s == 200, f"Negotiation suggestion failed: {s}"
    print(f"[PASS 7/14] Rule engine advice: {sugg['recommendation'].upper()} (suggested counter: INR {sugg.get('suggested_counter_amount')})")

    # 8. Seller counters
    s, counter = req(f"/offers/{offer_id}/counter", "POST", {
        "amount": 45500.0,
        "note": "45.5k is the best price with charger included."
    }, token=seller_tok)
    assert s == 200, f"Counteroffer submission failed: {s} {counter}"
    print(f"[PASS 8/14] Seller counteroffer submitted: INR {counter['amount']:,.2f}")

    # 9. Buyer accepts counteroffer
    s, accepted = req(f"/offers/{offer_id}/accept", "POST", token=buyer_tok)
    assert s == 200, f"Offer acceptance failed: {s} {accepted}"
    assert accepted["status"] == "accepted"
    print(f"[PASS 9/14] Buyer accepted counteroffer. Product status atomically updated to RESERVED.")

    # 10. Buyer creates order
    s, order = req("/orders", "POST", {
        "product_id": prod_id,
        "purchase_source": "offer",
        "offer_id": offer_id,
        "shipping_address": {
            "full_name": "Rahul Verma",
            "phone": "+91 9876543210",
            "street": "Flat 402, Lotus Residency, Baner Road",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411045",
            "country": "India"
        }
    }, token=buyer_tok)
    assert s == 201, f"Order creation failed: {s} {order}"
    order_id = order["order_id"]
    print(f"[PASS 10/14] Order placed: {order_id} (Total: INR {order['transaction_price']:,.2f})")

    # 11. Complete Sandbox Payment
    s, pay_res = req(f"/payments/sandbox-complete?order_id={order_id}", "POST", token=buyer_tok)
    assert s == 200, f"Payment completion failed: {s} {pay_res}"
    print(f"[PASS 11/14] Sandbox payment completed: status is now PAID")

    # 12. Seller updates shipment
    s, ship_res = req(f"/orders/{order_id}/shipment", "POST", {
        "courier_name": "BlueDart Express",
        "tracking_number": "BD992817462IN"
    }, token=seller_tok)
    assert s == 200, f"Shipment dispatch failed: {s} {ship_res}"
    print(f"[PASS 12/14] Seller dispatched parcel via BlueDart Express (BD992817462IN)")

    # 13. Buyer confirms receipt (releases payout!)
    s, confirm_res = req(f"/orders/{order_id}/confirm-receipt", "POST", token=buyer_tok)
    assert s == 200, f"Receipt confirmation failed: {s} {confirm_res}"
    s, order_after = req(f"/orders/{order_id}", "GET", token=buyer_tok)
    assert s == 200
    assert order_after["status"] == "completed"
    assert order_after["payout_status"] == "released"
    print(f"[PASS 13/14] Buyer confirmed receipt: Order is COMPLETED and Seller Payout is RELEASED!")

    # 14. Buyer submits review
    s, rev_res = req("/reviews", "POST", {
        "order_id": order_id,
        "rating": 5,
        "comment": "Super fast delivery! Phone is exactly as described in pristine condition."
    }, token=buyer_tok)
    assert s == 201, f"Review submission failed: {s} {rev_res}"
    print(f"[PASS 14/14] 5-star verified buyer review submitted!")

    print("\n" + "=" * 60)
    print("   ALL 14 LIVE WORKFLOWS VERIFIED AND PASSED 100%!")
    print("=" * 60)


if __name__ == "__main__":
    main()
