# TradingView Setup Guide

This guide explains how to configure TradingView alerts to send signals to your Trading Signal Bridge.

## Prerequisites

1. TradingView account (Pro or higher recommended for multiple alerts)
2. Trading Signal Bridge account with at least one MT account configured
3. Your webhook URL and secret (found in Settings page)

## Step 1: Get Your Webhook Credentials

1. Log in to your Trading Signal Bridge dashboard
2. Navigate to **Settings**
3. Copy your:
   - **Webhook URL**: `https://your-server.com/api/v1/webhook/tradingview`
   - **Webhook Secret**: Your unique 64-character secret

## Step 2: Create a TradingView Alert

1. Open any chart in TradingView
2. Click the **Alert** button (clock icon) or press `Alt+A`
3. Configure your alert condition
4. In the **Notifications** tab:
   - Enable **Webhook URL**
   - Paste your webhook URL

## Step 3: Configure the Alert Message

The alert message must be valid JSON with the following format:

### Basic Buy Signal
```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "{{ticker}}",
    "action": "buy",
    "quantity": 0.1
}
```

### Buy with TP/SL
```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "{{ticker}}",
    "action": "buy",
    "quantity": 0.1,
    "take_profit": {{close}} * 1.02,
    "stop_loss": {{close}} * 0.98,
    "comment": "My_Strategy"
}
```

### Sell Signal
```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "{{ticker}}",
    "action": "sell",
    "quantity": 0.1,
    "take_profit": {{close}} * 0.98,
    "stop_loss": {{close}} * 1.02
}
```

### Close Position
```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "{{ticker}}",
    "action": "close"
}
```

### Pending Order (Buy Limit)
```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "{{ticker}}",
    "action": "buy_limit",
    "order_type": "limit",
    "quantity": 0.1,
    "price": {{close}} * 0.99,
    "take_profit": {{close}} * 1.02,
    "stop_loss": {{close}} * 0.97
}
```

### Target Specific Account
```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "account_id": "your-account-uuid-here",
    "symbol": "{{ticker}}",
    "action": "buy",
    "quantity": 0.1
}
```

## Available Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `buy` | Market buy order | symbol |
| `sell` | Market sell order | symbol |
| `buy_limit` | Buy limit order | symbol, price |
| `sell_limit` | Sell limit order | symbol, price |
| `buy_stop` | Buy stop order | symbol, price |
| `sell_stop` | Sell stop order | symbol, price |
| `close` | Close all positions | symbol |
| `close_partial` | Close partial position | symbol, quantity |
| `modify` | Modify TP/SL | symbol, (take_profit or stop_loss) |

## TradingView Placeholders

Use these placeholders in your alert message:

| Placeholder | Description |
|-------------|-------------|
| `{{ticker}}` | Symbol name (e.g., XAUUSD) |
| `{{close}}` | Current close price |
| `{{open}}` | Current open price |
| `{{high}}` | Current high price |
| `{{low}}` | Current low price |
| `{{volume}}` | Current volume |
| `{{time}}` | Bar time |
| `{{timenow}}` | Current time |
| `{{exchange}}` | Exchange name |

## Pine Script Examples

### Simple EMA Crossover

```pine
//@version=5
strategy("EMA Crossover", overlay=true)

ema15 = ta.ema(close, 15)
ema50 = ta.ema(close, 50)

// Plot EMAs
plot(ema15, color=color.blue, title="EMA 15")
plot(ema50, color=color.red, title="EMA 50")

// Entry conditions
longCondition = ta.crossover(ema15, ema50)
shortCondition = ta.crossunder(ema15, ema50)

if longCondition
    strategy.entry("Long", strategy.long)
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.1,"comment":"EMA_Cross_Long"}', alert.freq_once_per_bar_close)

if shortCondition
    strategy.close("Long")
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"close","comment":"EMA_Cross_Close"}', alert.freq_once_per_bar_close)
```

### RSI with Dynamic TP/SL

```pine
//@version=5
strategy("RSI Strategy", overlay=true)

rsi = ta.rsi(close, 14)
oversold = 30
overbought = 70

// Calculate dynamic TP/SL based on ATR
atr = ta.atr(14)
tpMultiplier = 2.0
slMultiplier = 1.0

if rsi < oversold
    tp = close + (atr * tpMultiplier)
    sl = close - (atr * slMultiplier)
    strategy.entry("Long", strategy.long)
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.1,"take_profit":' + str.tostring(tp) + ',"stop_loss":' + str.tostring(sl) + ',"comment":"RSI_Oversold"}', alert.freq_once_per_bar_close)

if rsi > overbought
    strategy.close("Long")
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"close","comment":"RSI_Overbought"}', alert.freq_once_per_bar_close)
```

### Multi-Timeframe Strategy

```pine
//@version=5
strategy("MTF Strategy", overlay=true)

// Get higher timeframe data
htfClose = request.security(syminfo.tickerid, "D", close)
htfEMA = ta.ema(htfClose, 20)

// Current timeframe
ema20 = ta.ema(close, 20)

// Long when price above both EMAs
longCondition = close > ema20 and close > htfEMA

if longCondition and strategy.position_size == 0
    strategy.entry("Long", strategy.long)
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.05}', alert.freq_once_per_bar_close)

if close < ema20 and strategy.position_size > 0
    strategy.close("Long")
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"close"}', alert.freq_once_per_bar_close)
```

## Testing Your Setup

### 1. Manual Test

Send a test webhook using curl:

```bash
curl -X POST https://your-server.com/api/v1/webhook/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "XAUUSD",
    "action": "buy",
    "quantity": 0.01,
    "comment": "Test_Signal"
  }'
```

### 2. Check the Response

A successful response looks like:
```json
{
    "success": true,
    "signal_id": "uuid-here",
    "message": "Signal queued for 1 account(s)",
    "signals_created": 1
}
```

### 3. Verify in Dashboard

1. Go to **Signals** page
2. Look for your test signal
3. Check the status (should be "pending" initially)

### 4. Verify EA Receives Signal

1. Check your EA logs in MT4/MT5
2. Look for "Processing signal" message
3. Verify order execution

## Troubleshooting

### Alert Not Triggering

- Ensure your strategy/indicator actually fires an alert
- Check alert conditions are met
- Verify alert hasn't reached its limit

### Webhook Not Received

- Check webhook URL is correct
- Verify JSON is valid (use a JSON validator)
- Check TradingView subscription supports webhooks

### Signal Not Executing

- Verify EA is running and connected
- Check symbol mapping if needed
- Review EA logs for errors
- Ensure trading is allowed on the account

### Common JSON Errors

**Invalid:**
```json
{
    "secret": "...",
    "quantity": .1  // Missing leading zero
}
```

**Valid:**
```json
{
    "secret": "...",
    "quantity": 0.1
}
```

**Invalid:**
```json
{
    "secret": "...",
    "action": "buy"  // Trailing comma not allowed in some parsers
    ,
}
```

## Best Practices

1. **Test with small quantities first** - Use 0.01 lots for testing
2. **Use meaningful comments** - Helps identify signals in logs
3. **Set reasonable TP/SL** - Avoid unrealistic values
4. **Monitor your dashboard** - Check signal execution regularly
5. **Use alert frequency wisely** - `once_per_bar_close` prevents duplicates
6. **Keep secrets secure** - Never share your webhook secret

## Symbol Mapping Tips

If your broker uses different symbol names:

1. Go to **Accounts** → Select account → **Symbol Mappings**
2. Add mappings like:
   - TradingView: `XAUUSD` → MT: `GOLD`
   - TradingView: `BTCUSD` → MT: `BTCUSD.ecn`

The system will automatically translate symbols when processing signals.
