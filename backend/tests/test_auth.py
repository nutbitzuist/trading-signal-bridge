"""
Tests for authentication endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, user_data: dict):
    """Test user registration."""
    response = await client.post("/api/v1/auth/register", json=user_data)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert "webhook_secret" in data
    assert len(data["webhook_secret"]) == 64
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, user_data: dict):
    """Test registration with duplicate email."""
    # Register first user
    await client.post("/api/v1/auth/register", json=user_data)

    # Try to register again
    response = await client.post("/api/v1/auth/register", json=user_data)

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    """Test registration with weak password."""
    user_data = {
        "email": "test@example.com",
        "password": "weak",  # Too short, no uppercase, no number
    }

    response = await client.post("/api/v1/auth/register", json=user_data)

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, user_data: dict):
    """Test successful login."""
    # Register first
    await client.post("/api/v1/auth/register", json=user_data)

    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, user_data: dict):
    """Test login with invalid password."""
    # Register first
    await client.post("/api/v1/auth/register", json=user_data)

    # Login with wrong password
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": "WrongPass123"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with nonexistent user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "TestPass123"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, user_data: dict):
    """Test getting current user info."""
    # Register and login
    await client.post("/api/v1/auth/register", json=user_data)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )
    token = login_response.json()["access_token"]

    # Get user info
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]


@pytest.mark.asyncio
async def test_get_current_user_no_token(client: AsyncClient):
    """Test getting current user without token."""
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, user_data: dict):
    """Test token refresh."""
    # Register and login
    await client.post("/api/v1/auth/register", json=user_data)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )
    refresh_token = login_response.json()["refresh_token"]

    # Refresh token
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
