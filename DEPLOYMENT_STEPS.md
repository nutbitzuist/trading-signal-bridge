# Deployment Steps

## Status

✅ **GitHub Repository**: https://github.com/nutbitzuist/trading-signal-bridge
✅ **Frontend Deployed**: https://frontend-oran1vael-nutbitzuists-projects.vercel.app

🔄 **Backend Deployment**: Requires interactive setup (instructions below)

---

## Backend Deployment to Railway

Since Railway CLI requires interactive mode, please follow these steps in your terminal:

### 1. Navigate to Backend Directory

```bash
cd "/Users/nut/Desktop/TV to MT connection/trading-signal-bridge/backend"
```

### 2. Initialize Railway Project

```bash
railway init
```

When prompted:
- **Select workspace**: Choose "nutbitzuist's Projects"
- **Project name**: Enter `trading-signal-bridge-backend`
- **Create new project**: Yes

### 3. Add PostgreSQL Database

```bash
railway add --database postgresql
```

This will provision a PostgreSQL 15+ database and automatically add connection environment variables.

### 4. Add Redis

```bash
railway add --database redis
```

This will provision a Redis instance for caching/queuing.

### 5. Set Environment Variables

```bash
# Set the secret key (generate a secure random string)
railway variables set SECRET_KEY="$(openssl rand -hex 32)"

# Set webhook secret (generate a secure random string)
railway variables set WEBHOOK_SECRET="$(openssl rand -hex 32)"

# Set CORS origins to allow your Vercel frontend
railway variables set CORS_ORIGINS="https://frontend-oran1vael-nutbitzuists-projects.vercel.app,http://localhost:3000"

# Set Redis URL (will be auto-populated by Railway, but verify)
# DATABASE_URL will be auto-populated by Railway for PostgreSQL
```

### 6. Deploy the Backend

```bash
railway up
```

This will:
- Build the Docker image
- Run database migrations (`alembic upgrade head`)
- Deploy the FastAPI application
- Expose it on a public URL

### 7. Get the Backend URL

```bash
railway domain
```

If no domain is assigned, create one:

```bash
railway domain create
```

This will give you a URL like: `https://trading-signal-bridge-backend.up.railway.app`

---

## Frontend Environment Variable Configuration

Once the backend is deployed, update the Vercel frontend with the backend URL:

### 1. Navigate to Frontend Directory

```bash
cd "/Users/nut/Desktop/TV to MT connection/trading-signal-bridge/frontend"
```

### 2. Set Environment Variables in Vercel

```bash
# Replace <RAILWAY_BACKEND_URL> with your actual Railway URL
vercel env add NEXT_PUBLIC_API_URL production

# When prompted, enter: https://trading-signal-bridge-backend.up.railway.app/api/v1

vercel env add NEXT_PUBLIC_APP_NAME production
# When prompted, enter: Trading Signal Bridge
```

### 3. Redeploy Frontend

```bash
vercel --prod
```

---

## Verification Steps

### 1. Test Backend Health Endpoint

```bash
curl https://<RAILWAY_BACKEND_URL>/api/v1/health
```

Expected response:
```json
{"status": "healthy"}
```

### 2. Test Frontend

Visit: https://frontend-oran1vael-nutbitzuists-projects.vercel.app

- The login page should load
- Try registering a new user
- Verify you can access the dashboard

### 3. Test TradingView Webhook

1. Get a user's webhook_secret from the database or API
2. Send a test webhook:

```bash
curl -X POST https://<RAILWAY_BACKEND_URL>/api/v1/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <USER_WEBHOOK_SECRET>" \
  -d '{
    "user_id": 1,
    "action": "BUY",
    "symbol": "XAUUSD",
    "lot_size": 0.01,
    "stop_loss": 1950.00,
    "take_profit": 1980.00
  }'
```

### 4. Test MT4/MT5 Connection

1. Copy the Expert Advisors to MT4/MT5
2. Compile them
3. Get an API key from the dashboard
4. Configure the EA with:
   - `APIUrl`: `https://<RAILWAY_BACKEND_URL>/api/v1`
   - `APIKey`: Your account's API key
   - `AccountID`: Your MT account ID from the dashboard

5. Attach EA to a chart
6. Send a test signal and verify execution

---

## Important Notes

### Security Checklist

- [ ] Change default SECRET_KEY and WEBHOOK_SECRET
- [ ] Update CORS_ORIGINS to only include your production frontend URL
- [ ] Enable HTTPS only in production
- [ ] Review PostgreSQL and Redis access controls in Railway dashboard
- [ ] Rotate API keys regularly
- [ ] Set up Railway monitoring and alerts

### Database Migrations

Migrations run automatically on deployment via the Railway start command:
```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

If you need to run migrations manually:
```bash
railway run alembic upgrade head
```

### View Logs

```bash
railway logs
```

### Environment Variables Reference

**Backend (Railway):**
- `DATABASE_URL` - Auto-populated by Railway PostgreSQL
- `REDIS_URL` - Auto-populated by Railway Redis
- `SECRET_KEY` - JWT signing key (REQUIRED)
- `WEBHOOK_SECRET` - TradingView webhook validation (REQUIRED)
- `CORS_ORIGINS` - Comma-separated allowed origins
- `PORT` - Auto-populated by Railway

**Frontend (Vercel):**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_NAME` - Application name

---

## Troubleshooting

### Backend Issues

**Database Connection Errors:**
```bash
railway logs --service backend
# Check for connection issues
railway variables list
# Verify DATABASE_URL is set
```

**Migration Failures:**
```bash
railway run bash
alembic upgrade head --sql  # View SQL without executing
alembic current  # Check current version
alembic history  # View migration history
```

### Frontend Issues

**Build Failures:**
```bash
vercel logs <deployment-url>
```

**API Connection Issues:**
- Verify NEXT_PUBLIC_API_URL includes `/api/v1`
- Check CORS_ORIGINS in Railway includes Vercel URL
- Verify backend is running: `curl https://<RAILWAY_BACKEND_URL>/api/v1/health`

### EA Connection Issues

1. **Enable WebRequest in MT4/MT5:**
   - Tools → Options → Expert Advisors
   - Check "Allow WebRequest for listed URLs"
   - Add: `https://<RAILWAY_BACKEND_URL>`

2. **Check EA Logs:**
   - Experts tab in MT4/MT5 terminal
   - Look for HTTP request/response errors

3. **Verify API Key:**
   - Check it matches the account in the dashboard
   - Ensure account is active

---

## Next Steps

1. Complete the Railway backend deployment (steps above)
2. Update Vercel environment variables with Railway backend URL
3. Run verification tests
4. Configure TradingView webhooks
5. Set up MT4/MT5 Expert Advisors
6. Monitor logs and performance
7. Set up Railway alerts and notifications

---

## Monitoring and Maintenance

### Railway Dashboard
- View metrics: https://railway.app/dashboard
- Monitor CPU, memory, network usage
- Set up alerts for downtime

### Vercel Dashboard
- View analytics: https://vercel.com/dashboard
- Monitor build times and errors
- Check function invocation logs

### Database Backups

Railway provides automatic backups for PostgreSQL. To create manual backup:

```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

To restore:

```bash
railway run psql $DATABASE_URL < backup.sql
```

---

## Cost Estimates

**Railway (Backend + PostgreSQL + Redis):**
- Starter Plan: $5/month (includes $5 credit)
- Pay as you go after credits

**Vercel (Frontend):**
- Hobby Plan: Free (with usage limits)
- Pro Plan: $20/month (for production use)

Total estimated monthly cost: ~$5-25 depending on usage

---

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- GitHub Issues: https://github.com/nutbitzuist/trading-signal-bridge/issues
- FastAPI Docs: https://fastapi.tiangolo.com
- Next.js Docs: https://nextjs.org/docs
