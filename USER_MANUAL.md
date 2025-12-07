# Trading Signal Bridge - User Manual

A complete guide to setting up and using the Trading Signal Bridge system to automatically execute TradingView alerts on your MetaTrader 4/5 trading accounts.

---

## Table of Contents

1. [What is Trading Signal Bridge?](#1-what-is-trading-signal-bridge)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Creating Your Account](#3-creating-your-account)
4. [Setting Up MT Accounts](#4-setting-up-mt-accounts)
5. [Installing the Expert Advisor](#5-installing-the-expert-advisor)
6. [Configuring TradingView Alerts](#6-configuring-tradingview-alerts)
7. [Using the Dashboard](#7-using-the-dashboard)
8. [Managing Signals](#8-managing-signals)
9. [Symbol Mappings](#9-symbol-mappings)
10. [Admin Features](#10-admin-features)
11. [Troubleshooting](#11-troubleshooting)
12. [Self-Hosting Guide](#12-self-hosting-guide)

---

## 1. What is Trading Signal Bridge?

Trading Signal Bridge connects your TradingView alerts to your MetaTrader 4 or MetaTrader 5 trading platform. When your TradingView strategy generates an alert, it's automatically sent to your MT4/MT5 for execution.

### How It Works

```
TradingView Alert → Signal Bridge Server → MetaTrader EA → Trade Executed
```

1. Your TradingView strategy triggers an alert
2. The alert is sent as a webhook to Signal Bridge
3. Signal Bridge queues the signal for your MT account
4. The Expert Advisor (EA) running in MetaTrader polls for new signals
5. The EA executes the trade and reports the result

### Features

- **Real-time execution** - Signals are delivered within seconds
- **Multiple accounts** - Connect multiple MT4/MT5 accounts
- **Symbol mapping** - Map TradingView symbols to your broker's symbols
- **Dashboard** - Monitor all your signals and accounts
- **Secure** - API key authentication, no password sharing

---

## 2. Quick Start Guide

Follow these steps to get started in under 10 minutes:

### Step 1: Create Your Account
1. Go to https://tv2mt.vercel.app
2. Click "Register" and create an account
3. Log in to access your dashboard

### Step 2: Add an MT Account
1. Go to **Accounts** page
2. Click **Add Account**
3. Enter your account details and select MT4 or MT5
4. **Copy the API Key** (shown only once!)

### Step 3: Install the EA
1. Go to **EA Download** page
2. Download the EA for your platform (MT4 or MT5)
3. Install in your MetaTrader (see Section 5)
4. Enter your Server URL and API Key

### Step 4: Configure TradingView
1. Go to **Settings** page
2. Copy your **Webhook URL**
3. Create an alert in TradingView and paste the webhook URL
4. Set the message format (see Section 6)

### Step 5: Test It
1. Trigger a test alert in TradingView
2. Check your MetaTrader - the trade should execute
3. View the signal status in your dashboard

---

## 3. Creating Your Account

### Registration

1. Visit the application at https://tv2mt.vercel.app
2. Click **Register** in the navigation
3. Fill in the registration form:
   - **Email**: Your email address (used for login)
   - **Password**: Minimum 8 characters, must include uppercase, lowercase, and number
   - **Full Name**: Optional, for display purposes

4. Click **Register**
5. You'll be automatically logged in

### Login

1. Visit https://tv2mt.vercel.app/auth/login
2. Enter your email and password
3. Click **Login**

### Your Webhook Secret

After registration, you receive a unique **Webhook Secret**. This is used to authenticate TradingView webhooks.

- Find it on the **Settings** page
- Keep it private - anyone with this secret can send signals
- You can regenerate it if compromised (invalidates old alerts)

---

## 4. Setting Up MT Accounts

Each MT4/MT5 account you want to receive signals needs to be registered in Signal Bridge.

### Adding a New Account

1. Go to **Accounts** page
2. Click the **Add Account** button
3. Fill in the form:

| Field | Description | Example |
|-------|-------------|---------|
| Account Name | A friendly name for this account | "Main Trading Account" |
| Broker | Your broker's name | "ICMarkets" |
| Account Number | Your MT account number | "12345678" |
| Platform | MT4 or MT5 | MT5 |

4. Click **Create Account**

### Important: Save Your API Key!

After creating the account, you'll see your **API Key**. This key is:
- Shown **only once** - copy it immediately!
- Required to configure the EA
- Unique to this account

If you lose it, you can regenerate a new one (but must update your EA).

### Managing Accounts

On the Accounts page, you can:
- **Toggle Active/Inactive**: Only active accounts receive signals
- **Regenerate API Key**: Creates a new key (update your EA)
- **Delete Account**: Permanently removes the account and its signal history

---

## 5. Installing the Expert Advisor

The Expert Advisor (EA) is a program that runs inside MetaTrader and executes your signals.

### Downloading the EA

1. Log in to Signal Bridge
2. Go to **EA Download** page
3. Click **Download for MT4** or **Download for MT5**

### Installing on MetaTrader 4

1. **Open MetaTrader 4**

2. **Open Data Folder**
   - Click `File` → `Open Data Folder`
   - Navigate to `MQL4` → `Experts`

3. **Copy the EA File**
   - Paste `SignalBridge.mq4` into the `Experts` folder

4. **Compile the EA** (Optional but recommended)
   - Press `F4` to open MetaEditor
   - Open the `SignalBridge.mq4` file
   - Press `F7` to compile
   - Close MetaEditor

5. **Refresh Navigator**
   - In MT4, find the `Navigator` panel (Ctrl+N if hidden)
   - Right-click `Expert Advisors`
   - Click `Refresh`
   - You should see `SignalBridge` in the list

6. **Enable Automated Trading**
   - Click `Tools` → `Options` → `Expert Advisors` tab
   - Check: ☑ Allow automated trading
   - Check: ☑ Allow WebRequest for listed URL
   - Click **Add** and enter: `https://backend-production-d908.up.railway.app`
   - Click **OK**

7. **Enable AutoTrading Button**
   - In the toolbar, click the `AutoTrading` button (should turn green)

### Installing on MetaTrader 5

1. **Open MetaTrader 5**

2. **Open Data Folder**
   - Click `File` → `Open Data Folder`
   - Navigate to `MQL5` → `Experts`

3. **Copy the EA File**
   - Paste `SignalBridge.mq5` into the `Experts` folder

4. **Compile the EA**
   - Press `F4` to open MetaEditor
   - Open the `SignalBridge.mq5` file
   - Press `F7` to compile
   - Close MetaEditor

5. **Refresh Navigator**
   - Right-click `Expert Advisors` in Navigator
   - Click `Refresh`

6. **Enable Algo Trading**
   - Click `Tools` → `Options` → `Expert Advisors` tab
   - Check: ☑ Allow Algo Trading
   - Check: ☑ Allow WebRequest for listed URL
   - Add: `https://backend-production-d908.up.railway.app`
   - Click **OK**

### Attaching the EA to a Chart

1. Open any chart (the symbol doesn't matter - the EA handles all symbols)
2. In Navigator, find `SignalBridge` under Expert Advisors
3. Drag it onto your chart
4. The EA settings window will appear

### EA Configuration Settings

| Parameter | Description | Recommended Value |
|-----------|-------------|-------------------|
| **ServerURL** | Signal Bridge API URL | `https://backend-production-d908.up.railway.app/api/v1` |
| **ApiKey** | Your account's API key | Copy from Accounts page |
| **PollIntervalSec** | Check for signals every N seconds | `2` (faster) to `5` (less load) |
| **MaxLotSize** | Maximum allowed lot size | `1.0` (safety limit) |
| **DefaultLotSize** | Default if signal doesn't specify | `0.1` |
| **Slippage** | Maximum slippage in points | `3` to `10` |
| **MagicNumber** | Unique ID for EA's orders | `123456` (change if using multiple EAs) |
| **EnableTakeProfit** | Set TP from signals | `true` |
| **EnableStopLoss** | Set SL from signals | `true` |
| **EnableLogging** | Show detailed logs | `true` (for troubleshooting) |

5. Click **OK**
6. Check the chart - you should see a smiley face in the top-right corner
7. Check the **Experts** tab for "SignalBridge initialized successfully"

---

## 6. Configuring TradingView Alerts

### Getting Your Webhook URL

1. Go to **Settings** page in Signal Bridge
2. Find the **Webhook URL** section
3. Click **Copy** to copy the full URL

Your webhook URL format:
```
https://backend-production-d908.up.railway.app/api/v1/webhooks/tradingview?secret=YOUR_SECRET
```

### Creating a TradingView Alert

1. **Open TradingView** and go to your chart
2. **Add your indicator/strategy** if not already added
3. **Create an Alert**:
   - Click the `Alert` button (clock icon) or press `Alt+A`
   - Set your condition (e.g., "RSI crosses above 70")

4. **Configure Notifications Tab**:
   - Check: ☑ Webhook URL
   - Paste your webhook URL from Signal Bridge

5. **Set the Alert Message** (very important!):
   The message must be valid JSON. Use this template:

```json
{
  "symbol": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "lot_size": 0.1,
  "stop_loss": {{close}} * 0.99,
  "take_profit": {{close}} * 1.02,
  "comment": "TradingView Alert"
}
```

6. Click **Create**

### Alert Message Fields

| Field | Required | Description | Example Values |
|-------|----------|-------------|----------------|
| `symbol` | Yes | Trading symbol | `"{{ticker}}"`, `"EURUSD"`, `"XAUUSD"` |
| `action` | Yes | Trade action | `"buy"`, `"sell"`, `"close"`, `"close_buy"`, `"close_sell"` |
| `price` | No | Entry price (for limit/stop orders) | `{{close}}`, `1.2345` |
| `lot_size` | No | Position size | `0.1`, `0.5`, `1.0` |
| `stop_loss` | No | Stop loss price | `{{close}} - 50 * {{mintick}}` |
| `take_profit` | No | Take profit price | `{{close}} + 100 * {{mintick}}` |
| `order_type` | No | Order type | `"market"`, `"limit"`, `"stop"` |
| `comment` | No | Trade comment | `"My Strategy"` |

### Supported Actions

| Action | Description |
|--------|-------------|
| `buy` | Open a buy/long position |
| `sell` | Open a sell/short position |
| `close` | Close all positions for this symbol |
| `close_buy` | Close all buy positions for this symbol |
| `close_sell` | Close all sell positions for this symbol |
| `buy_limit` | Place a buy limit order (requires `price`) |
| `sell_limit` | Place a sell limit order (requires `price`) |
| `buy_stop` | Place a buy stop order (requires `price`) |
| `sell_stop` | Place a sell stop order (requires `price`) |

### TradingView Variables

Use these in your alert message for dynamic values:

| Variable | Description |
|----------|-------------|
| `{{ticker}}` | Symbol name (e.g., "BTCUSD") |
| `{{close}}` | Current close price |
| `{{open}}` | Current open price |
| `{{high}}` | Current high price |
| `{{low}}` | Current low price |
| `{{volume}}` | Current volume |
| `{{time}}` | Current bar time |
| `{{mintick}}` | Minimum price change |

### Example Alert Messages

**Simple Buy Signal:**
```json
{
  "symbol": "{{ticker}}",
  "action": "buy",
  "lot_size": 0.1
}
```

**Buy with TP/SL (Fixed Points):**
```json
{
  "symbol": "{{ticker}}",
  "action": "buy",
  "lot_size": 0.1,
  "stop_loss": {{close}} - 50 * {{mintick}},
  "take_profit": {{close}} + 100 * {{mintick}}
}
```

**Close All Positions:**
```json
{
  "symbol": "{{ticker}}",
  "action": "close"
}
```

**Limit Order:**
```json
{
  "symbol": "{{ticker}}",
  "action": "buy_limit",
  "price": {{close}} * 0.99,
  "lot_size": 0.2,
  "stop_loss": {{close}} * 0.97,
  "take_profit": {{close}} * 1.05
}
```

---

## 7. Using the Dashboard

The Dashboard provides an overview of your trading activity.

### Stats Cards

- **Active Accounts**: Number of MT accounts currently active
- **Signals Today**: Total signals received today
- **Success Rate**: Percentage of successfully executed signals (last 30 days)
- **Monthly Signals**: Total signals this month

### Signal Status Breakdown

Shows the distribution of signal statuses:
- **Executed**: Successfully traded
- **Pending**: Waiting for EA to pick up
- **Failed**: Could not be executed
- **Expired**: EA didn't pick up in time

### Top Symbols

The 5 most traded symbols in the last 30 days, showing signal count.

### Recent Signals Table

The latest 10 signals with:
- Symbol
- Action (BUY/SELL)
- Status
- Time (relative, e.g., "5 minutes ago")

---

## 8. Managing Signals

The **Signals** page shows all your signal history.

### Viewing Signals

The signals table displays:
| Column | Description |
|--------|-------------|
| Symbol | Trading symbol |
| Action | BUY, SELL, CLOSE, etc. |
| Type | Market, Limit, Stop |
| Quantity | Lot size |
| TP | Take profit level |
| SL | Stop loss level |
| Status | Signal status |
| Created | When the signal was received |

### Filtering Signals

Use the filters at the top to narrow down signals:
- **Account**: Select a specific MT account
- **Status**: Filter by pending, executed, failed, etc.
- **Symbol**: Filter by trading symbol
- **Date Range**: Select date range

### Signal Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Waiting for EA to pick up |
| `sent` | Delivered to EA, awaiting execution |
| `executed` | Trade successfully executed |
| `partial` | Partially executed |
| `failed` | Execution failed (see error message) |
| `expired` | EA didn't pick up before expiry (60 seconds) |
| `cancelled` | Manually cancelled by user |

### Cancelling Signals

To cancel a pending signal:
1. Find the signal in the table
2. Click the **Cancel** button (trash icon)
3. Confirm the cancellation

Note: You can only cancel `pending` signals. Once sent to the EA, they cannot be cancelled.

### Exporting Signals

To export your signal history:
1. Apply any filters you want
2. Click the **Export** button
3. A CSV file will download with all matching signals

---

## 9. Symbol Mappings

TradingView symbols may differ from your broker's symbols. Symbol mappings solve this.

### Why Symbol Mappings?

| TradingView | Your Broker |
|-------------|-------------|
| BTCUSD | BTCUSD.i |
| GOLD | XAUUSD |
| US500 | SPX500 |

### Creating a Symbol Mapping

1. Go to **Accounts** page
2. Click on your account
3. Find **Symbol Mappings** section
4. Click **Add Mapping**
5. Enter:
   - **TradingView Symbol**: The symbol in your alerts (e.g., "GOLD")
   - **MT Symbol**: Your broker's symbol (e.g., "XAUUSD")
   - **Lot Multiplier**: Adjust lot size (default: 1.0)

### Lot Multiplier

The lot multiplier adjusts position sizes. For example:
- Signal lot_size: `1.0`
- Lot multiplier: `0.1`
- Actual trade: `0.1 lots`

This is useful for:
- Scaling down signals for smaller accounts
- Adjusting between different account types

---

## 10. Admin Features

If you're an admin user, you have access to additional features.

### Accessing Admin Panel

1. Log in with an admin account
2. In the sidebar, you'll see an **Admin** section
3. Click **User Management**

### User Management

Admins can:
- **View all users**: See all registered users
- **Search/Filter**: Find users by email, tier, status
- **Create users**: Add new users manually
- **Edit users**: Update user details, tier, limits
- **Approve/Reject users**: If approval is required
- **Delete users**: Remove users and their data
- **Toggle admin**: Grant or revoke admin access
- **Change tier**: Upgrade or downgrade user tiers

### User Tiers

| Tier | Max Accounts | Max Signals/Day |
|------|--------------|-----------------|
| FREE | 2 | 50 |
| BASIC | 5 | 200 |
| PRO | 15 | 1,000 |
| ENTERPRISE | 100 | 10,000 |

### Admin Dashboard Stats

- Total users
- Active users
- Pending approval
- New users (today/week/month)
- Users by tier

---

## 11. Troubleshooting

### EA Not Appearing in Navigator

**Problem**: After copying the EA file, it doesn't show in MT4/MT5 Navigator.

**Solutions**:
1. Make sure the file is in the correct folder:
   - MT4: `MQL4/Experts/`
   - MT5: `MQL5/Experts/`
2. Right-click "Expert Advisors" in Navigator and click "Refresh"
3. Restart MetaTrader

### EA Shows X Instead of Smiley Face

**Problem**: The EA shows a sad face or X on the chart.

**Solutions**:
1. Make sure AutoTrading is enabled (green button in toolbar)
2. Check `Tools` → `Options` → `Expert Advisors`:
   - ☑ Allow automated trading must be checked
3. Right-click the EA on chart → Properties → Common tab:
   - ☑ Allow Algo Trading must be checked

### Connection Errors

**Problem**: EA shows "Failed to connect to server" or similar.

**Solutions**:
1. Check your internet connection
2. Verify ServerURL is correct (with `/api/v1` at the end)
3. Make sure the server URL is in WebRequest allowed list:
   - `Tools` → `Options` → `Expert Advisors`
   - Add URL if missing
4. Check if your firewall is blocking MetaTrader

### Invalid API Key

**Problem**: EA shows "Invalid API key" error.

**Solutions**:
1. Go to Accounts page and verify the API key
2. If you lost it, click "Regenerate Key" and update the EA
3. Make sure there are no extra spaces when copying

### Signals Not Executing

**Problem**: Signals appear in dashboard but no trades in MT.

**Checklist**:
1. Is the EA running? (Smiley face on chart)
2. Is the account active in Signal Bridge?
3. Is the symbol correct? (Check symbol mappings)
4. Check the Experts tab in MT for error messages
5. Is there enough margin for the trade?
6. Are trading hours open for this symbol?

### Signals Showing "Expired"

**Problem**: Signals expire before execution.

**Causes**:
- EA not running or not connected
- EA crashed or was removed
- MetaTrader was closed

**Solutions**:
1. Make sure EA is attached and running
2. Check the Experts tab for errors
3. Reduce poll interval (2-3 seconds recommended)

### Symbol Not Found

**Problem**: EA reports "Symbol not found" error.

**Solutions**:
1. Your broker uses a different symbol name
2. Create a **Symbol Mapping**:
   - TradingView: `GOLD`
   - Your Broker: `XAUUSD` (or whatever your broker uses)
3. Check Market Watch in MT for exact symbol names

### TradingView Webhook Not Working

**Problem**: Alerts triggered but no signals in Signal Bridge.

**Checklist**:
1. Is the webhook URL correct? (Copy from Settings page)
2. Is the secret included in the URL?
3. Is the alert message valid JSON?
4. Test with a simple message first:
   ```json
   {"symbol": "EURUSD", "action": "buy"}
   ```
5. Check TradingView alert history for delivery status

### Password Reset

**Problem**: Forgot your password.

**Solution**: Contact the admin to reset your password, or if self-hosting, update directly in the database.

---

## 12. Self-Hosting Guide

If you want to run your own Signal Bridge server:

### Requirements

- **Server**: VPS with 1GB+ RAM
- **Python**: 3.11 or higher
- **Node.js**: 20 or higher
- **PostgreSQL**: 15 or higher
- **Redis**: 7 or higher
- **Domain**: With SSL certificate

### Quick Start with Docker

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nutbitzuist/trading-signal-bridge.git
   cd trading-signal-bridge
   ```

2. **Set up environment files**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Edit backend/.env**:
   ```env
   APP_ENV=production
   DEBUG=false
   SECRET_KEY=your-random-64-char-secret
   JWT_SECRET_KEY=another-random-64-char-secret
   DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/signalbridge
   REDIS_URL=redis://redis:6379/0
   CORS_ORIGINS=["https://your-domain.com"]
   ```

   Generate secrets with:
   ```bash
   openssl rand -hex 32
   ```

4. **Edit frontend/.env.local**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
   ```

5. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

6. **Run database migrations**:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

7. **Access your instance**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Cloud Deployment

**Frontend (Vercel)**:
1. Connect your GitHub repo to Vercel
2. Set Root Directory to `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy

**Backend (Railway)**:
1. Create new project in Railway
2. Add PostgreSQL and Redis services
3. Deploy from GitHub (backend folder)
4. Set environment variables
5. Run `alembic upgrade head` via Railway shell

### Making Yourself Admin

After creating your first account:

1. Connect to your PostgreSQL database
2. Run:
   ```sql
   UPDATE users SET is_admin = true WHERE email = 'your@email.com';
   ```

### Security Recommendations

1. **Always use HTTPS** - Required for webhook security
2. **Strong secrets** - Use 64+ character random strings
3. **Database backups** - Set up automated backups
4. **Rate limiting** - Already configured, but monitor usage
5. **Keep updated** - Regularly update dependencies

---

## Need Help?

- **GitHub Issues**: https://github.com/nutbitzuist/trading-signal-bridge/issues
- **API Documentation**: https://backend-production-d908.up.railway.app/docs

---

*Trading Signal Bridge - Connecting TradingView to MetaTrader*
