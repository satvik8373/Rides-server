# Fly.io Deployment Quick Start

## 5-Minute Setup

### 1. Install Flyctl
```powershell
# Windows
scoop install flyctl

# Or: choco install flyctl
# Or download from: https://github.com/superfly/flyctl/releases
```

### 2. Login
```bash
fly auth login
```

### 3. Deploy
```bash
cd "e:\Ahemdabad Ride"
fly launch --image-label main
```

When prompted, choose:
- App name: `rides-server`
- Region: `del` (Delhi)
- Skip database setup

### 4. Set Secrets
```bash
fly secrets set \
  JWT_SECRET="your-secret-key" \
  RAZORPAY_KEY_ID="your-key" \
  RAZORPAY_KEY_SECRET="your-secret" \
  FIREBASE_PROJECT_ID="your-project" \
  FIREBASE_CLIENT_EMAIL="your-email" \
  FIREBASE_PRIVATE_KEY="your-key" \
  FIREBASE_DATABASE_URL="your-url" \
  POSTGRES_HOST="your-host" \
  POSTGRES_USER="postgres" \
  POSTGRES_PASSWORD="your-password" \
  POSTGRES_DB="ahmedabad_ride"
```

### 5. Deploy
```bash
fly deploy
```

### 6. Test
```bash
curl https://rides-server.fly.dev/v1/health
```

## Regional Options

```bash
# Delhi (Recommended for Ahmedabad)
fly launch --region del

# Mumbai
fly launch --region bom

# Singapore (Backup)
fly launch --region sin
```

## Environment Variables Needed

- **JWT_SECRET**: Random 32+ character string
- **JWT_EXPIRES_IN**: "7d" (7 days)
- **JWT_REFRESH_EXPIRES_IN**: "30d" (30 days)
- **RAZORPAY_KEY_ID**: From Razorpay dashboard
- **RAZORPAY_KEY_SECRET**: From Razorpay dashboard
- **RAZORPAY_WEBHOOK_SECRET**: Generated after webhook setup
- **FIREBASE_PROJECT_ID**: From Firebase console
- **FIREBASE_CLIENT_EMAIL**: From service account JSON
- **FIREBASE_PRIVATE_KEY**: From service account JSON
- **FIREBASE_DATABASE_URL**: Your Realtime DB URL
- **GOOGLE_MAPS_API_KEY**: Your Maps API key
- **ORS_API_KEY**: `eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk0OWM3MzJmY2NiMjQyMjlhM2M5YmYxNmRhNDBmNzA5IiwiaCI6Im11cm11cjY0In0=`
- **MSG91_AUTH_KEY**: From MSG91 dashboard
- **MSG91_FLOW_ID**: Your flow ID
- **MSG91_TEMPLATE_ID**: Your template ID
- **POSTGRES_HOST**: Database host
- **POSTGRES_PORT**: "5432"
- **POSTGRES_USER**: "postgres"
- **POSTGRES_PASSWORD**: Your password
- **POSTGRES_DB**: "ahmedabad_ride"
- **COMMISSION_PERCENT**: "12"
- **NODE_ENV**: "production"

## View Logs
```bash
fly logs
```

## Restart App
```bash
fly restart
```

## Check Status
```bash
fly status
```

## SSH Into Machine
```bash
fly ssh console
```

## More Info
See `FLY_IO_SETUP.md` for complete documentation.
