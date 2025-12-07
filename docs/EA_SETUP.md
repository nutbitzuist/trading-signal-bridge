# Expert Advisor Setup Guide

This guide explains how to install and configure the Signal Bridge Expert Advisor for MT4 and MT5.

## Prerequisites

1. MetaTrader 4 or MetaTrader 5 installed
2. Trading Signal Bridge account with an MT account created
3. API key for your MT account (from dashboard)

## MT4 Installation

### Step 1: Copy the EA File

1. Download `SignalBridge.mq4` from the `expert-advisors/MT4/` folder
2. Open your MT4 data folder:
   - In MT4, go to **File** → **Open Data Folder**
3. Navigate to `MQL4/Experts/`
4. Copy `SignalBridge.mq4` into this folder

### Step 2: Compile the EA

1. Open MetaEditor (press F4 in MT4)
2. Open `SignalBridge.mq4`
3. Click **Compile** (F7)
4. Verify no errors in the log

### Step 3: Configure WebRequest

1. In MT4, go to **Tools** → **Options**
2. Select **Expert Advisors** tab
3. Check **Allow WebRequest for listed URL**
4. Click **Add** and enter your server URL:
   - Example: `https://your-server.com`
5. Click **OK**

### Step 4: Enable AutoTrading

1. Click the **AutoTrading** button in the toolbar (should turn green)
2. Or go to **Tools** → **Options** → **Expert Advisors** and check:
   - Allow automated trading
   - Allow DLL imports (if needed)

### Step 5: Attach EA to Chart

1. Open any chart (the symbol doesn't matter)
2. In Navigator (Ctrl+N), expand **Expert Advisors**
3. Drag **SignalBridge** onto the chart
4. Configure the inputs:

| Input | Description | Recommended Value |
|-------|-------------|-------------------|
| ServerURL | Your API server URL | `https://your-server.com/api/v1` |
| ApiKey | Your MT account API key | From dashboard |
| PollIntervalSec | Polling interval | 2 |
| MaxLotSize | Maximum lot size | 1.0 |
| DefaultLotSize | Default lot size | 0.1 |
| Slippage | Slippage in points | 3-10 |
| MagicNumber | EA magic number | 123456 |
| EnableTakeProfit | Enable TP | true |
| EnableStopLoss | Enable SL | true |
| EnableLogging | Enable detailed logs | true |

5. Check **Allow live trading**
6. Click **OK**

### Step 6: Verify Connection

1. Check the EA is attached (smiley face in corner)
2. Open the **Experts** tab (Ctrl+E) to see logs
3. Look for "SignalBridge initialized successfully"

## MT5 Installation

### Step 1: Copy the EA File

1. Download `SignalBridge.mq5` from the `expert-advisors/MT5/` folder
2. Open your MT5 data folder:
   - In MT5, go to **File** → **Open Data Folder**
3. Navigate to `MQL5/Experts/`
4. Copy `SignalBridge.mq5` into this folder

### Step 2: Compile the EA

1. Open MetaEditor (press F4 in MT5)
2. Open `SignalBridge.mq5`
3. Click **Compile** (F7)
4. Verify no errors

### Step 3: Configure WebRequest

1. In MT5, go to **Tools** → **Options**
2. Select **Expert Advisors** tab
3. Check **Allow WebRequest for listed URL**
4. Add your server URL
5. Click **OK**

### Step 4: Enable Algo Trading

1. Click **Algo Trading** button in toolbar
2. Ensure it's enabled (green icon)

### Step 5: Attach EA to Chart

Same process as MT4 - drag EA to chart and configure inputs.

## Input Parameters Explained

### ServerURL
The base URL of your Trading Signal Bridge API.
- Format: `https://your-domain.com/api/v1`
- Don't include trailing slash

### ApiKey
Your MT account's unique API key.
- Found in Dashboard → Accounts
- 64-character string
- Keep secret - never share!

### PollIntervalSec
How often the EA checks for new signals (in seconds).
- Lower = faster execution, more server requests
- Higher = slower execution, fewer requests
- Recommended: 2-5 seconds

### MaxLotSize
Maximum lot size the EA will execute.
- Safety limit to prevent large accidental trades
- Set based on your risk management

### DefaultLotSize
Used when signal doesn't specify quantity.
- Used as fallback
- Should be conservative

### Slippage
Maximum allowed slippage in points.
- MT4: Usually 1-10
- Higher during news = faster fills but worse prices

### MagicNumber
Unique identifier for EA orders.
- Helps identify which orders belong to this EA
- Use different numbers if running multiple EAs

### EnableTakeProfit / EnableStopLoss
Whether to set TP/SL on orders.
- Disable if your strategy manages exits differently

### EnableLogging
Detailed logging in Experts tab.
- Enable during setup and troubleshooting
- Can disable in production to reduce log size

## Troubleshooting

### "URL not in allowed list" (Error 4060)

**Problem:** WebRequest URL not configured.

**Solution:**
1. Go to Tools → Options → Expert Advisors
2. Add your server URL to allowed list
3. Restart MT4/MT5

### "API key may be invalid"

**Problem:** Wrong or expired API key.

**Solution:**
1. Check API key in dashboard
2. Regenerate if needed
3. Update EA input

### "Trade server is busy"

**Problem:** Broker's server is overloaded.

**Solution:**
- Wait and retry
- Signal will be reprocessed on next poll

### Orders Not Executing

**Possible causes:**
1. AutoTrading disabled - Enable it
2. Symbol not found - Check symbol mapping
3. Invalid stops - TP/SL too close to price
4. Insufficient margin - Check account balance
5. Market closed - Check trading hours

### No Connection

**Check:**
1. Internet connection
2. Server is running
3. Firewall not blocking
4. Correct URL format

### Duplicate Orders

**Possible causes:**
1. Signal sent to multiple accounts
2. EA attached to multiple charts
3. Signal not marked as executed

**Solution:**
- Use unique MagicNumber
- Only attach EA to one chart per account

## Advanced Configuration

### Account-Specific Settings

In the dashboard, you can set account-specific settings:

```json
{
    "max_lot_size": 0.5,
    "min_lot_size": 0.01,
    "default_slippage": 5
}
```

### Symbol Mapping in EA

The EA includes basic symbol mapping. Customize in the source code:

```mql4
string MapSymbol(string tvSymbol)
{
   if(tvSymbol == "XAUUSD" || tvSymbol == "GOLD")
      return "GOLD";  // Your broker's symbol

   if(tvSymbol == "XTIUSD" || tvSymbol == "USOIL")
      return "XTIUSD";

   return tvSymbol;
}
```

Or use the dashboard's symbol mapping feature.

### Multiple Accounts

To run multiple accounts from one MT4/MT5:

1. Use different MagicNumbers
2. Attach EA to different charts
3. Configure different API keys

Note: Each EA instance polls independently.

## Security Best Practices

1. **Never share your API key**
2. **Use HTTPS in production**
3. **Set reasonable MaxLotSize**
4. **Monitor your dashboard regularly**
5. **Keep MT4/MT5 updated**
6. **Use VPS for 24/7 operation**

## VPS Recommendations

For best execution:
- Use a VPS close to your broker's server
- Windows VPS with MT4/MT5 installed
- Stable internet connection
- At least 2GB RAM

Popular VPS providers:
- ForexVPS
- BeeksFX
- Commercial Network Services

## Logs Location

### MT4
- `C:\Users\{User}\AppData\Roaming\MetaQuotes\Terminal\{ID}\MQL4\Logs\`
- Or via File → Open Data Folder → MQL4 → Logs

### MT5
- `C:\Users\{User}\AppData\Roaming\MetaQuotes\Terminal\{ID}\MQL5\Logs\`

## Getting Help

1. Check the Experts tab for error messages
2. Enable logging and reproduce the issue
3. Check dashboard for signal status
4. Review server logs if you have access
5. Contact support with:
   - EA logs
   - Signal ID
   - Screenshots of settings
