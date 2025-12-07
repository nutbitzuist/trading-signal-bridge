# Deployment Guide: Vercel + Railway

This guide covers deploying the Trading Signal Bridge to:
- **Frontend**: Vercel
- **Backend**: Railway (with PostgreSQL and Redis)

## Prerequisites

1. GitHub account with the repository pushed
2. Vercel account (free tier works)
3. Railway account (free tier or paid for production)

---

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Choose the `backend` directory as the root

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **New** → **Database** → **Add PostgreSQL**
2. Railway will automatically create and link the database
3. The `DATABASE_URL` environment variable is auto-configured

### Step 3: Add Redis

1. Click **New** → **Database** → **Add Redis**
2. Railway will automatically create and link Redis
3. The `REDIS_URL` environment variable is auto-configured

### Step 4: Configure Environment Variables

In your Railway backend service, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_ENV` | `production` | |
| `DEBUG` | `false` | |
| `SECRET_KEY` | `<generate-random-64-chars>` | Use `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | `<generate-random-64-chars>` | Use `openssl rand -hex 32` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway reference |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Railway reference |
| `CORS_ORIGINS` | `["https://your-app.vercel.app"]` | Your Vercel domain |

### Step 5: Configure Railway Service

Railway should auto-detect the Dockerfile. If not, set:
- **Root Directory**: `backend`
- **Builder**: Dockerfile

The service will use the `railway.json` configuration automatically.

### Step 6: Deploy

1. Railway will automatically deploy on push to main branch
2. Wait for the build to complete
3. Click **Generate Domain** to get your Railway URL
4. Note the URL (e.g., `https://your-backend.up.railway.app`)

### Step 7: Verify Backend

Test the health endpoint:
```bash
curl https://your-backend.up.railway.app/api/v1/health
```

Expected response:
```json
{"status": "healthy", "timestamp": "..."}
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js. Verify:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 3: Set Environment Variables

Add these environment variables in Vercel:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | `Trading Signal Bridge` |

**Important**: Use your actual Railway backend URL!

### Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Your frontend will be available at `https://your-app.vercel.app`

### Step 5: Update CORS in Railway

After getting your Vercel URL, update the `CORS_ORIGINS` in Railway:
```
["https://your-app.vercel.app"]
```

Redeploy the backend for CORS changes to take effect.

---

## Part 3: Post-Deployment Configuration

### 1. Create Admin User

Register a new user through the frontend, then make them admin via database:

```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

You can run this in Railway's PostgreSQL console.

### 2. Configure TradingView Webhooks

Your webhook URL is:
```
https://your-backend.up.railway.app/api/v1/webhook/tradingview
```

### 3. Configure Expert Advisors

In your MT4/MT5 EA settings:
- **ServerURL**: `https://your-backend.up.railway.app/api/v1`
- **ApiKey**: Get from dashboard after creating an MT account

### 4. Add EA URL to MT4/MT5 Allowed List

In MT4/MT5:
1. Go to **Tools** → **Options** → **Expert Advisors**
2. Add: `https://your-backend.up.railway.app`

---

## Custom Domain Setup

### Vercel Custom Domain

1. Go to your project in Vercel
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Configure DNS as instructed

### Railway Custom Domain

1. Go to your backend service in Railway
2. Click **Settings** → **Networking** → **Custom Domain**
3. Add your custom domain
4. Configure DNS as instructed

After adding custom domains, update:
- `CORS_ORIGINS` in Railway
- `NEXT_PUBLIC_API_URL` in Vercel

---

## Environment Variables Reference

### Backend (Railway)

```env
# Required
APP_ENV=production
DEBUG=false
SECRET_KEY=<random-64-chars>
JWT_SECRET_KEY=<random-64-chars>
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ORIGINS=["https://your-frontend-domain.com"]

# Optional (with defaults)
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_ROUNDS=12
SIGNAL_EXPIRY_SECONDS=60
LOG_LEVEL=INFO
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
NEXT_PUBLIC_APP_NAME=Trading Signal Bridge
```

---

## Troubleshooting

### Backend Issues

**Build fails with "No module named..."**
- Check all dependencies are in `requirements.txt`
- Ensure `email-validator` is included

**Database connection error**
- Verify `DATABASE_URL` is using Railway's reference: `${{Postgres.DATABASE_URL}}`
- Check PostgreSQL service is running

**CORS errors**
- Update `CORS_ORIGINS` with exact frontend URL (including https://)
- Redeploy backend after changing

### Frontend Issues

**API calls fail**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend is running
- Verify CORS is configured

**Build fails**
- Check all dependencies in `package.json`
- Verify `zustand` is included

### EA Connection Issues

**"URL not in allowed list"**
- Add Railway URL to MT4/MT5 WebRequest allowed list
- Include `https://` in the URL

**"Invalid API key"**
- Verify API key from dashboard
- Check account is active

---

## Monitoring

### Railway Logs
- Go to your service → **Logs** tab
- View real-time logs and errors

### Vercel Logs
- Go to your project → **Logs** tab
- View function invocations and errors

### Health Checks

Backend health:
```bash
curl https://your-backend.up.railway.app/api/v1/health
```

---

## Scaling

### Railway
- Upgrade to paid plan for more resources
- Add more replicas in service settings
- Scale PostgreSQL as needed

### Vercel
- Free tier handles most use cases
- Pro tier for custom domains and more bandwidth

---

## Security Checklist

- [ ] Strong `SECRET_KEY` (64+ random characters)
- [ ] Strong `JWT_SECRET_KEY` (64+ random characters)
- [ ] `DEBUG=false` in production
- [ ] CORS configured for specific domains only
- [ ] HTTPS enforced (Railway and Vercel do this automatically)
- [ ] Database credentials not exposed
- [ ] Admin users properly configured
