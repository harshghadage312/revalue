import pytest
import uuid
from starlette.testclient import TestClient
from app.db.connection import DatabaseManager
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    DatabaseManager.connect(force_memory=True)


def test_user_registration_success():
    email = f"test_{uuid.uuid4().hex[:8]}@revalue.market"
    payload = {
        "name": "Arjun Patel",
        "email": email,
        "password": "Password123!",
        "role": "buyer"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == email
    assert data["name"] == "Arjun Patel"
    assert data["role"] == "buyer"
    assert "password" not in data
    assert "password_hash" not in data


def test_user_registration_duplicate_email():
    email = f"dup_{uuid.uuid4().hex[:8]}@revalue.market"
    payload = {
        "name": "Duplicate User",
        "email": email,
        "password": "Password123!",
        "role": "buyer"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "CONFLICT"


def test_user_login_success():
    email = f"login_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": "Login Tester",
        "email": email,
        "password": "CorrectPassword123!",
        "role": "seller"
    })

    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "CorrectPassword123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "Bearer"
    assert data["user"]["email"] == email


def test_user_login_invalid_password():
    email = f"invalid_pw_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": "Password Tester",
        "email": email,
        "password": "RealPassword123!",
        "role": "buyer"
    })

    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword999!"
    })
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_token_refresh_rotation():
    email = f"refresh_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": "Refresh Tester",
        "email": email,
        "password": "Password123!",
        "role": "buyer"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    }).json()

    refresh_token = login_res["refresh_token"]

    # 1. Refresh succeeds with valid refresh token
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    new_tokens = ref_res.json()
    assert "access_token" in new_tokens
    assert new_tokens["refresh_token"] != refresh_token

    # 2. Reusing old revoked refresh token fails (Rotation protection)
    reused_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reused_res.status_code == 401


def test_protected_route_me():
    email = f"me_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": "Me Tester",
        "email": email,
        "password": "Password123!",
        "role": "seller"
    })
    login_data = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    }).json()

    token = login_data["access_token"]
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == email


def test_password_reset_workflow():
    email = f"pw_reset_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": "Reset Tester",
        "email": email,
        "password": "OldPassword123!",
        "role": "buyer"
    })

    # Request reset
    req_res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert req_res.status_code == 200
    token = req_res.json().get("dev_reset_token")
    assert token is not None

    # Reset password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "BrandNewPassword123!"
    })
    assert reset_res.status_code == 200

    # Old password fails
    fail_res = client.post("/api/v1/auth/login", json={"email": email, "password": "OldPassword123!"})
    assert fail_res.status_code == 401

    # New password succeeds
    ok_res = client.post("/api/v1/auth/login", json={"email": email, "password": "BrandNewPassword123!"})
    assert ok_res.status_code == 200


def test_docs_redirect():
    res = client.get("/docs", follow_redirects=False)
    assert res.status_code in [307, 308]
    assert res.headers["location"] == "/api/docs"


def test_production_database_safety():
    from app.core.config import settings
    original_env = settings.ENVIRONMENT
    original_uri = settings.MONGODB_URI
    try:
        settings.ENVIRONMENT = "production"
        settings.MONGODB_URI = "mongodb://invalid-host-that-does-not-exist:27017"
        settings.MONGODB_TIMEOUT_MS = 50
        with pytest.raises(RuntimeError) as exc_info:
            DatabaseManager.connect(force_memory=False)
        assert "In-memory fallback is strictly disabled in production" in str(exc_info.value)
    finally:
        settings.ENVIRONMENT = original_env
        settings.MONGODB_URI = original_uri
        settings.MONGODB_TIMEOUT_MS = 2000
        DatabaseManager.connect(force_memory=True)


def test_production_settings_validation():
    from app.core.config import Settings
    # Production with default dev key must raise ValueError
    with pytest.raises(ValueError) as exc:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="revalue_local_development_secret_key_8f39b2e1a4c7d0e5f2a8b9c1d3e7f0a2"
        )
    assert "In production mode, JWT_SECRET_KEY must be a cryptographically strong unique secret" in str(exc.value)
