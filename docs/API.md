# API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### Register

```http
POST /auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "John Doe"
}
```

**Response (201):**
```json
{
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "webhook_secret": "64-char-hex-string",
    "is_active": true,
    "is_admin": false,
    "settings": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "SecurePass123"
}
```

**Response (200):**
```json
{
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600
}
```

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
    "refresh_token": "eyJ..."
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

---

### Webhook

#### Receive TradingView Webhook

```http
POST /webhook/tradingview
Content-Type: application/json

{
    "secret": "user-webhook-secret",
    "account_id": "optional-uuid",
    "symbol": "XAUUSD",
    "action": "buy",
    "order_type": "market",
    "quantity": 0.1,
    "price": null,
    "take_profit": 2050.00,
    "stop_loss": 2020.00,
    "comment": "EMA_Cross"
}
```

**Response (200):**
```json
{
    "success": true,
    "signal_id": "uuid",
    "message": "Signal queued for 2 account(s)",
    "signals_created": 2
}
```

**Webhook Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| secret | string | Yes | User's webhook secret |
| account_id | uuid | No | Route to specific account (if not set, all active accounts) |
| symbol | string | Yes | Trading symbol |
| action | string | Yes | buy, sell, buy_limit, buy_stop, sell_limit, sell_stop, close, close_partial, modify |
| order_type | string | No | market (default), limit, stop |
| quantity | decimal | No | Lot size |
| price | decimal | No | Entry price (required for limit/stop orders) |
| take_profit | decimal | No | Take profit price |
| stop_loss | decimal | No | Stop loss price |
| comment | string | No | Order comment (max 255 chars) |

---

### Signals (EA Polling)

#### Get Pending Signals

```http
GET /signals/pending?api_key=<mt-account-api-key>
```

**Response (200):**
```json
{
    "signals": [
        {
            "id": "uuid",
            "symbol": "GOLD",
            "action": "buy",
            "order_type": "market",
            "quantity": 0.1,
            "price": null,
            "take_profit": 2050.00,
            "stop_loss": 2020.00,
            "comment": "EMA_Cross"
        }
    ],
    "server_time": "2024-01-01T10:00:00Z"
}
```

#### Report Signal Result

```http
POST /signals/{signal_id}/result?api_key=<mt-account-api-key>
Content-Type: application/json

{
    "success": true,
    "ticket": 123456789,
    "executed_price": 2035.50,
    "executed_quantity": 0.1,
    "execution_time_ms": 45,
    "error_code": 0,
    "error_message": null
}
```

---

### Signals (Dashboard)

#### List Signals

```http
GET /signals?account_id=uuid&status=executed&symbol=XAUUSD&page=1&per_page=50
Authorization: Bearer <token>
```

**Response (200):**
```json
{
    "signals": [...],
    "total": 100,
    "page": 1,
    "per_page": 50,
    "pages": 2
}
```

#### Get Signal Details

```http
GET /signals/{signal_id}
Authorization: Bearer <token>
```

#### Cancel Signal

```http
DELETE /signals/{signal_id}
Authorization: Bearer <token>
```

#### Export Signals to CSV

```http
GET /signals/export?status=executed&from_date=2024-01-01
Authorization: Bearer <token>
```

Returns CSV file download.

---

### Accounts

#### List Accounts

```http
GET /accounts
Authorization: Bearer <token>
```

**Response (200):**
```json
{
    "accounts": [
        {
            "id": "uuid",
            "user_id": "uuid",
            "name": "My Account",
            "broker": "IC Markets",
            "account_number": "123456",
            "platform": "mt4",
            "is_active": true,
            "last_connected_at": "2024-01-01T10:00:00Z",
            "settings": {},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ],
    "total": 1
}
```

#### Create Account

```http
POST /accounts
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "My Account",
    "broker": "IC Markets",
    "account_number": "123456",
    "platform": "mt4"
}
```

**Response (201):** Returns account with `api_key` (shown only once).

#### Update Account

```http
PUT /accounts/{account_id}
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Updated Name",
    "is_active": false
}
```

#### Delete Account

```http
DELETE /accounts/{account_id}
Authorization: Bearer <token>
```

#### Regenerate API Key

```http
POST /accounts/{account_id}/regenerate-key
Authorization: Bearer <token>
```

**Response:** Returns account with new `api_key`.

---

### Symbol Mappings

#### List Symbol Mappings

```http
GET /accounts/{account_id}/symbols
Authorization: Bearer <token>
```

#### Create Symbol Mapping

```http
POST /accounts/{account_id}/symbols
Authorization: Bearer <token>
Content-Type: application/json

{
    "tradingview_symbol": "XAUUSD",
    "mt_symbol": "GOLD",
    "lot_multiplier": 1.0
}
```

#### Update Symbol Mapping

```http
PUT /accounts/{account_id}/symbols/{symbol_id}
Authorization: Bearer <token>
Content-Type: application/json

{
    "mt_symbol": "GOLD.ecn",
    "lot_multiplier": 0.1
}
```

#### Delete Symbol Mapping

```http
DELETE /accounts/{account_id}/symbols/{symbol_id}
Authorization: Bearer <token>
```

---

### Dashboard

#### Get Statistics

```http
GET /dashboard/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
    "accounts": {
        "total": 3,
        "active": 2
    },
    "signals": {
        "today": 15,
        "week": 87,
        "month": 342,
        "status_breakdown": {
            "pending": 2,
            "sent": 0,
            "executed": 280,
            "failed": 45,
            "expired": 10,
            "cancelled": 5
        },
        "success_rate": 86.2
    },
    "top_symbols": [
        {"symbol": "XAUUSD", "count": 150},
        {"symbol": "EURUSD", "count": 92}
    ],
    "recent_signals": [...]
}
```

---

### System

#### Health Check

```http
GET /health
```

**Response (200):**
```json
{
    "status": "healthy",
    "timestamp": "2024-01-01T10:00:00Z"
}
```

#### Kill Switch (Admin Only)

```http
POST /system/kill-switch
Authorization: Bearer <admin_token>
```

Cancels all pending signals immediately.

---

## Error Responses

All errors follow this format:

```json
{
    "detail": "Error message here"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid credentials/token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 422 | Unprocessable Entity (validation error) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/webhook/tradingview` | 100 requests/minute |
| `/signals/pending` | 60 requests/minute |
| Other endpoints | 1000 requests/minute |
