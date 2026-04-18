# AhmedabadCar Monorepo

Production-oriented dual-mode carpooling platform for Indian users, with a React Native mobile client and Node/Express backend.

## Tech Stack

- Mobile: React Native (Expo prebuild), TypeScript, React Navigation (Stack + Bottom Tabs), Zustand, Axios, Firebase RTDB, Razorpay
- Backend: Node.js, Express, TypeScript, Zod, JWT auth, MSG91 OTP integration hooks, Firebase Admin hooks, Razorpay webhook support
- Shared: Type-safe API contracts, domain models, enums (`@ahmedabadcar/shared`)

## Workspace Layout

- `apps/mobile` React Native app
- `apps/api` backend API (`/v1/*`)
- `packages/shared` shared contracts and models
- `docs/postgresql-schema.sql` production DB schema blueprint
- `docs/firebase-rtdb-rules.json` RTDB rules contract

## Core Features Implemented

- OTP auth with JWT + refresh token lifecycle
- User profile setup and persistent session hydration
- Dual role switching (Rider/Driver) without logout
- Rider flow: ride search, ride detail, booking request, escrow payment confirmation, trip tracking, chat, ratings
- Driver flow: KYC upload/status (optional verification), post ride, booking request management, trip start/end, earnings/wallet flow
- Business rules:
  - KYC is optional for Post Ride; verified drivers get trust badge
  - Verified Driver badge support
  - SOS button on active trip screen
  - Escrow release on trip completion
  - Ratings hidden until both rider and driver submit

## Quick Start

1. Install dependencies

```bash
pnpm install
```

2. Configure env files

- Copy `apps/api/.env.example` to `apps/api/.env`
- Copy `apps/mobile/.env.example` to `apps/mobile/.env`
- For Firestore persistence, set Firebase Admin credentials in `apps/api/.env`:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - optional: `FIREBASE_DATABASE_URL`

3. Run backend

```bash
pnpm --filter @ahmedabadcar/api dev
```

4. Run mobile app

```bash
pnpm --filter @ahmedabadcar/mobile dev
```

If Post Ride schedule picker shows manual fields instead of device calendar, install missing picker dependency:

```bash
pnpm --filter @ahmedabadcar/mobile add @react-native-community/datetimepicker@8.4.4
```

## OTP Network Setup (Expo Go)

If OTP fails with `Network Error`, mobile is usually unable to reach local backend.

1. Start backend first:

```bash
pnpm --filter @ahmedabadcar/api dev
```

2. Keep mobile and backend on same Wi-Fi network.

3. In `apps/mobile/.env`, use either:
- `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/v1` (auto-mapped to Expo host IP by app config), or
- direct LAN URL: `EXPO_PUBLIC_API_BASE_URL=http://<your-pc-lan-ip>:4000/v1`

4. Test health from phone browser:
- `http://<your-pc-lan-ip>:4000/v1/health`

If health endpoint does not open on phone, OTP and all API calls will fail until local network access is fixed.

## API Surface

All APIs are under `/v1`:

- `auth`: `send-otp`, `verify-otp`, `refresh`, `logout`
- `users`: profile, mode, bootstrap, account delete
- `kyc`: upload, status, admin status update
- `rides`: create, search, my list, detail, ride bookings
- `booking`: request, respond, pay-order, confirm-payment, my list
- `trip`: start, end, live update, active
- `wallet`: balance and withdraw
- `ratings`: submit and reveal
- `chat`: list/send by booking
- `webhooks/razorpay`: webhook receiver

## Testing

- API tests are available in `apps/api/src/tests`.
- Mobile tests scaffold path: `apps/mobile/src/tests`.

Run all tests:

```bash
pnpm test
```

## Notes

- Backend now persists local dev data to `apps/api/.data/store.json` so users, rides, bookings, and wallets survive API restarts.
- Backend now also mirrors state to Firestore (when Firebase Admin env vars are configured), including:
  - `users`, `driverProfiles`, `rides`, `bookings`, `trips`, `wallets`
  - `walletTransactions`, `ratings`, `chatMessageSnapshots`, `liveLocations`, `pushTokens`
  - `activityLogs` (login/auth + trip/booking activity events)
- Phone numbers are normalized to E.164-style (Indian default: `+91XXXXXXXXXX`) to prevent duplicate accounts for the same mobile.
- For production deployment, migrate persistence to PostgreSQL repositories.
- Razorpay supports sandbox and mock fallback when keys are absent.
