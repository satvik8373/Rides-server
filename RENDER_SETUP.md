# Render Deployment Guide

Deploy your AhmedabadCar backend to Render.com with Docker.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Connected to Render
3. **Environment Variables**: Prepared for production

## Quick Start (5 Minutes)

### 1. Create Web Service

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **"+ New"** → **"Web Service"**
3. Connect GitHub repository: `satvik8373/Rides-server`
4. Choose branch: `main`

### 2. Configure Service

| Setting | Value |
|---------|-------|
| **Name** | `rides-server` |
| **Environment** | Docker |
| **Region** | Singapore (closest to India) |
| **Branch** | main |
| **Build Command** | (automatic from Dockerfile) |
| **Start Command** | `node dist/server.js` |
| **Plan** | Free or Starter ($7/month) |

### 3. Add Environment Variables

Click **"Environment"** tab and add all variables:

```
JWT_SECRET=your-random-32-char-string
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key-with-newlines
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

GOOGLE_MAPS_API_KEY=your-maps-api-key

ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk0OWM3MzJmY2NiMjQyMjlhM2M5YmYxNmRhNDBmNzA5IiwiaCI6Im11cm11cjY0In0=

MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_FLOW_ID=your-flow-id
MSG91_TEMPLATE_ID=your-template-id

POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=ahmedabad_ride

COMMISSION_PERCENT=12
NODE_ENV=production
```

**⚠️ Important**: For `FIREBASE_PRIVATE_KEY`, ensure newlines are preserved:
- Replace `\n` with actual newlines in Render dashboard
- Or use escaped format: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----`

### 4. Deploy

1. Click **"Create Web Service"**
2. Render starts building Docker image
3. Watch build logs (should take 2-3 minutes)
4. Service goes live when status shows "Live"

### 5. Verify Deployment

Get your service URL (format: `https://rides-server-xxxxx.onrender.com`)

Test health endpoint:
```bash
curl https://rides-server-xxxxx.onrender.com/v1/health
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

---

## Complete Setup Guide

### Regional Options

**Recommended for India:**
- **Singapore** (closest, ~30ms latency)
- **Mumbai** (if available, 5ms latency)
- **Tokyo** (fallback, ~80ms latency)

```
Render doesn't have Delhi datacenter yet.
Singapore is the closest alternative.
```

### Environment Variables Explained

#### Authentication (JWT)
- `JWT_SECRET`: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `JWT_EXPIRES_IN`: How long access tokens last
- `JWT_REFRESH_EXPIRES_IN`: How long refresh tokens last

#### Razorpay (Payments)
- Get from: [dashboard.razorpay.com/app/keys](https://dashboard.razorpay.com/app/keys)
- Webhook secret: Generated when webhook is created

#### Firebase (Database & Auth)
- Download service account JSON from Firebase Console
- Extract: `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`
- Find database URL in Realtime Database settings

#### APIs
- `GOOGLE_MAPS_API_KEY`: From Google Cloud Console
- `ORS_API_KEY`: Already provided (routing service)

#### SMS (MSG91)
- Get from: [msg91.com/settings](https://msg91.com/settings)

#### Database (PostgreSQL)
- Use external database (AWS RDS, DigitalOcean, etc.)
- Format: `postgresql://user:password@host:5432/dbname`

---

## Troubleshooting

### Build Fails

Check logs in Render dashboard:

```
Common causes:
1. Dependencies not in pnpm-lock.yaml
2. TypeScript compilation errors
3. Docker build context missing files
```

**Solution**: 
- Verify `pnpm-lock.yaml` is committed to GitHub
- Check `Dockerfile` at repository root
- Ensure all source files are in git

### App Crashes After Deploy (Exit Code 128)

**Check logs:**
1. Click service in Render dashboard
2. Go to **"Logs"** tab
3. Look for error messages

**Common issues:**

**❌ Error: Port already in use**
```
Error: listen EADDRINUSE :::3000
```
Solution: Render automatically assigns ports. Ensure code listens on `process.env.PORT || 3000`

**❌ Error: Cannot find module**
```
Error: Cannot find module '@ahmedabadcar/shared'
```
Solution: Rebuild - push commit to GitHub, Render auto-redeploys

**❌ Error: Database connection failed**
```
Error: connect ECONNREFUSED your-postgres-host
```
Solution: Check `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD` in environment variables

**❌ Error: Firebase credentials invalid**
```
Error: Error initializing Firebase Admin SDK
```
Solution: Check `FIREBASE_PRIVATE_KEY` format - must have actual newlines, not `\n` strings

### Service Won't Start

1. **Check environment variables are set**:
   ```bash
   # In Render logs, you should see:
   # Environment variables loaded successfully
   ```

2. **Verify database is accessible**:
   ```bash
   # Try connecting from Render shell
   fly ssh console  # (if using Fly.io) or access Render logs
   ```

3. **Check database migrations**:
   ```bash
   # Ensure PostgreSQL schema exists
   psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f docs/postgresql-schema.sql
   ```

### Health Check Fails

Render's health checks look for HTTP 200 on `/v1/health`

**If failing:**
1. Check logs for startup errors
2. Verify `POSTGRES_*` variables are correct
3. Ensure database is running and accessible

```bash
# Test from Render shell
curl http://localhost:3000/v1/health
```

---

## Daily Operations

### View Logs

Render Dashboard → Service → **Logs** tab

### Restart Service

Render Dashboard → Service → **"More"** → **"Restart"**

### Redeploy Latest Code

1. Push to GitHub:
   ```bash
   git push origin main
   ```

2. Render auto-redeploys (if auto-deploy enabled)

   Or manually trigger:
   Render Dashboard → Service → **"Deploy"** button

### Update Environment Variables

1. Render Dashboard → Service → **"Environment"**
2. Edit variable value
3. Service auto-restarts with new values

### View Resource Usage

Render Dashboard → Service → **"Metrics"** tab

---

## Performance Tips

### 1. Use Connection Pooling

For PostgreSQL connections:
```javascript
// In postgres.service.ts
const pool = new Pool({
  max: 10,  // Max concurrent connections
  min: 2,   // Min idle connections
});
```

### 2. Enable Compression

Already in `app.ts`:
```typescript
app.use(helmet());  // Includes compression
app.use(cors());
```

### 3. Cache Static Data

- Cache ride types, payment methods in memory
- Invalidate on admin updates

### 4. Monitor Performance

- Render dashboard shows request/response times
- Check database query performance
- Optimize slow endpoints

---

## Cost Estimation

**Render Pricing:**
- Free tier: 50 hrs/month (not for production)
- Starter: $7/month (750 hrs/month)
- Standard: $12/month (unlimited hours)
- Custom: Pay-as-you-go

**For typical carpooling app:**
- Estimated: $12-20/month
- 1 web service + PostgreSQL add-on

---

## Scaling

### Horizontal Scaling (Multiple Instances)

**Render Plan**: Upgrade to Standard → More instances

### Vertical Scaling (Better CPU/Memory)

Render Dashboard → Service → **"Settings"** → Resize instance

### Database Optimization

- Add indexes on frequently queried columns
- Archive old data periodically
- Use read replicas for reporting

---

## Security Best Practices

### 1. Secret Management
✅ Use Render Environment Variables (never commit to Git)
✅ Rotate secrets regularly (especially `JWT_SECRET`)
✅ Use strong random values (32+ characters)

### 2. Network Security
✅ Enable HTTPS (automatic on Render)
✅ Restrict database access by IP
✅ Use VPC for database (if available)

### 3. API Security
✅ Helmet middleware (enabled in app.ts)
✅ CORS properly configured
✅ Rate limiting on auth endpoints

### 4. Data Protection
✅ Use PostgreSQL encryption for sensitive fields
✅ Hash passwords (use bcrypt)
✅ Encrypt Firebase private keys

---

## Monitoring & Alerts

### Set Up Alerts

Render Dashboard → Service → **"Settings"** → **"Notifications"**

Alert when:
- Build fails
- Deploy fails
- Health check fails
- High error rate

### Log Aggregation

Send logs to external service:
- Datadog
- New Relic
- LogRocket

Configure in app:
```javascript
// Add to app.ts
const logger = require('winston');
logger.add(new transports.Http({...}));
```

---

## Migration from Vercel

If migrating from Vercel:

1. **Update mobile app config**:
   ```typescript
   // apps/mobile/src/services/config.ts
   export const apiBaseUrl = 'https://rides-server-xxxxx.onrender.com/v1';
   ```

2. **Update payment webhooks**:
   - Razorpay webhook URL: `https://rides-server-xxxxx.onrender.com/v1/webhooks/razorpay`

3. **Database backup**:
   - Export Vercel Postgres backup
   - Import to new Render Postgres instance

4. **DNS update** (if using custom domain):
   ```
   CNAME rides-server-xxxxx.onrender.com
   ```

---

## Useful Commands

```bash
# Deploy changes
git push origin main

# View deployment status
# (Check Render dashboard)

# Access service logs
# (Render Dashboard → Logs)

# Restart service
# (Render Dashboard → More → Restart)

# SSH into service
# (Render Dashboard → Shell)

# Check service health
curl https://rides-server-xxxxx.onrender.com/v1/health
```

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **API Status**: https://rides-server-xxxxx.onrender.com/v1/health
- **GitHub Issues**: https://github.com/satvik8373/Rides-server/issues
- **Docker Docs**: https://docs.docker.com/
