import {
  BookingStatus,
  KycStatus,
  PaymentStatus,
  RatingRole,
  RideStatus,
  TripStatus,
  UserMode,
  WalletTxnType
} from "./enums.js";

export type Id = string;

export interface UserProfile {
  id: Id;
  phoneNumber: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  preferredMode: UserMode;
  isDriverVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfile {
  userId: Id;
  kycStatus: KycStatus;
  badgeLabel?: string;
  aadhaarDocUrl?: string;
  drivingLicenseDocUrl?: string;
  vehicleRcDocUrl?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  rideCreationBlockedUntil?: string;
  lastRideCancellationReason?: string;
  lastRideCancellationMessage?: string;
  updatedAt: string;
}

export interface Ride {
  id: Id;
  driverId: Id;
  from: string;
  to: string;
  date: string;
  departureTime: string;
  seatsTotal: number;
  seatsAvailable: number;
  pricePerSeat: number;
  suggestedPricePerSeat?: number;
  womenOnly?: boolean;
  acAvailable?: boolean;
  routePolyline?: string;
  lastDriverEditAt?: string;
  lastDriverEditNote?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationMessage?: string;
  status: RideStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: Id;
  rideId: Id;
  riderId: Id;
  seatsBooked: number;
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  driverEditNoticeAt?: string;
  driverEditNote?: string;
  driverEditSummary?: string[];
  riderUpdateAcknowledgedAt?: string;
  riderCancellationReason?: string;
  driverCancellationReason?: string;
  driverCancellationMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: Id;
  rideId: Id;
  driverId: Id;
  startedAt?: string;
  endedAt?: string;
  status: TripStatus;
  activeBookingIds: Id[];
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: Id;
  availableBalance: number;
  escrowBalance: number;
  updatedAt: string;
}

export interface WalletTransaction {
  id: Id;
  userId: Id;
  amount: number;
  type: WalletTxnType;
  referenceId?: string;
  note?: string;
  createdAt: string;
}

export interface Rating {
  id: Id;
  bookingId: Id;
  fromUserId: Id;
  toUserId: Id;
  role: RatingRole;
  score: number;
  comment?: string;
  submittedAt: string;
}

export interface LiveLocationPoint {
  tripId: Id;
  driverId: Id;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface ChatMessage {
  id: Id;
  bookingId: Id;
  senderId: Id;
  message: string;
  createdAt: string;
}
