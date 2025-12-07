# Trading Signal Bridge

A complete automated trading signal bridge that receives webhook alerts from TradingView and routes them to Expert Advisors running on MT4/MT5 for automatic trade execution.

## Features

- **Multi-user System**: Support for multiple users with individual webhook secrets
- **Multiple MT Accounts**: Each user can connect multiple MT4/MT5 accounts
- **Symbol Mapping**: Translate TradingView symbols to broker-specific symbols
- **Low Latency**: 1-5 second acceptable latency for signal delivery
- **Full Trade Support**: Market orders, pending orders, modifications, and closes
- **Real-time Dashboard**: Monitor signals, accounts, and execution status
- **CSV Export**: Export signal history for analysis
- **Extensible**: Designed for future integration with Interactive Brokers and Settrade

## Architecture

```
TradingView Alert → Webhook → FastAPI Server → PostgreSQL → Redis Queue
                                                              ↓
MT4/MT5 EA ← HTTP Polling ← Signal Endpoint ← Signal Processor
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 20+ (for frontend development)
- PostgreSQL 15+
- Redis 7+

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd trading-signal-bridge
```

2. Create environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. Update the `.env` files with your configuration (especially `SECRET_KEY` and `JWT_SECRET_KEY`).

4. Start the services:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
docker-compose exec backend alembic upgrade head
```

6. Access the application:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/api/v1/health

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev
```

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_ENV` | Environment (development/production) | development |
| `DATABASE_URL` | PostgreSQL connection URL | postgresql+asyncpg://... |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379/0 |
| `SECRET_KEY` | Application secret key | (required) |
| `JWT_SECRET_KEY` | JWT signing key | (required) |
| `CORS_ORIGINS` | Allowed CORS origins | ["http://localhost:3000"] |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:8000/api/v1 |
| `NEXT_PUBLIC_APP_NAME` | Application name | Trading Signal Bridge |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Webhook
- `POST /api/v1/webhook/tradingview` - Receive TradingView alerts

### Signals (EA Polling)
- `GET /api/v1/signals/pending?api_key=xxx` - Get pending signals
- `POST /api/v1/signals/{id}/result?api_key=xxx` - Report execution result

### Accounts
- `GET /api/v1/accounts` - List user's accounts
- `POST /api/v1/accounts` - Create account
- `PUT /api/v1/accounts/{id}` - Update account
- `DELETE /api/v1/accounts/{id}` - Delete account
- `POST /api/v1/accounts/{id}/regenerate-key` - Regenerate API key

### Symbol Mappings
- `GET /api/v1/accounts/{id}/symbols` - List symbol mappings
- `POST /api/v1/accounts/{id}/symbols` - Create mapping
- `PUT /api/v1/accounts/{id}/symbols/{symbol_id}` - Update mapping
- `DELETE /api/v1/accounts/{id}/symbols/{symbol_id}` - Delete mapping

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/health` - Health check

## TradingView Setup

### 1. Get Your Webhook URL and Secret

1. Log in to the dashboard
2. Go to Settings
3. Copy your Webhook URL and Webhook Secret

### 2. Configure TradingView Alert

1. Create or edit an alert in TradingView
2. Set the Webhook URL to your server's webhook endpoint
3. Use this JSON format for the alert message:

```json
{
    "secret": "YOUR_WEBHOOK_SECRET",
    "symbol": "{{ticker}}",
    "action": "buy",
    "quantity": 0.1,
    "take_profit": {{close}} * 1.02,
    "stop_loss": {{close}} * 0.98,
    "comment": "Strategy_Name"
}
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `buy` | Market buy order |
| `sell` | Market sell order |
| `buy_limit` | Buy limit order (requires `price`) |
| `sell_limit` | Sell limit order (requires `price`) |
| `buy_stop` | Buy stop order (requires `price`) |
| `sell_stop` | Sell stop order (requires `price`) |
| `close` | Close all positions for symbol |
| `close_partial` | Partially close position |
| `modify` | Modify TP/SL of existing position |

## Expert Advisor Setup

### MT4 Setup

1. Copy `expert-advisors/MT4/SignalBridge.mq4` to your MT4 `Experts` folder
2. Compile the EA in MetaEditor
3. In MT4, go to Tools → Options → Expert Advisors
4. Check "Allow WebRequest for listed URL"
5. Add your server URL (e.g., `https://your-server.com`)
6. Enable "Allow automated trading"
7. Attach the EA to any chart
8. Configure the EA inputs:
   - `ServerURL`: Your server URL (e.g., `https://your-server.com/api/v1`)
   - `ApiKey`: Your MT account's API key (from dashboard)
   - `PollIntervalSec`: Polling interval (default: 2 seconds)
   - Other settings as needed

### MT5 Setup

1. Copy `expert-advisors/MT5/SignalBridge.mq5` to your MT5 `Experts` folder
2. Compile the EA in MetaEditor
3. In MT5, go to Tools → Options → Expert Advisors
4. Check "Allow WebRequest for listed URL"
5. Add your server URL
6. Enable "Allow automated trading"
7. Attach the EA to any chart and configure

### EA Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ServerURL` | API server URL | https://your-server.com/api/v1 |
| `ApiKey` | MT account API key | (required) |
| `PollIntervalSec` | Signal polling interval | 2 |
| `MaxLotSize` | Maximum allowed lot size | 1.0 |
| `DefaultLotSize` | Default lot size if not specified | 0.1 |
| `Slippage` | Slippage in points | 3 |
| `MagicNumber` | EA magic number | 123456 |
| `EnableTakeProfit` | Enable TP execution | true |
| `EnableStopLoss` | Enable SL execution | true |
| `EnableLogging` | Enable detailed logging | true |

## Symbol Mapping

Different brokers use different symbol names. Configure symbol mappings in the dashboard:

| TradingView Symbol | MT Symbol (Example) |
|-------------------|---------------------|
| XAUUSD | GOLD |
| XTIUSD | USOIL |
| EURUSD | EURUSD.ecn |

## Security Considerations

1. **Always use HTTPS** in production
2. **Rotate secrets regularly** - Use the regenerate functions
3. **Set strong passwords** - Minimum 8 characters with uppercase, lowercase, and numbers
4. **Restrict CORS origins** - Only allow your frontend domain
5. **Rate limiting** - Built-in rate limiting for webhooks and API calls
6. **Never share API keys** - Each MT account has its own key

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# With production profile (includes nginx)
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec backend alembic upgrade head
```

### SSL/TLS Setup

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `nginx/ssl/`
3. Uncomment HTTPS server block in `nginx/nginx.conf`
4. Update CORS origins to use HTTPS

## Monitoring

### Health Checks

- Backend: `GET /api/v1/health`
- Database: Included in Docker health checks
- Redis: Included in Docker health checks

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
```

## Troubleshooting

### Common Issues

1. **EA can't connect to server**
   - Verify URL is added to MT4/MT5 allowed WebRequest URLs
   - Check API key is correct
   - Ensure server is reachable from your network

2. **Signals not executing**
   - Check EA is attached and AutoTrading is enabled
   - Verify symbol mapping is correct
   - Check broker trading hours

3. **Webhook authentication fails**
   - Verify webhook secret is correct
   - Ensure JSON format is valid in TradingView alert

4. **Database connection errors**
   - Check DATABASE_URL is correct
   - Ensure PostgreSQL is running
   - Verify network connectivity

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub Issues page.
