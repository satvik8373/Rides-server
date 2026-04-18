# Vercel Deployment - Setup Complete ✅

Your AhmedabadCar backend is ready for deployment to Vercel!

## What's Been Done

✅ **Git Repository Initialized**
- Repository: https://github.com/satvik8373/Rides-server
- Branch: `main` (default)
- All files committed and pushed to GitHub

✅ **Deployment Configuration**
- `vercel.json` created with build and routing configuration
- TypeScript build fixed for monorepo structure
- Production build tested locally (`pnpm build` succeeds)
- Deployment scripts verified

✅ **Documentation Created**
- `DEPLOYMENT.md` - Complete deployment guide with troubleshooting
- `VERCEL_SETUP.md` - Quick start guide
- `.env.example` - Updated with all required variables
- `README.md` - Comprehensive project documentation

## Next Steps: Deploy to Vercel

### 1. Create Vercel Account (if needed)
- Go to https://vercel.com
- Sign up with GitHub (recommended)
- Authorize Vercel to access your GitHub account

### 2. Import Your Repository

**Option A: CLI Deployment** (Recommended)
```bash
npm install -g vercel
cd "e:\Ahemdabad Ride"
vercel
```

**Option B: Dashboard**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import repository: `satvik8373/Rides-server`
4. Vercel auto-detects it's a monorepo

### 3. Configure Build Settings

Vercel will ask for these - use these values:

**Build Command:**
```
pnpm install --frozen-lockfile && pnpm --filter @ahmedabadcar/shared build && pnpm --filter @ahmedabadcar/api build
```

**Output Directory:**
```
apps/api/dist
```

**Root Directory:**
Leave blank

### 4. Add Environment Variables (CRITICAL)

After deployment starts, go to **Project Settings → Environment Variables** and add:

**Essential Variables:**
```
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://your-vercel-url.vercel.app
MOBILE_BASE_URL=ahmedabadcar://

JWT_ACCESS_SECRET=[generate-32-chars]
JWT_REFRESH_SECRET=[generate-32-chars]
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

RAZORPAY_KEY_ID=[your-key]
RAZORPAY_KEY_SECRET=[your-secret]
RAZORPAY_WEBHOOK_SECRET=[your-webhook-secret]

GOOGLE_MAPS_API_KEY=[your-key]
ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk0OWM3MzJmY2NiMjQyMjlhM2M5YmYxNmRhNDBmNzA5IiwiaCI6Im11cm11cjY0In0=

MSG91_FLOW_ID=[your-flow]
MSG91_TEMPLATE_ID=[your-template]
MSG91_AUTH_KEY=[your-key]
MSG91_SENDER=AHMCRP

FIREBASE_PROJECT_ID=[your-id]
FIREBASE_CLIENT_EMAIL=[your-email]
FIREBASE_PRIVATE_KEY=[your-key-with-newlines]
FIREBASE_DATABASE_URL=[your-url]

COMMISSION_PERCENT=12
```

**Generate JWT Secrets (Run in PowerShell):**
```powershell
# Copy output to Vercel ENV vars (do this twice for both secrets)
[Convert]::ToBase64String([byte[]]$(1..32 | % {Get-Random -Maximum 256}))
```

### 5. Redeploy After Env Setup

After adding environment variables, Vercel will automatically redeploy. Wait for deployment to complete (2-5 minutes).

### 6. Test Your Deployment

Once deployed, test with:

```bash
# Test health endpoint
curl https://your-app-name.vercel.app/v1/health

# Expected response:
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "AhmedabadCar API"
  }
}
```

## Important Notes

### India Region (Recommended)
For better performance with Indian users, modify `vercel.json`:

```json
{
  "regions": ["bom1"],
  ...
}
```

Then commit and push:
```bash
git add vercel.json
git commit -m "Update: Set Vercel region to India"
git push origin main
```

### Mobile App Configuration
After deployment, update mobile app:

**File:** `apps/mobile/src/services/config.ts`
```typescript
export const appConfig = {
  apiBaseUrl: 'https://YOUR-VERCEL-URL.vercel.app/v1',
  // ... rest of config
};
```

Then rebuild mobile app:
```bash
pnpm --filter @ahmedabadcar/mobile dev
```

## Costs

- **Free Tier:** 100GB bandwidth/month, unlimited deployments
- **Pro:** $20/month (recommended for production)
- No charge for dyno hours or function invocations on free tier

## Monitoring

### View Logs
```bash
vercel logs --tail
```

### Check Status
```bash
vercel status
```

### Analytics
```bash
vercel analytics
```

## Common Issues & Fixes

### "Build failed"
- Check build command is correct
- Verify all environment variables are set
- Check logs with `vercel logs --tail`

### 500 errors on specific endpoints
- Verify Firebase credentials format
- Check API keys for location services
- Review error logs in Vercel dashboard

### Webhook not receiving requests
- Verify webhook URL in Razorpay dashboard
- Check webhook secret matches `RAZORPAY_WEBHOOK_SECRET`
- Test with Razorpay sandbox first

## Deployment Complete!

**Repository:** https://github.com/satvik8373/Rides-server  
**Status:** Ready for Vercel deployment  
**Build Tested:** ✅ Locally verified  

Start the deployment process now by:
1. Creating Vercel account (if needed)
2. Importing the GitHub repository
3. Adding environment variables
4. Triggering redeploy after env setup

**Estimated time:** 5-10 minutes including environment variable setup

---

Need help? Check:
- `DEPLOYMENT.md` for detailed troubleshooting
- `VERCEL_SETUP.md` for step-by-step guide
- Vercel docs: https://vercel.com/docs
