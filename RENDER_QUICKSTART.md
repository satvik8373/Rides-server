# Render Quick Start

Deploy in 5 minutes to Render.com

## 1. Go to Render Dashboard

https://render.com/dashboard

## 2. Create Web Service

Click **"+ New"** → **"Web Service"**

## 3. Connect GitHub

Select: `satvik8373/Rides-server`

## 4. Configure

| Setting | Value |
|---------|-------|
| Name | `rides-server` |
| Environment | Docker |
| Region | Singapore |
| Branch | main |
| Start Command | `node dist/server.js` |

## 5. Add Environment Variables

Click **"Environment"** tab and paste:

```
JWT_SECRET=generate-32-random-chars
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=your-database-url
POSTGRES_HOST=your-postgres-host
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=ahmedabad_ride
ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk0OWM3MzJmY2NiMjQyMjlhM2M5YmYxNmRhNDBmNzA5IiwiaCI6Im11cm11cjY0In0=
NODE_ENV=production
```

## 6. Deploy

Click **"Create Web Service"** and wait ~2 minutes

## 7. Test

```bash
curl https://your-service-url.onrender.com/v1/health
```

Expected:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "AhmedabadCar API"
  }
}
```

## If Deploy Fails

1. Check **Logs** tab in Render dashboard
2. Look for error messages (usually missing env vars)
3. Verify all environment variables are set
4. Common issue: `FIREBASE_PRIVATE_KEY` needs actual newlines

## Common Errors

**Error: Exit code 128**
- Missing environment variables
- Database not accessible
- Check logs for details

**Error: Cannot find module**
- Rebuild by pushing to GitHub: `git push origin main`
- Render auto-redeploys

**Error: Cannot connect to database**
- Verify `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Check database is running and firewall allows Render IP

## For Complete Setup

See **RENDER_SETUP.md** for full documentation.
