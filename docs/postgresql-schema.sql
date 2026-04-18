-- AhmedabadCar relational schema (PostgreSQL)
-- Use this schema when replacing the in-memory store with persistent repositories.

CREATE TYPE user_mode AS ENUM ('RIDER', 'DRIVER');
CREATE TYPE kyc_status AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE ride_status AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE booking_status AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE trip_status AS ENUM ('NOT_STARTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'IN_ESCROW', 'RELEASED', 'REFUNDED', 'FAILED');
CREATE TYPE wallet_txn_type AS ENUM ('ESCROW_CREDIT', 'PAYOUT_RELEASE', 'WITHDRAWAL', 'COMMISSION_DEBIT', 'REFUND_DEBIT', 'BONUS_CREDIT');
CREATE TYPE rating_role AS ENUM ('RIDER_TO_DRIVER', 'DRIVER_TO_RIDER');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(16) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  email VARCHAR(160),
  avatar_url TEXT,
  gender VARCHAR(16),
  preferred_mode user_mode NOT NULL DEFAULT 'RIDER',
  is_driver_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE driver_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  kyc_status kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  badge_label VARCHAR(80),
  aadhaar_doc_url TEXT,
  driving_license_doc_url TEXT,
  vehicle_rc_doc_url TEXT,
  vehicle_number VARCHAR(30),
  vehicle_model VARCHAR(80),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rides (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES users(id),
  origin_text VARCHAR(180) NOT NULL,
  destination_text VARCHAR(180) NOT NULL,
  ride_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  seats_total INT NOT NULL,
  seats_available INT NOT NULL,
  price_per_seat NUMERIC(10, 2) NOT NULL,
  suggested_price_per_seat NUMERIC(10, 2),
  women_only BOOLEAN DEFAULT FALSE,
  ac_available BOOLEAN DEFAULT FALSE,
  route_polyline TEXT,
  status ride_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id),
  rider_id UUID NOT NULL REFERENCES users(id),
  seats_booked INT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'REQUESTED',
  payment_status payment_status NOT NULL DEFAULT 'CREATED',
  razorpay_order_id VARCHAR(80),
  razorpay_payment_id VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trips (
  id UUID PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id),
  driver_id UUID NOT NULL REFERENCES users(id),
  status trip_status NOT NULL DEFAULT 'ACTIVE',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trip_bookings (
  trip_id UUID NOT NULL REFERENCES trips(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  PRIMARY KEY (trip_id, booking_id)
);

CREATE TABLE wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  available_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  escrow_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(10, 2) NOT NULL,
  txn_type wallet_txn_type NOT NULL,
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  role rating_role NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment VARCHAR(280),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, role)
);

CREATE TABLE refresh_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  event_id VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

