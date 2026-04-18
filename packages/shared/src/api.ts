import { z } from "zod";
import {
  BookingStatus,
  ErrorCode,
  KycStatus,
  PaymentStatus,
  RatingRole,
  RideStatus,
  TripStatus,
  UserMode
} from "./enums.js";
import type {
  Booking,
  ChatMessage,
  DriverProfile,
  LiveLocationPoint,
  Rating,
  Ride,
  Trip,
  UserProfile,
  Wallet,
  WalletTransaction
} from "./models.js";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId?: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

export const sendOtpSchema = z.object({
  phoneNumber: z.string().min(10).max(15)
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  otp: z.string().min(4).max(6)
});

export interface SendOtpInput extends z.infer<typeof sendOtpSchema> {}
export interface VerifyOtpInput extends z.infer<typeof verifyOtpSchema> {}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  driverProfile: DriverProfile;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface DeleteAccountResponse {
  deleted: true;
  deletedAt: string;
  summary: {
    ridesDeleted: number;
    bookingsDeleted: number;
    tripsDeleted: number;
    chatsDeleted: number;
    ratingsDeleted: number;
  };
}

export interface ProfileSetupInput {
  fullName: string;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface ModeUpdateInput {
  mode: UserMode;
}

export interface KycUploadInput {
  aadhaarDocUrl: string;
  drivingLicenseDocUrl: string;
  vehicleRcDocUrl: string;
  vehicleNumber: string;
  vehicleModel: string;
}

export interface KycStatusUpdateInput {
  userId: string;
  status: KycStatus;
  rejectionReason?: string;
}

export interface RideCreateInput {
  from: string;
  to: string;
  date: string;
  departureTime: string;
  seatsTotal: number;
  pricePerSeat: number;
  womenOnly?: boolean;
  acAvailable?: boolean;
  routePolyline?: string;
}

export interface RideUpdateInput {
  from?: string;
  to?: string;
  date?: string;
  departureTime?: string;
  seatsTotal?: number;
  pricePerSeat?: number;
  womenOnly?: boolean;
  acAvailable?: boolean;
  routePolyline?: string;
  updateNote?: string;
}

export interface RideCancelInput {
  rideId: string;
  reason: string;
  customMessage?: string;
}

export interface RideSearchInput {
  from: string;
  to: string;
  date: string;
  maxPrice?: number;
  womenOnly?: boolean;
  acAvailable?: boolean;
}

export interface BookingRequestInput {
  rideId: string;
  seatsBooked: number;
}

export interface BookingRespondInput {
  bookingId: string;
  action: "ACCEPT" | "REJECT";
}

export interface BookingCancelInput {
  bookingId: string;
  reason?: string;
}

export interface BookingAcknowledgeUpdateInput {
  bookingId: string;
}

export interface CreatePaymentOrderInput {
  bookingId: string;
}

export interface ConfirmPaymentInput {
  bookingId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface TripStartInput {
  rideId: string;
}

export interface TripEndInput {
  tripId: string;
}

export interface LiveLocationUpdateInput {
  tripId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export interface WalletWithdrawInput {
  amount: number;
  upiId: string;
}

export interface RatingSubmitInput {
  bookingId: string;
  score: number;
  comment?: string;
  role: RatingRole;
}

export interface RatingsRevealResponse {
  visible: boolean;
  ratings: Rating[];
}

export interface RideWithDriver extends Ride {
  driver: UserProfile;
  driverProfile: DriverProfile;
  isPartialRoute?: boolean; // True if driver going further than rider's search destination
  riderDropPoint?: string; // Where rider will be dropped (may differ from Ride.to if it's a partial route)
}

export interface BookingWithDetails extends Booking {
  ride: Ride;
  rider: UserProfile;
  driver: UserProfile;
}

export interface WalletResponse {
  wallet: Wallet;
  transactions: WalletTransaction[];
}

export interface ActiveTripResponse {
  trip: Trip;
  liveLocation?: LiveLocationPoint;
}

export interface BookingChatResponse {
  bookingId: string;
  messages: ChatMessage[];
}

export interface AppBootstrapResponse {
  user: UserProfile;
  driverProfile: DriverProfile;
  mode: UserMode;
  activeBooking?: BookingWithDetails;
  activeTrip?: ActiveTripResponse;
  wallet: WalletResponse;
}

export interface RideStatusUpdateInput {
  rideId: string;
  status: RideStatus;
}

export interface BookingStatusUpdateInput {
  bookingId: string;
  status: BookingStatus;
}

export interface TripStatusUpdateInput {
  tripId: string;
  status: TripStatus;
}

export interface PaymentStatusUpdateInput {
  bookingId: string;
  paymentStatus: PaymentStatus;
}
