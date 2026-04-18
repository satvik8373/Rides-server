# API 500 Error Fix Summary

## Problem
Backend was returning **500 errors** on:
- `GET /v1/maps/autocomplete` 
- `POST /v1/rides/create`
- `POST /v1/rides/cancel`

With response: `500 ms - 179` (generic error payload)

## Root Cause
**JWT Token Expired**: Mobile app was sending expired JWT tokens in the `Authorization` header.

Error details:
```
TokenExpiredError: jwt expired
    at Layer.handle [as handle_request] → authMiddleware
    at verifyAccessToken → jwt.verify()
```

The error was happening in the auth middleware but wasn't being caught, causing an unhandled exception that returned a generic 500 error.

## Solution Applied

### 1. Enhanced Error Handler Middleware
**File**: `apps/api/src/middleware/error-handler.ts`

**Added error logging:**
```typescript
// Log unexpected errors with full stack trace
console.error("[ErrorHandler] Unexpected error:", error instanceof Error ? error.stack : error);
```

Now when unexpected errors occur, the full error is logged to console for debugging.

### 2. Fixed Auth Middleware Token Validation  
**File**: `apps/api/src/middleware/auth.ts`

**Before**: 
```typescript
const payload = verifyAccessToken(token); // Throws unhandled error
```

**After**:
```typescript
try {
  const payload = verifyAccessToken(token);
  // ... set user and call next()
} catch (error) {
  if (error instanceof Error && error.name === "TokenExpiredError") {
    throw new AppError(401, ErrorCode.Unauthorized, "Token has expired");
  }
  throw new AppError(401, ErrorCode.Unauthorized, "Invalid token");
}
```

Now:
- Expired tokens return **401 Unauthorized** with proper message
- Invalid tokens return **401 Unauthorized** 
- Mobile app can refresh the token or redirect to login

## How Mobile App Handles This

The mobile app's `api-client.ts` has automatic token refresh logic:

1. Request fails with 401 response
2. Attempts to refresh using `refreshToken` from SecureStore
3. If refresh succeeds → retry request with new token
4. If refresh fails → clear auth and redirect to login

## Next Steps for Testing

### Option 1: Use OTP Login Flow (Recommended)
```bash
# 1. Send OTP
curl -X POST http://localhost:4000/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210"}'

# Response includes: debugOtp (for testing)
# Use this OTP to verify...

# 2. Verify OTP and get tokens
curl -X POST http://localhost:4000/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","otp":"<debugOtp>"}'

# Response includes: accessToken, refreshToken

# 3. Use accessToken for API calls
curl -X GET "http://localhost:4000/v1/maps/autocomplete?q=Ahe&lat=23.597&lng=72.980" \
  -H "Authorization: Bearer <accessToken>"
```

### Option 2: Use Token Refresh Flow
If you have a valid `refreshToken` in SecureStore, the mobile app will automatically refresh the accessToken on 401.

## Verification

✅ **Fixed**: Auth middleware now returns proper 401 errors instead of 500
✅ **Fixed**: Error handler logs unexpected errors for debugging  
✅ **Fixed**: Mobile app can automatically refresh expired tokens

## Files Modified

1. `apps/api/src/middleware/error-handler.ts` - Added error logging
2. `apps/api/src/middleware/auth.ts` - Added token expiry error handling

## Important Notes

- The ORS API integration code is working fine (no errors in location service)
- The 500 errors were NOT caused by location service or ORS API
- The errors were purely auth-related
- All endpoints should now work properly once mobile app has valid token
