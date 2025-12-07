"""
Tests for webhook endpoints.
"""
import pytest
from httpx import AsyncClient


async def create_user_with_account(client: AsyncClient, user_data: dict, account_data: dict) -> tuple:
    """Helper to create user and account, return (token, webhook_secret, api_key)."""
    # Register
    register_response = await client.post("/api/v1/auth/register", json=user_data)
    webhook_secret = register_response.json()["webhook_secret"]

    # Login
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )
    token = login_response.json()["access_token"]

    # Create account
    account_response = await client.post(
        "/api/v1/accounts",
        json=account_data,
        headers={"Authorization": f"Bearer {token}"},
    )
    api_key = account_response.json()["api_key"]

    return token, webhook_secret, api_key


@pytest.mark.asyncio
async def test_webhook_success(client: AsyncClient, user_data: dict, account_data: dict, webhook_payload: dict):
    """Test successful webhook processing."""
    token, webhook_secret, api_key = await create_user_with_account(client, user_data, account_data)

    # Send webhook with correct secret
    webhook_payload["secret"] = webhook_secret

    response = await client.post("/api/v1/webhook/tradingview", json=webhook_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["signals_created"] >= 1


@pytest.mark.asyncio
async def test_webhook_invalid_secret(client: AsyncClient, webhook_payload: dict):
    """Test webhook with invalid secret."""
    webhook_payload["secret"] = "invalid-secret"

    response = await client.post("/api/v1/webhook/tradingview", json=webhook_payload)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_invalid_action(client: AsyncClient, user_data: dict, account_data: dict, webhook_payload: dict):
    """Test webhook with invalid action."""
    token, webhook_secret, api_key = await create_user_with_account(client, user_data, account_data)

    webhook_payload["secret"] = webhook_secret
    webhook_payload["action"] = "invalid_action"

    response = await client.post("/api/v1/webhook/tradingview", json=webhook_payload)

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_webhook_all_actions(client: AsyncClient, user_data: dict, account_data: dict, webhook_payload: dict):
    """Test webhook with all valid actions."""
    token, webhook_secret, api_key = await create_user_with_account(client, user_data, account_data)

    actions = ["buy", "sell", "buy_limit", "sell_limit", "buy_stop", "sell_stop", "close", "close_partial", "modify"]

    for action in actions:
        payload = {
            "secret": webhook_secret,
            "symbol": "XAUUSD",
            "action": action,
            "order_type": "limit" if "limit" in action or "stop" in action else "market",
            "price": 2000.00 if "limit" in action or "stop" in action else None,
        }

        response = await client.post("/api/v1/webhook/tradingview", json=payload)

        assert response.status_code == 200, f"Failed for action: {action}"


@pytest.mark.asyncio
async def test_webhook_no_active_accounts(client: AsyncClient, user_data: dict, account_data: dict, webhook_payload: dict):
    """Test webhook when user has no active accounts."""
    token, webhook_secret, api_key = await create_user_with_account(client, user_data, account_data)

    # Disable the account
    accounts_response = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {token}"},
    )
    account_id = accounts_response.json()["accounts"][0]["id"]

    await client.put(
        f"/api/v1/accounts/{account_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Send webhook
    webhook_payload["secret"] = webhook_secret

    response = await client.post("/api/v1/webhook/tradingview", json=webhook_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["signals_created"] == 0
