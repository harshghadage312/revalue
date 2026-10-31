import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from main import app
from app.db.connection import get_db

client = TestClient(app)


def create_user(role="buyer"):
    email = f"user_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": f"Test {role.title()}",
        "email": email,
        "password": "Password123!",
        "role": role
    })
    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    return res.json()["access_token"], res.json()["user"]["id"]


def create_sample_product(seller_token, asking_price=25000.0, city="Mumbai"):
    res = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {seller_token}"},
        json={
            "title": "OnePlus 11 5G 256GB Titan Black",
            "description": "Mint condition flagship, battery health 96%",
            "category": "smartphones",
            "brand": "OnePlus",
            "model": "11 5G",
            "condition": "excellent",
            "asking_price": asking_price,
            "currency": "INR",
            "selling_method": "negotiation",
            "location_city": city,
            "images": ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80"]
        }
    )
    return res.json()["id"]


def register_test_rider(phone_suffix=None, city="Mumbai", pincodes=None):
    if not phone_suffix:
        phone_suffix = f"{uuid.uuid4().int % 900000000 + 100000000}"
    phone = f"9{phone_suffix[:9]}"
    email = f"rider_{uuid.uuid4().hex[:8]}@revalue.market"
    pincodes = pincodes or ["400001", "400002", "400050"]

    res = client.post("/api/v1/riders/register", json={
        "name": "Rajesh Kumar Rider",
        "email": email,
        "phone": phone,
        "password": "Password123!",
        "city": city,
        "service_pincodes": pincodes,
        "vehicle_type": "bike",
        "vehicle_registration_number": "MH01AB1234",
        "driving_license_number": "DL1420110012345",
        "emergency_contact_name": "Suresh Kumar",
        "emergency_contact_phone": "9876543210"
    })
    assert res.status_code == 201
    rider_data = res.json()

    # Login rider
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    return token, rider_data["rider_id"], rider_data["user_id"]


def test_rider_registration_and_pending_approval():
    token, rider_id, user_id = register_test_rider()
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch profile: status must be pending
    prof_res = client.get("/api/v1/riders/me/profile", headers=headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["application_status"] == "pending"
    assert prof["is_online"] is False
    assert "DL-*****" in prof["driving_license_masked"]

    # Pending rider CANNOT go online (HTTP 403 Forbidden)
    status_res = client.put("/api/v1/riders/me/status", headers=headers, json={"is_online": True})
    assert status_res.status_code == 403

    # Pending rider CANNOT list available jobs (HTTP 403 Forbidden)
    jobs_res = client.get("/api/v1/riders/me/jobs/available", headers=headers)
    assert jobs_res.status_code == 403


def test_prevent_unauthorized_role_assignment():
    # Attempting to register as 'rider' through public auth endpoint must be rejected
    res = client.post("/api/v1/auth/register", json={
        "name": "Sneaky Rider",
        "email": f"hacker_{uuid.uuid4().hex[:6]}@revalue.market",
        "password": "Password123!",
        "role": "rider"
    })
    assert res.status_code == 422


def test_admin_approves_and_suspends_rider():
    admin_token, admin_id = create_user("admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    rider_token, rider_id, user_id = register_test_rider()
    rider_headers = {"Authorization": f"Bearer {rider_token}"}

    # 1. Admin approves rider
    appr_res = client.put(
        f"/api/v1/admin/riders/{rider_id}/status",
        headers=admin_headers,
        json={"status": "approved"}
    )
    assert appr_res.status_code == 200

    # Approved rider can now go online
    on_res = client.put("/api/v1/riders/me/status", headers=rider_headers, json={"is_online": True})
    assert on_res.status_code == 200
    assert on_res.json()["is_online"] is True

    # Approved rider can update location
    loc_res = client.post("/api/v1/riders/me/location", headers=rider_headers, json={
        "latitude": 18.9388,
        "longitude": 72.8354,
        "pincode": "400001"
    })
    assert loc_res.status_code == 200

    # 2. Admin suspends rider
    susp_res = client.put(
        f"/api/v1/admin/riders/{rider_id}/status",
        headers=admin_headers,
        json={"status": "suspended", "reason": "Failed periodic background audit"}
    )
    assert susp_res.status_code == 200

    # Suspended rider cannot go online
    fail_res = client.put("/api/v1/riders/me/status", headers=rider_headers, json={"is_online": True})
    assert fail_res.status_code == 403


def test_service_area_management():
    admin_token, admin_id = create_user("admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create new service area
    res = client.post(
        "/api/v1/admin/service-areas",
        headers=admin_headers,
        json={
            "city": "Mumbai",
            "name": "South Mumbai Cluster",
            "pincodes": ["400001", "400002", "400003", "400005"],
            "is_active": True,
            "base_fare": 75.0,
            "per_km_rate": 12.0,
            "handling_fee": 25.0,
            "max_weight_kg": 5.0
        }
    )
    assert res.status_code == 201
    area = res.json()
    area_id = area["id"]
    assert area["city"] == "Mumbai"

    # List service areas
    list_res = client.get("/api/v1/admin/service-areas", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(a["id"] == area_id for a in list_res.json())

    # Update service area
    up_res = client.put(
        f"/api/v1/admin/service-areas/{area_id}",
        headers=admin_headers,
        json={"base_fare": 80.0}
    )
    assert up_res.status_code == 200
    assert up_res.json()["base_fare"] == 80.0


def test_hybrid_routing_local_vs_courier():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    admin_token, admin_id = create_user("admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    prod_id = create_sample_product(seller_token, asking_price=20000.0, city="Pune")

    # Ensure a service area exists for Ahmedabad
    client.post(
        "/api/v1/admin/service-areas",
        headers=admin_headers,
        json={
            "city": "Pune",
            "name": "Kothrud & Shivajinagar",
            "pincodes": ["411001", "411002"],
            "is_active": True,
            "base_fare": 70.0,
            "handling_fee": 25.0
        }
    )

    # 1. Onboard and approve a rider in Ahmedabad
    rider_token, rider_id, _ = register_test_rider(city="Pune", pincodes=["411001", "411002"])
    client.put(f"/api/v1/admin/riders/{rider_id}/status", headers=admin_headers, json={"status": "approved"})

    # Case A: Ensure all riders for test PIN code are OFFLINE for test isolation
    db = get_db()
    db.rider_profiles.update_many({"service_pincodes": "411001"}, {"$set": {"is_online": False}})
    client.put("/api/v1/riders/me/status", headers={"Authorization": f"Bearer {rider_token}"}, json={"is_online": False})
    quote_res = client.post("/api/v1/orders/shipping/quotes", json={
        "product_id": prod_id,
        "delivery_pincode": "411001",
        "is_cod": False
    })
    assert quote_res.status_code == 200
    data = quote_res.json()
    assert not any(q["courier_id"] == "revalue_local_direct" for q in data["quotes"])

    # Case B: Rider goes ONLINE -> ReValue Local Delivery IS AVAILABLE!
    client.put("/api/v1/riders/me/status", headers={"Authorization": f"Bearer {rider_token}"}, json={"is_online": True})
    quote_res2 = client.post("/api/v1/orders/shipping/quotes", json={
        "product_id": prod_id,
        "delivery_pincode": "411001",
        "is_cod": False
    })
    assert quote_res2.status_code == 200
    data2 = quote_res2.json()
    assert any(q["courier_id"] == "revalue_local_direct" for q in data2["quotes"])
    local_quote = next(q for q in data2["quotes"] if q["courier_id"] == "revalue_local_direct")
    assert local_quote["rate"] > 0
    assert local_quote["service_type"] == "local_rider"
    assert local_quote["service_type"] == "local_rider"


def test_atomic_job_assignment_concurrency():
    admin_token, admin_id = create_user("admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")

    # Onboard two separate approved online riders in Mumbai
    r1_token, r1_id, _ = register_test_rider(city="Mumbai", pincodes=["400001"])
    r2_token, r2_id, _ = register_test_rider(city="Mumbai", pincodes=["400001"])

    client.put(f"/api/v1/admin/riders/{r1_id}/status", headers=admin_headers, json={"status": "approved"})
    client.put(f"/api/v1/admin/riders/{r2_id}/status", headers=admin_headers, json={"status": "approved"})

    client.put("/api/v1/riders/me/status", headers={"Authorization": f"Bearer {r1_token}"}, json={"is_online": True})
    client.put("/api/v1/riders/me/status", headers={"Authorization": f"Bearer {r2_token}"}, json={"is_online": True})

    # Create local delivery order
    prod_id = create_sample_product(seller_token, asking_price=18000.0, city="Mumbai")
    order_res = client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "product_id": prod_id,
            "purchase_source": "buy_now",
            "payment_method": "prepaid",
            "delivery_method": "revalue_local",
            "courier_id": "revalue_local_direct",
            "shipping_address": {
                "full_name": "Local Buyer",
                "street": "10 Nariman Point",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "phone": "9876543210"
            }
        }
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["order_id"]
    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock_atom", "razorpay", 18000.0)

    # Seller books local shipment
    book_res = client.post(
        f"/api/v1/orders/{order_id}/shipment/book",
        headers={"Authorization": f"Bearer {seller_token}"},
        json={"courier_id": "revalue_local_direct"}
    )
    assert book_res.status_code == 200
    job_id = book_res.json()["shipment_id"]

    # Rider 1 and Rider 2 both see the available job
    r1_jobs = client.get("/api/v1/riders/me/jobs/available", headers={"Authorization": f"Bearer {r1_token}"}).json()
    assert any(j["id"] == job_id for j in r1_jobs)

    # Rider 1 accepts first -> SUCCEEDS (200 OK)
    acc1 = client.post(f"/api/v1/riders/me/jobs/{job_id}/accept", headers={"Authorization": f"Bearer {r1_token}"})
    assert acc1.status_code == 200
    assert acc1.json()["assigned_rider_id"] == r1_id

    # Rider 2 tries to accept the same job -> REJECTED (409 Conflict)
    acc2 = client.post(f"/api/v1/riders/me/jobs/{job_id}/accept", headers={"Authorization": f"Bearer {r2_token}"})
    assert acc2.status_code == 409


def test_full_local_delivery_lifecycle_and_doorstep_otp():
    admin_token, admin_id = create_user("admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")

    rider_token, rider_id, _ = register_test_rider(city="Mumbai", pincodes=["400001"])
    client.put(f"/api/v1/admin/riders/{rider_id}/status", headers=admin_headers, json={"status": "approved"})
    client.put("/api/v1/riders/me/status", headers={"Authorization": f"Bearer {rider_token}"}, json={"is_online": True})
    rider_headers = {"Authorization": f"Bearer {rider_token}"}

    # Order creation
    prod_id = create_sample_product(seller_token, asking_price=22000.0, city="Mumbai")
    order_res = client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "product_id": prod_id,
            "purchase_source": "buy_now",
            "payment_method": "prepaid",
            "delivery_method": "revalue_local",
            "courier_id": "revalue_local_direct",
            "shipping_address": {
                "full_name": "Buyer Anita",
                "street": "24 Cuffe Parade",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "phone": "9812345678"
            }
        }
    )
    order_id = order_res.json()["order_id"]
    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock_atom", "razorpay", 18000.0)

    # Seller books local shipment
    book_res = client.post(
        f"/api/v1/orders/{order_id}/shipment/book",
        headers={"Authorization": f"Bearer {seller_token}"},
        json={"courier_id": "revalue_local_direct"}
    )
    job_id = book_res.json()["shipment_id"]

    # 1. Rider accepts job
    client.post(f"/api/v1/riders/me/jobs/{job_id}/accept", headers=rider_headers)

    # 2. Rider marks arrived at pickup
    arr_res = client.post(f"/api/v1/riders/me/jobs/{job_id}/arrived-pickup", headers=rider_headers)
    assert arr_res.status_code == 200
    assert arr_res.json()["status"] == "arriving_at_pickup"

    # 3. Rider confirms pickup handover with seller
    pick_res = client.post(f"/api/v1/riders/me/jobs/{job_id}/pickup", headers=rider_headers, json={
        "notes": "Verified smartphone box tamper seal intact."
    })
    assert pick_res.status_code == 200
    assert pick_res.json()["status"] == "picked_up"

    # Buyer checks tracking to see their masked/unmasked OTP
    track_res = client.get(f"/api/v1/orders/{order_id}/tracking", headers={"Authorization": f"Bearer {buyer_token}"})
    assert track_res.status_code == 200
    track_data = track_res.json()
    buyer_otp = track_data["buyer_delivery_otp"]
    assert buyer_otp is not None
    assert len(buyer_otp) == 6

    # 4. Rider starts delivery (out for delivery)
    out_res = client.post(f"/api/v1/riders/me/jobs/{job_id}/start-delivery", headers=rider_headers)
    assert out_res.status_code == 200
    assert out_res.json()["status"] == "out_for_delivery"

    # 5. Doorstep OTP Verification
    # Incorrect OTP rejected (HTTP 422)
    bad_otp_res = client.post(
        f"/api/v1/riders/me/jobs/{job_id}/verify-delivery-otp",
        headers=rider_headers,
        json={"entered_otp": "000000"}
    )
    assert bad_otp_res.status_code == 422

    # Correct OTP accepted!
    good_otp_res = client.post(
        f"/api/v1/riders/me/jobs/{job_id}/verify-delivery-otp",
        headers=rider_headers,
        json={"entered_otp": buyer_otp, "notes": "Handed over to buyer Anita"}
    )
    assert good_otp_res.status_code == 200
    assert good_otp_res.json()["status"] == "delivered"
    assert good_otp_res.json()["compensation"]["payout_status"] == "eligible"

    # 6. Verify Rider Earnings Ledger
    earn_res = client.get("/api/v1/riders/me/earnings", headers=rider_headers)
    assert earn_res.status_code == 200
    earn_data = earn_res.json()
    assert earn_data["total_deliveries_completed"] >= 1
    assert earn_data["eligible_for_payout_inr"] > 0

    # 7. Admin Reconciles Compensation Payout
    comp_ledger = client.get("/api/v1/admin/riders/compensation/ledger", headers=admin_headers)
    assert comp_ledger.status_code == 200
    assert any(c["job_id"] == job_id for c in comp_ledger.json())

    payout_res = client.put(
        f"/api/v1/admin/riders/compensation/{job_id}/payout",
        headers=admin_headers,
        json={"payout_status": "paid", "payout_reference": "UTR-RAZORPAY-123456"}
    )
    assert payout_res.status_code == 200
    assert payout_res.json()["compensation"]["payout_status"] == "paid"
