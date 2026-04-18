# Deployment Guide - AhmedabadCar Backend (Vercel)

Complete guide to deploy the AhmedabadCar backend API to Vercel.

## Prerequisites

✅ GitHub account  
✅ Vercel account (free tier available)  
✅ Node.js 18+ and pnpm installed locally  
✅ All API keys configured (see `.env.example`)  

## Step 1: Prepare Repository

### Initialize Git (if not already done)

```bash
cd Rides-server
git init
git add .
git commit -m "Initial commit - AhmedabadCar backend"
git branch -M main
```

### Add Remote and Push

```bash
git remote add origin https://github.com/satvik8373/Rides-server.git
git push -u origin main
```

## Step 2: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

## Step 3: Deploy to Vercel

### Option A: CLI Deployment (Recommended)

```bash
vercel
```

Follow the prompts:
- Link to existing project? → No
- Set project name? → `rides-server` (or your choice)
- Set production branch? → `main`
- Build command? → `pnpm install && pnpm --filter @ahmedabadcar/shared build && pnpm --filter @ahmedabadcar/api build`
- Output directory? → `apps/api/dist`
- Development command? → Leave blank

### Option B: Dashboard Deployment

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Paste: `https://github.com/satvik8373/Rides-server.git`
5. Click "Import"
6. Fill project details and click "Deploy"

## Step 4: Configure Environment Variables

After deployment starts, add environment variables:

### In Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.example`:

**Required Variables:**

```
NODE_ENV = production
PORT = 3000
APP_BASE_URL = https://your-app-name.vercel.app
MOBILE_BASE_URL = ahmedabadcar://

JWT_ACCESS_SECRET = [generate-strong-32-char-secret]
JWT_REFRESH_SECRET = [generate-strong-32-char-secret]
JWT_ACCESS_EXPIRY = 15m
JWT_REFRESH_EXPIRY = 30d

RAZORPAY_KEY_ID = [your-key]
RAZORPAY_KEY_SECRET = [your-secret]
RAZORPAY_WEBHOOK_SECRET = [your-webhook-secret]

GOOGLE_MAPS_API_KEY = [your-key]
ORS_API_KEY = [your-key]

MSG91_FLOW_ID = [your-flow-id]
MSG91_TEMPLATE_ID = [your-template-id]
MSG91_AUTH_KEY = [your-auth-key]
MSG91_SENDER = AHMCRP

FIREBASE_PROJECT_ID = [your-project-id]
FIREBASE_CLIENT_EMAIL = [your-email]
FIREBASE_PRIVATE_KEY = [your-private-key-with-newlines]
FIREBASE_DATABASE_URL = [your-database-url]

COMMISSION_PERCENT = 12
```

**How to Generate Strong Secrets:**

```bash
# Generate 32-character random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**How to Add Multi-line Keys (Firebase):**

For `FIREBASE_PRIVATE_KEY`:
- Copy the entire private key content
- Paste into Vercel's textarea
- Vercel will handle the newlines automatically

## Step 5: Trigger Deployment

After adding environment variables:

1. Redeploy with `vercel --prod`
2. Or wait for automatic redeploy
3. Check build logs in Vercel dashboard

## Step 6: Test Deployment

### Health Check

```bash
curl https://your-app-name.vercel.app/v1/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "AhmedabadCar API",
    "now": "2026-04-18T10:30:00Z",
    "postgresEnabled": false,
    "postgresHealthy": false
  }
}
```

### Search Test

```bash
curl -X POST https://your-app-name.vercel.app/v1/rides/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-jwt-token>" \
  -d '{
    "from": "Himatnagar",
    "to": "Gandhinagar",
    "date": "2026-04-20"
  }'
```

## Step 7: Connect to Mobile App

Update mobile app's API base URL:

**File:** `apps/mobile/src/services/config.ts`

```typescript
export const appConfig = {
  apiBaseUrl: 'https://your-app-name.vercel.app/v1',
  // ... other config
};
```

Rebuild and test:
```bash
pnpm --filter @ahmedabadcar/mobile dev
```

## Troubleshooting

### Build Fails: "Cannot find module '@ahmedabadcar/shared'"

**Solution:** Vercel doesn't handle pnpm workspaces automatically. Create `.npmrc`:

```ini
shamefully-hoist=true
strict-peer-dependencies=false
```

Add to root directory.

### Environment Variables Not Loading

1. Verify variables are set in Vercel dashboard
2. Redeploy after setting variables
3. Check build logs for warnings

### "Port 3000 is already in use"

Vercel auto-assigns ports. This error shouldn't occur on Vercel. If using locally with `vercel dev`:

```bash
vercel dev --port 5000
```

### Firebase Authentication Errors

1. Verify `FIREBASE_PRIVATE_KEY` has proper newlines
2. Check `FIREBASE_PROJECT_ID` matches Firebase console
3. Ensure Firebase Admin SDK is initialized

### Razorpay Webhook Not Triggering

1. Update webhook URL in Razorpay dashboard to: `https://your-app-name.vercel.app/v1/webhooks/razorpay`
2. Verify webhook secret matches `RAZORPAY_WEBHOOK_SECRET`
3. Test with Razorpay sandbox first

## Monitoring & Debugging

### View Logs

```bash
vercel logs
```

### Debug Errors

```bash
vercel logs --tail
```

### Check Deployment Status

```bash
vercel status
```

### Rollback to Previous Deployment

```bash
vercel rollback
```

## Performance Optimization

### Vercel Specific Settings

Add to `vercel.json`:

```json
{
  "regions": ["iad1"],
  "functions": {
    "apps/api/dist/server.js": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### Regions

Available Vercel regions:
- `iad1` - N. Virginia (USA)
- `sfo1` - N. California (USA)
- `bom1` - Mumbai (India) ⭐ For Indian users

Change to India region for better latency:

```json
{
  "regions": ["bom1"]
}
```

## Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as shown
4. Wait for SSL certificate (usually instant)

## Continuous Deployment

Vercel automatically deploys on:
- Push to main branch
- Merge pull requests

### Branch Preview URLs

Create pull request → automatic preview URL generated

### Environment by Branch

Set different environment variables for different branches:
1. Project Settings → Environment Variables
2. Select branch in dropdown
3. Override variables

## Cost Considerations

- **Free tier:** 100 GB bandwidth/month, 1000 deployments/month
- **Paid:** $20/month + usage
- For production: Consider upgrading to Pro tier ($20/month)

## Next Steps

1. ✅ Deploy backend
2. 🔄 Connect mobile app to deployed backend
3. 📊 Monitor performance in Vercel dashboard
4. 🔐 Set up custom domain
5. 🚀 Enable CI/CD for automatic deployments

## Support

- Vercel Docs: https://vercel.com/docs
- GitHub Issues: https://github.com/satvik8373/Rides-server/issues
- Email: support@ahmedabadcar.com

## Security Checklist

- ✅ All sensitive keys in environment variables (not in code)
- ✅ JWT secrets are strong (32+ characters)
- ✅ Firebase private key properly formatted with newlines
- ✅ CORS configured for mobile app domain
- ✅ Razorpay webhook secret matches backend
- ✅ Production environment set correctly
- ✅ Error details not exposed in responses
