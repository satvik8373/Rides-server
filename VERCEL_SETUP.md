# Vercel Deployment Setup - Quick Start

✅ **GitHub Repository**: https://github.com/satvik8373/Rides-server

## Next Steps: Deploy to Vercel

### Step 1: Verify GitHub Repository

1. Open: https://github.com/satvik8373/Rides-server
2. Verify you can see all files from the project
3. Check that `main` branch is set as default

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**

```bash
npm install -g vercel
cd "e:\Ahemdabad Ride"
vercel
```

Follow the prompts - it will auto-detect the monorepo structure.

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com
2. Log in with GitHub
3. Click "Add New" → "Project"
4. Select "Import Git Repository"
5. Paste: `https://github.com/satvik8373/Rides-server.git`
6. Click "Import"

### Step 3: Configure During Deployment

When Vercel asks for configuration:

**Build Command:**
```
pnpm install && pnpm --filter @ahmedabadcar/shared build && pnpm --filter @ahmedabadcar/api build
```

**Output Directory:**
```
apps/api/dist
```

**Root Directory:**
Leave blank (Vercel will auto-detect it's a monorepo)

### Step 4: Add Environment Variables

**CRITICAL**: Before deployment completes, add these environment variables in Vercel dashboard:

#### Production Variables (Required)

```
NODE_ENV = production
PORT = 3000
APP_BASE_URL = https://your-app.vercel.app
MOBILE_BASE_URL = ahmedabadcar://

JWT_ACCESS_SECRET = <generate-32-char-secret>
JWT_REFRESH_SECRET = <generate-32-char-secret>
JWT_ACCESS_EXPIRY = 15m
JWT_REFRESH_EXPIRY = 30d

RAZORPAY_KEY_ID = <your-key>
RAZORPAY_KEY_SECRET = <your-secret>
RAZORPAY_WEBHOOK_SECRET = <webhook-secret>

GOOGLE_MAPS_API_KEY = <your-key>
ORS_API_KEY = <your-key>

MSG91_FLOW_ID = <your-flow-id>
MSG91_TEMPLATE_ID = <your-template-id>
MSG91_AUTH_KEY = <your-auth-key>
MSG91_SENDER = AHMCRP

FIREBASE_PROJECT_ID = <your-id>
FIREBASE_CLIENT_EMAIL = <your-email>
FIREBASE_PRIVATE_KEY = <your-private-key>
FIREBASE_DATABASE_URL = <your-url>

COMMISSION_PERCENT = 12
```

#### Generate JWT Secrets

Run in PowerShell:
```powershell
# Generate two random 32-character secrets
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

Or use NodeJS:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Redeploy After Environment Setup

After adding environment variables:
1. Vercel will automatically trigger a redeploy
2. Check build logs for errors
3. Test deployment with `curl https://your-app.vercel.app/v1/health`

## Vercel Costs & Performance

- **Free Tier**: 100GB bandwidth/month, unlimited requests, auto-scaling
- **Pro Tier**: $20/month (recommended for production)
- **India Region**: Set `"regions": ["bom1"]` in `vercel.json` for lower latency

## After Deployment

### Update Mobile App Config

File: `apps/mobile/src/services/config.ts`

```typescript
export const appConfig = {
  apiBaseUrl: 'https://your-app-name.vercel.app/v1',
  // ... other config
};
```

### Configure Razorpay Webhook

1. Go to Razorpay Dashboard → Webhooks
2. Add webhook URL: `https://your-app.vercel.app/v1/webhooks/razorpay`
3. Set webhook secret to match `RAZORPAY_WEBHOOK_SECRET`

### Monitor Performance

```bash
vercel logs --tail    # Stream logs
vercel status         # Check deployment status
vercel analytics      # View performance metrics
```

## Common Issues

**Build Fails: "Cannot find module"**
- Solution: Vercel needs to install pnpm. Add `.npmrc` to root with:
  ```
  shamefully-hoist=true
  strict-peer-dependencies=false
  ```

**500 Error on /v1/health**
- Check: Environment variables are set correctly
- Check: Firebase credentials format (newlines in FIREBASE_PRIVATE_KEY)

**Rides search returns empty**
- Verify: Location services are configured (GOOGLE_MAPS_API_KEY, ORS_API_KEY)
- Test locally first to debug

**Payment webhook not working**
- Verify: Razorpay webhook URL and secret match exactly

## Getting Help

- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: https://github.com/satvik8373/Rides-server/issues
- **Check Logs**: `vercel logs` in terminal

## Status Checklist

- ✅ Git repository initialized
- ✅ Code pushed to GitHub
- ✅ vercel.json configured
- ✅ Build scripts ready
- ⏳ Deploy to Vercel (next step)
- ⏳ Add environment variables (next step)
- ⏳ Test deployment (after env setup)
- ⏳ Update mobile app config (after deployment)
- ⏳ Configure webhooks (after deployment)

---

**Your GitHub URL**: https://github.com/satvik8373/Rides-server
**Deployment time**: ~2-5 minutes
**Downtime after env setup**: ~1-2 minutes (auto-redeploy)
