# Fly.io Deployment Guide

This guide explains how to deploy the Ahmedabad Ride backend to Fly.io.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Flyctl CLI**: Install from [fly.io/docs/getting-started/installing-flyctl](https://fly.io/docs/getting-started/installing-flyctl/)
3. **Git Repository**: Already set up at [github.com/satvik8373/Rides-server](https://github.com/satvik8373/Rides-server)

## Installation Steps

### 1. Install Flyctl CLI

```bash
# On Windows (using Scoop)
scoop install flyctl

# Or download from: https://github.com/superfly/flyctl/releases
```

### 2. Login to Fly.io

```bash
fly auth login
```

This opens a browser window to authenticate with your Fly.io account.

### 3. Launch the Application

```bash
cd "e:\Ahemdabad Ride"
fly launch --image-label main
```

When prompted:
- **App Name**: `rides-server` (or choose a unique name)
- **Region**: Select `del` (Delhi) for closest to Ahmedabad
- **Database**: Skip (we're using external PostgreSQL)
- **Redis**: Skip
- **Review Configuration**: Type `y` to confirm

This creates/updates `fly.toml` with your app settings.

### 4. Set Environment Variables

Set all required environment variables on Fly.io:

```bash
fly secrets set \
  JWT_SECRET="your-32-char-random-string" \
  JWT_EXPIRES_IN="7d" \
  JWT_REFRESH_EXPIRES_IN="30d" \
  RAZORPAY_KEY_ID="your-razorpay-key" \
  RAZORPAY_KEY_SECRET="your-razorpay-secret" \
  RAZORPAY_WEBHOOK_SECRET="your-webhook-secret" \
  FIREBASE_PROJECT_ID="your-firebase-project" \
  FIREBASE_CLIENT_EMAIL="your-firebase-email" \
  FIREBASE_PRIVATE_KEY="your-firebase-private-key" \
  FIREBASE_DATABASE_URL="your-firebase-db-url" \
  GOOGLE_MAPS_API_KEY="your-google-maps-key" \
  ORS_API_KEY="eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk0OWM3MzJmY2NiMjQyMjlhM2M5YmYxNmRhNDBmNzA5IiwiaCI6Im11cm11cjY0In0=" \
  MSG91_AUTH_KEY="your-msg91-auth-key" \
  MSG91_FLOW_ID="your-flow-id" \
  MSG91_TEMPLATE_ID="your-template-id" \
  POSTGRES_HOST="your-postgres-host" \
  POSTGRES_PORT="5432" \
  POSTGRES_USER="postgres" \
  POSTGRES_PASSWORD="your-password" \
  POSTGRES_DB="ahmedabad_ride" \
  COMMISSION_PERCENT="12" \
  NODE_ENV="production"
```

Verify secrets were set:
```bash
fly secrets list
```

### 5. Configure PostgreSQL Connection (if using external database)

Update `POSTGRES_*` environment variables with your actual database credentials.

### 6. Deploy the Application

```bash
fly deploy
```

This will:
1. Build Docker image from Dockerfile
2. Push image to Fly.io registry
3. Deploy to the selected region
4. Start the application

Monitor deployment:
```bash
fly status
```

View logs:
```bash
fly logs
```

### 7. Verify Deployment

Get the app URL:
```bash
fly open
```

Or visit: `https://rides-server.fly.dev/v1/health`

Test the health endpoint:
```bash
curl https://rides-server.fly.dev/v1/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "AhmedabadCar API"
  }
}
```

## Deployment Options

### Region Selection

```bash
# List available regions
fly platform regions

# Recommended for India: del (Delhi), bom (Mumbai)
```

### Machine Configuration

Edit `fly.toml` to adjust resources:

```toml
[vm]
  size = "shared-cpu-1x"  # or "shared-cpu-2x", "performance-2x", etc.

[[vm]]
  memory_mb = 512  # Default, increase as needed
```

### Auto-scaling

The current `fly.toml` is configured with:
- **Min Machines**: 1 (always running)
- **Max Machines**: Auto-scales based on demand
- **Connection Limit**: 100 (hard), 80 (soft)

To modify:
```bash
fly autoscale set min=1 max=3
```

## Daily Operations

### View Application Status
```bash
fly status
```

### View Logs
```bash
fly logs
```

### SSH into Machine (for debugging)
```bash
fly ssh console
```

### Restart Application
```bash
fly restart
```

### Update Environment Variables
```bash
fly secrets set KEY=value
```

### Redeploy Latest Code
```bash
git push origin main
fly deploy
```

## Monitoring

### Enable Metrics
The app exports Prometheus metrics on port 9090. Configure Fly.io monitoring:

```bash
fly metrics dashboard
```

### Health Checks

Two health checks are configured:
1. **HTTP Check** (Primary): `GET /v1/health`
2. **TCP Check** (Fallback): Port 3000

Both use 30s interval with 5s grace period.

## Troubleshooting

### Build Fails

```bash
# Check build logs
fly logs --instance [instance-id]

# Rebuild from scratch
fly deploy --build-only
```

### App Not Responding

```bash
# Check machine status
fly machines list

# View recent logs
fly logs --lines 100

# Restart machines
fly restart
```

### Database Connection Issues

```bash
# Verify environment variables
fly secrets list

# SSH into machine to debug
fly ssh console
node -e "console.log(process.env.POSTGRES_HOST)"
```

### SSL Certificate Issues

Fly.io handles SSL automatically. If issues occur:
```bash
fly certs show
fly certs remove [cert-name]
fly certs create [domain]
```

## Cost Estimation

**Monthly Costs (approximate)**:
- 1 shared-cpu machine: $5/month
- Network egress: ~$0.02/GB
- Total: ~$5-10/month for typical usage

See [fly.io/docs/about/pricing](https://fly.io/docs/about/pricing/) for details.

## Next Steps

1. ✅ Configure environment variables
2. ✅ Deploy application
3. ✅ Test health endpoint
4. ⏳ Update mobile app API URL: `https://rides-server.fly.dev/v1`
5. ⏳ Set up domain/custom DNS
6. ⏳ Configure payment webhooks with new URL

## Useful Commands Reference

```bash
# Basic
fly launch                    # First time setup
fly deploy                    # Deploy changes
fly logs                      # View logs
fly status                    # App status

# Secrets & Config
fly secrets set KEY=value     # Set environment variable
fly secrets list              # List all secrets
fly secrets unset KEY         # Remove variable

# Machines & Scaling
fly machines list             # List running machines
fly machines restart          # Restart machines
fly autoscale set min=1 max=3 # Configure autoscaling

# Debugging
fly ssh console               # SSH into machine
fly doctor                    # Diagnose issues
fly ping                      # Test connectivity

# Cleanup
fly apps destroy rides-server # Delete app (caution!)
```

## Support

- Fly.io Docs: https://fly.io/docs/
- GitHub Issues: https://github.com/satvik8373/Rides-server/issues
- API Status: https://rides-server.fly.dev/v1/health
