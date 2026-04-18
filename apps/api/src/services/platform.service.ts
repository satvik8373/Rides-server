import type {
  ActiveTripResponse,
  AppBootstrapResponse,
  AuthResponse,
  BookingAcknowledgeUpdateInput,
  BookingCancelInput,
  BookingChatResponse,
  BookingRequestInput,
  BookingRespondInput,
  BookingWithDetails,
  ChatMessage,
  ConfirmPaymentInput,
  CreatePaymentOrderInput,
  DeleteAccountResponse,
  KycStatusUpdateInput,
  KycUploadInput,
  LiveLocationUpdateInput,
  ModeUpdateInput,
  ProfileSetupInput,
  RatingSubmitInput,
  RatingsRevealResponse,
  RideCancelInput,
  RideCreateInput,
  RideUpdateInput,
  RideSearchInput,
  RideWithDriver,
  TripEndInput,
  TripStartInput,
  UserProfile,
  VerifyOtpInput,
  WalletResponse,
  WalletWithdrawInput
} from "@ahmedabadcar/shared";
import {
  BookingStatus,
  ErrorCode,
  KycStatus,
  PaymentStatus,
  RatingRole,
  RideStatus,
  TripStatus,
  UserMode,
  WalletTxnType,
  firebasePaths
} from "@ahmedabadcar/shared";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import { dataStore } from "../store/data-store.js";
import { AppError } from "../utils/app-error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { fareService } from "./fare.service.js";
import { firebaseAdminService } from "./firebase-admin.service.js";
import type { GeocodedLocation, RoutePoint } from "./location.service.js";
import { locationService } from "./location.service.js";
import { notificationService } from "./notification.service.js";
import { otpService } from "./otp.service.js";
import { razorpayService } from "./razorpay.service.js";

const SEARCH_STOP_WORDS = new Set([
  "road",
  "rd",
  "street",
  "st",
  "area",
  "city",
  "district",
  "taluka",
  "tehsil",
  "near",
  "opp",
  "opposite",
  "india",
  "gujarat"
]);

const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeSearch = (value: string): string[] =>
  normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token));

const computeTextSimilarity = (query: string, target: string): number => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTarget = normalizeSearchText(target);
  if (!normalizedQuery || !normalizedTarget) {
    return 0;
  }
  if (normalizedQuery === normalizedTarget) {
    return 1;
  }
  if (normalizedTarget.includes(normalizedQuery) || normalizedQuery.includes(normalizedTarget)) {
    return 0.86;
  }

  const queryTokens = tokenizeSearch(query);
  const targetTokens = tokenizeSearch(target);
  if (!queryTokens.length || !targetTokens.length) {
    return 0;
  }

  let tokenMatches = 0;
  for (const token of queryTokens) {
    if (targetTokens.some((candidate) => candidate === token || candidate.startsWith(token) || token.startsWith(candidate))) {
      tokenMatches += 1;
    }
  }

  const coverage = tokenMatches / queryTokens.length;
  const singleTokenBoost = queryTokens.length === 1 && coverage > 0 ? 0.12 : 0;
  return Math.min(0.8, coverage * 0.7 + singleTokenBoost);
};

// Levenshtein distance for typo tolerance
const levenshteinDistance = (a: string, b: string): number => {
  const normalA = normalizeSearchText(a);
  const normalB = normalizeSearchText(b);
  
  const aLen = normalA.length;
  const bLen = normalB.length;
  const matrix: number[][] = Array(bLen + 1)
    .fill(null)
    .map(() => Array(aLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) matrix[0][i] = i;
  for (let j = 0; j <= bLen; j++) matrix[j][0] = j;

  for (let j = 1; j <= bLen; j++) {
    for (let i = 1; i <= aLen; i++) {
      const cost = normalA[i - 1] === normalB[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  const maxLen = Math.max(aLen, bLen);
  return maxLen === 0 ? 1 : 1 - matrix[bLen][aLen] / (maxLen * 1.5);
};

// Compute typo-tolerant text similarity
const computeTypoTolerantSimilarity = (query: string, target: string): number => {
  const exactScore = computeTextSimilarity(query, target);
  if (exactScore > 0.5) return exactScore;

  const typoScore = levenshteinDistance(query, target);
  return Math.max(exactScore, typoScore);
};

const toPlanarKm = (point: { lat: number; lng: number }, referenceLatRadians: number) => {
  const kmPerLat = 110.574;
  const kmPerLng = 111.320 * Math.cos(referenceLatRadians);
  return {
    x: point.lng * kmPerLng,
    y: point.lat * kmPerLat
  };
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const earthRadiusKm = 6371;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * arc;
};

const projectionProgress = (start: GeocodedLocation, end: GeocodedLocation, point: GeocodedLocation): number => {
  const referenceLat = (((start.lat + end.lat + point.lat) / 3) * Math.PI) / 180;
  const startPoint = toPlanarKm(start, referenceLat);
  const endPoint = toPlanarKm(end, referenceLat);
  const queryPoint = toPlanarKm(point, referenceLat);

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const denominator = dx * dx + dy * dy;
  if (!denominator) {
    return 0;
  }
  return ((queryPoint.x - startPoint.x) * dx + (queryPoint.y - startPoint.y) * dy) / denominator;
};

const distanceToSegmentKm = (start: GeocodedLocation, end: GeocodedLocation, point: GeocodedLocation): number => {
  const referenceLat = (((start.lat + end.lat + point.lat) / 3) * Math.PI) / 180;
  const startPoint = toPlanarKm(start, referenceLat);
  const endPoint = toPlanarKm(end, referenceLat);
  const queryPoint = toPlanarKm(point, referenceLat);

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const denominator = dx * dx + dy * dy;
  if (!denominator) {
    const diffX = queryPoint.x - startPoint.x;
    const diffY = queryPoint.y - startPoint.y;
    return Math.sqrt(diffX * diffX + diffY * diffY);
  }

  const t = clamp(((queryPoint.x - startPoint.x) * dx + (queryPoint.y - startPoint.y) * dy) / denominator, 0, 1);
  const projectedX = startPoint.x + t * dx;
  const projectedY = startPoint.y + t * dy;
  const diffX = queryPoint.x - projectedX;
  const diffY = queryPoint.y - projectedY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
};

const computeGeoRouteScore = (
  rideFrom: GeocodedLocation,
  rideTo: GeocodedLocation,
  queryFrom: GeocodedLocation,
  queryTo: GeocodedLocation
): number => {
  const rideLength = distanceKm(rideFrom, rideTo);
  if (rideLength < 5) {
    return 0;
  }

  const fromProgress = projectionProgress(rideFrom, rideTo, queryFrom);
  const toProgress = projectionProgress(rideFrom, rideTo, queryTo);
  if (toProgress <= fromProgress + 0.02) {
    return 0;
  }
  if (fromProgress > 1.25 || toProgress < -0.25) {
    return 0;
  }

  const fromPerpendicularDistance = distanceToSegmentKm(rideFrom, rideTo, queryFrom);
  const toPerpendicularDistance = distanceToSegmentKm(rideFrom, rideTo, queryTo);
  const maxPerpendicularDistance = Math.max(fromPerpendicularDistance, toPerpendicularDistance);
  if (maxPerpendicularDistance > 40) {
    return 0;
  }

  const corridorScore = clamp((40 - maxPerpendicularDistance) / 40, 0, 1);
  const segmentCoverage = clamp(toProgress - fromProgress, 0.04, 1);
  const startProximity = clamp((35 - distanceKm(rideFrom, queryFrom)) / 35, 0, 1);
  const endProximity = clamp((35 - distanceKm(rideTo, queryTo)) / 35, 0, 1);
  const endpointScore = (startProximity + endProximity) / 2;

  return clamp(0.52 + corridorScore * 0.2 + segmentCoverage * 0.2 + endpointScore * 0.08, 0, 1);
};

// New function: Check if driver route passes through rider's destination
const computePassThroughScore = (
  rideFrom: GeocodedLocation,
  rideTo: GeocodedLocation,
  queryFrom: GeocodedLocation,
  queryTo: GeocodedLocation
): number => {
  const startDistance = distanceKm(rideFrom, queryFrom);
  const endDistance = distanceKm(rideFrom, queryTo);
  const driverDistance = distanceKm(rideFrom, rideTo);
  
  // Check if starting points are close (within 10 km)
  if (startDistance > 10) {
    return 0;
  }

  // Check if rider's destination is between driver's start and end
  // (rider's end should be roughly on the driver's route)
  const tolerance = 20; // km - how far off the direct route is acceptable
  const toPerpendicularDistance = distanceToSegmentKm(rideFrom, rideTo, queryTo);

  if (toPerpendicularDistance > tolerance) {
    return 0;
  }

  // Check if rider's destination is between start and end (not beyond end)
  const toProgress = projectionProgress(rideFrom, rideTo, queryTo);
  if (toProgress < 0 || toProgress > 1.15) {
    return 0;
  }

  // Rider should be going partway along the driver's route
  if (endDistance > driverDistance) {
    return 0;
  }

  // Calculate score based on proximity and route alignment
  const startProximityScore = clamp((10 - startDistance) / 10, 0, 1);
  const routeAlignmentScore = clamp((tolerance - toPerpendicularDistance) / tolerance, 0, 1);
  
  return clamp(startProximityScore * 0.6 + routeAlignmentScore * 0.4, 0, 1) * 0.85; // Slightly lower than exact matches
};

interface PathSnapResult {
  distanceKm: number;
  progressKm: number;
  totalKm: number;
}

const snapPointToRoutePath = (path: RoutePoint[], point: { lat: number; lng: number }): PathSnapResult | undefined => {
  if (path.length < 2) {
    return undefined;
  }

  const cumulativeKm: number[] = [0];
  for (let index = 1; index < path.length; index += 1) {
    cumulativeKm[index] = cumulativeKm[index - 1] + distanceKm(path[index - 1], path[index]);
  }
  const totalKm = cumulativeKm[cumulativeKm.length - 1] ?? 0;
  if (!totalKm) {
    return undefined;
  }

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProgress = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segmentStart = path[index];
    const segmentEnd = path[index + 1];
    const segmentLength = cumulativeKm[index + 1] - cumulativeKm[index];
    if (segmentLength <= 0) {
      continue;
    }

    const referenceLat = (((segmentStart.lat + segmentEnd.lat + point.lat) / 3) * Math.PI) / 180;
    const startPlanar = toPlanarKm(segmentStart, referenceLat);
    const endPlanar = toPlanarKm(segmentEnd, referenceLat);
    const pointPlanar = toPlanarKm(point, referenceLat);
    const dx = endPlanar.x - startPlanar.x;
    const dy = endPlanar.y - startPlanar.y;
    const denominator = dx * dx + dy * dy;
    if (!denominator) {
      continue;
    }

    const t = clamp(((pointPlanar.x - startPlanar.x) * dx + (pointPlanar.y - startPlanar.y) * dy) / denominator, 0, 1);
    const projectedX = startPlanar.x + t * dx;
    const projectedY = startPlanar.y + t * dy;
    const diffX = pointPlanar.x - projectedX;
    const diffY = pointPlanar.y - projectedY;
    const segmentDistance = Math.sqrt(diffX * diffX + diffY * diffY);
    if (segmentDistance < bestDistance) {
      bestDistance = segmentDistance;
      bestProgress = cumulativeKm[index] + segmentLength * t;
    }
  }

  if (!Number.isFinite(bestDistance)) {
    return undefined;
  }

  return {
    distanceKm: bestDistance,
    progressKm: bestProgress,
    totalKm
  };
};

const computePathRouteScore = (path: RoutePoint[], queryFrom: GeocodedLocation, queryTo: GeocodedLocation): number => {
  const fromSnap = snapPointToRoutePath(path, queryFrom);
  const toSnap = snapPointToRoutePath(path, queryTo);
  if (!fromSnap || !toSnap) {
    return 0;
  }

  const totalKm = Math.max(fromSnap.totalKm, toSnap.totalKm);
  if (totalKm <= 0) {
    return 0;
  }
  const progressDelta = toSnap.progressKm - fromSnap.progressKm;
  const minimumProgressDelta = Math.max(2, totalKm * 0.03);
  if (progressDelta < minimumProgressDelta) {
    return 0;
  }

  const maxAllowedDeviation = clamp(totalKm * 0.11, 7, 16);
  const maxDeviation = Math.max(fromSnap.distanceKm, toSnap.distanceKm);
  if (maxDeviation > maxAllowedDeviation) {
    return 0;
  }

  const proximityScore = clamp((maxAllowedDeviation - maxDeviation) / maxAllowedDeviation, 0, 1);
  const coverageScore = clamp(progressDelta / totalKm, 0.05, 1);

  return clamp(0.58 + proximityScore * 0.24 + coverageScore * 0.18, 0, 1);
};

export class PlatformService {
  private readonly activeRideStatuses = [RideStatus.Open, RideStatus.InProgress];
  private readonly activeBookingStatuses = [
    BookingStatus.Requested,
    BookingStatus.Accepted,
    BookingStatus.PaymentPending,
    BookingStatus.Confirmed
  ];

  async sendOtp(phoneNumber: string): Promise<{ sent: true; debugOtp?: string }> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const result = await otpService.sendOtp(normalizedPhone);
    this.logActivity("AUTH_SEND_OTP", undefined, { phoneNumber: normalizedPhone });
    return {
      sent: true,
      ...result
    };
  }

  async verifyOtp(payload: VerifyOtpInput): Promise<AuthResponse> {
    const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
    const valid = otpService.verifyOtp(normalizedPhone, payload.otp);
    if (!valid) {
      throw new AppError(401, ErrorCode.Unauthorized, "Invalid OTP");
    }

    const user = dataStore.upsertUser(normalizedPhone);
    const driverProfile = dataStore.getDriverProfile(user.id);
    const accessToken = signAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      mode: user.preferredMode
    });
    const refreshToken = signRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      mode: user.preferredMode
    });
    dataStore.setRefreshSession(refreshToken, user.id);
    this.logActivity("AUTH_VERIFY_OTP", user.id, { phoneNumber: user.phoneNumber });
    return {
      accessToken,
      refreshToken,
      user,
      driverProfile
    };
  }

  refreshToken(refreshToken: string): AuthResponse {
    if (!dataStore.hasRefreshSession(refreshToken)) {
      throw new AppError(401, ErrorCode.Unauthorized, "Refresh token is not valid");
    }
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, ErrorCode.Unauthorized, "Refresh token expired or invalid");
    }
    const user = dataStore.getUser(payload.userId);
    const driverProfile = dataStore.getDriverProfile(user.id);
    const newAccessToken = signAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      mode: user.preferredMode
    });
    const newRefreshToken = signRefreshToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      mode: user.preferredMode
    });
    dataStore.revokeRefreshSession(refreshToken);
    dataStore.setRefreshSession(newRefreshToken, user.id);
    this.logActivity("AUTH_REFRESH_TOKEN", user.id);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
      driverProfile
    };
  }

  logout(refreshToken: string): { success: true } {
    const session = dataStore.refreshSessions.get(refreshToken);
    dataStore.revokeRefreshSession(refreshToken);
    if (session?.userId) {
      this.logActivity("AUTH_LOGOUT", session.userId);
    }
    return { success: true };
  }

  deleteAccount(userId: string): DeleteAccountResponse {
    const nowIso = new Date().toISOString();
    let autoCancelledRiderBookings = 0;
    let autoCancelledDriverRides = 0;
    let refundedBookings = 0;

    const riderActiveBookings = [...dataStore.bookings.values()].filter(
      (booking) => booking.riderId === userId && this.activeBookingStatuses.includes(booking.status)
    );
    for (const booking of riderActiveBookings) {
      const ride = dataStore.rides.get(booking.rideId);
      if (ride) {
        dataStore.updateRide(ride.id, {
          seatsAvailable: Math.min(ride.seatsTotal, ride.seatsAvailable + booking.seatsBooked)
        });
      }

      let nextPaymentStatus = booking.paymentStatus;
      if (booking.paymentStatus === PaymentStatus.InEscrow) {
        const riderWallet = dataStore.getWallet(booking.riderId);
        dataStore.updateWallet(booking.riderId, {
          escrowBalance: Math.max(0, riderWallet.escrowBalance - booking.amount)
        });
        dataStore.addWalletTransaction(
          booking.riderId,
          booking.amount,
          WalletTxnType.RefundDebit,
          booking.id,
          "Booking refunded due to account deletion"
        );
        nextPaymentStatus = PaymentStatus.Refunded;
        refundedBookings += 1;
      }

      dataStore.updateBooking(booking.id, {
        status: BookingStatus.Cancelled,
        paymentStatus: nextPaymentStatus,
        riderCancellationReason: "Rider account deleted"
      });
      if (ride) {
        notificationService.send({
          userId: ride.driverId,
          title: "Rider account deleted",
          body: "A rider account was deleted and their booking was cancelled.",
          data: { bookingId: booking.id, rideId: ride.id }
        });
      }
      autoCancelledRiderBookings += 1;
    }

    const driverActiveRides = [...dataStore.rides.values()].filter(
      (ride) => ride.driverId === userId && this.activeRideStatuses.includes(ride.status)
    );
    for (const ride of driverActiveRides) {
      const activeTrip = dataStore.getActiveTripByRide(ride.id);
      if (activeTrip?.status === TripStatus.Active) {
        dataStore.updateTrip(activeTrip.id, {
          status: TripStatus.Cancelled,
          endedAt: nowIso
        });
      }

      const impactedBookings = dataStore
        .getBookingsForRide(ride.id)
        .filter((booking) => this.activeBookingStatuses.includes(booking.status));

      for (const booking of impactedBookings) {
        let nextPaymentStatus = booking.paymentStatus;
        if (booking.paymentStatus === PaymentStatus.InEscrow) {
          const riderWallet = dataStore.getWallet(booking.riderId);
          dataStore.updateWallet(booking.riderId, {
            escrowBalance: Math.max(0, riderWallet.escrowBalance - booking.amount)
          });
          dataStore.addWalletTransaction(
            booking.riderId,
            booking.amount,
            WalletTxnType.RefundDebit,
            booking.id,
            "Ride refunded due to driver account deletion"
          );
          nextPaymentStatus = PaymentStatus.Refunded;
          refundedBookings += 1;
        }

        dataStore.updateBooking(booking.id, {
          status: BookingStatus.Cancelled,
          paymentStatus: nextPaymentStatus,
          driverCancellationReason: "Driver account deleted",
          driverCancellationMessage: "Driver account deleted. Ride has been cancelled."
        });

        notificationService.send({
          userId: booking.riderId,
          title: "Driver account deleted",
          body: "Your ride was cancelled and any escrow amount has been refunded.",
          data: { bookingId: booking.id, rideId: ride.id }
        });
      }

      dataStore.updateRide(ride.id, {
        status: RideStatus.Cancelled,
        seatsAvailable: ride.seatsTotal,
        cancelledAt: nowIso,
        cancellationReason: "Driver account deleted",
        cancellationMessage: "Driver account deleted"
      });
      autoCancelledDriverRides += 1;
    }

    const danglingActiveTrips = [...dataStore.trips.values()].filter((trip) => trip.driverId === userId && trip.status === TripStatus.Active);
    for (const trip of danglingActiveTrips) {
      dataStore.updateTrip(trip.id, {
        status: TripStatus.Cancelled,
        endedAt: nowIso
      });
    }

    const deleted = dataStore.deleteUserCascade(userId);
    void firebaseAdminService.cleanupDeletedAccount({
      userId: deleted.userId,
      rideIds: deleted.rideIds,
      bookingIds: deleted.bookingIds,
      tripIds: deleted.tripIds
    });
    this.logActivity("ACCOUNT_DELETED", deleted.userId, {
      ridesDeleted: deleted.rideIds.length,
      bookingsDeleted: deleted.bookingIds.length,
      tripsDeleted: deleted.tripIds.length,
      chatsDeleted: deleted.chatsDeleted,
      ratingsDeleted: deleted.ratingsDeleted,
      autoCancelledRiderBookings,
      autoCancelledDriverRides,
      refundedBookings
    });

    return {
      deleted: true,
      deletedAt: new Date().toISOString(),
      summary: {
        ridesDeleted: deleted.rideIds.length,
        bookingsDeleted: deleted.bookingIds.length,
        tripsDeleted: deleted.tripIds.length,
        chatsDeleted: deleted.chatsDeleted,
        ratingsDeleted: deleted.ratingsDeleted
      }
    };
  }

  getBootstrap(userId: string): AppBootstrapResponse {
    const user = dataStore.getUser(userId);
    const driverProfile = dataStore.getDriverProfile(userId);
    const wallet = this.getWallet(userId);
    const activeBooking = this.getUserActiveBooking(userId);
    const activeTrip = this.getUserActiveTrip(userId);
    return {
      user,
      driverProfile,
      mode: user.preferredMode,
      activeBooking,
      activeTrip,
      wallet
    };
  }

  updateProfile(userId: string, input: ProfileSetupInput): UserProfile {
    return dataStore.updateUser(userId, {
      fullName: input.fullName,
      email: input.email,
      gender: input.gender
    });
  }

  updateMode(userId: string, input: ModeUpdateInput): UserProfile {
    return dataStore.updateUser(userId, {
      preferredMode: input.mode
    });
  }

  uploadKyc(userId: string, input: KycUploadInput) {
    return dataStore.updateDriverProfile(userId, {
      ...input,
      kycStatus: KycStatus.Pending,
      rejectionReason: undefined
    });
  }

  getKycStatus(userId: string) {
    return dataStore.getDriverProfile(userId);
  }

  updateKycStatus(input: KycStatusUpdateInput) {
    return dataStore.updateDriverProfile(input.userId, {
      kycStatus: input.status,
      rejectionReason: input.rejectionReason,
      verifiedAt: input.status === KycStatus.Verified ? new Date().toISOString() : undefined,
      badgeLabel: input.status === KycStatus.Verified ? "Verified Driver" : undefined
    });
  }

  async createRide(driverId: string, input: RideCreateInput) {
    const driverProfile = dataStore.getDriverProfile(driverId);
    if (driverProfile.rideCreationBlockedUntil) {
      const blockedUntil = new Date(driverProfile.rideCreationBlockedUntil);
      if (!Number.isNaN(blockedUntil.getTime()) && blockedUntil.getTime() > Date.now()) {
        throw new AppError(
          409,
          ErrorCode.Conflict,
          `You are blocked from creating a new ride until ${blockedUntil.toLocaleString()} due to recent trip cancellation.`
        );
      }
    }

    const existingActiveRide = [...dataStore.rides.values()].find(
      (ride) => ride.driverId === driverId && this.activeRideStatuses.includes(ride.status)
    );
    if (existingActiveRide) {
      throw new AppError(
        409,
        ErrorCode.Conflict,
        "You already have an active ride. End or cancel it before creating a new ride."
      );
    }

    const suggestedPrice = await fareService.getSuggestedPrice(input.from, input.to, input.seatsTotal);
    const routeGeometry = await locationService.getRouteGeometry(input.from, input.to, input.routePolyline);

    const ride = dataStore.createRide({
      driverId,
      from: input.from,
      to: input.to,
      date: input.date,
      departureTime: input.departureTime,
      seatsTotal: input.seatsTotal,
      seatsAvailable: input.seatsTotal,
      pricePerSeat: input.pricePerSeat,
      suggestedPricePerSeat: suggestedPrice,
      womenOnly: input.womenOnly,
      acAvailable: input.acAvailable,
      routePolyline: input.routePolyline ?? routeGeometry?.polyline,
      status: RideStatus.Open
    });
    this.logActivity("RIDE_CREATED", driverId, { rideId: ride.id, from: ride.from, to: ride.to });
    return ride;
  }

  async searchRides(input: RideSearchInput): Promise<RideWithDriver[]> {
    const candidateRides = [...dataStore.rides.values()].filter((ride) => {
      if (ride.status !== RideStatus.Open) return false;
      if (ride.date !== input.date) return false;
      if (typeof input.maxPrice === "number" && ride.pricePerSeat > input.maxPrice) return false;
      if (input.womenOnly && !ride.womenOnly) return false;
      if (input.acAvailable && !ride.acAvailable) return false;
      return ride.seatsAvailable > 0;
    });

    if (!candidateRides.length) {
      return [];
    }

    const [queryFromGeo, queryToGeo] = await Promise.all([
      locationService.geocode(input.from),
      locationService.geocode(input.to)
    ]);

    const scoredMatches: Array<{ ride: RideWithDriver; score: number }> = [];

    for (const ride of candidateRides) {
      // Use typo-tolerant matching
      const fromTextScore = computeTypoTolerantSimilarity(input.from, ride.from);
      const toTextScore = computeTypoTolerantSimilarity(input.to, ride.to);

      let geoScore = 0;
      let pathScore = 0;
      let passThroughScore = 0;
      let isPartialRoute = false;
      let hasOfficialRoute = false;

      if (queryFromGeo && queryToGeo) {
        const [rideFromGeo, rideToGeo, routeGeometry] = await Promise.all([
          locationService.geocode(ride.from),
          locationService.geocode(ride.to),
          locationService.getRouteGeometry(ride.from, ride.to, ride.routePolyline)
        ]);

        if (rideFromGeo && rideToGeo) {
          geoScore = computeGeoRouteScore(rideFromGeo, rideToGeo, queryFromGeo, queryToGeo);
          passThroughScore = computePassThroughScore(rideFromGeo, rideToGeo, queryFromGeo, queryToGeo);
        }

        if (routeGeometry?.points?.length && queryFromGeo && queryToGeo) {
          pathScore = computePathRouteScore(routeGeometry.points, queryFromGeo, queryToGeo);
          hasOfficialRoute = routeGeometry.source === "GOOGLE";
          if (!ride.routePolyline && routeGeometry.polyline) {
            dataStore.updateRide(ride.id, {
              routePolyline: routeGeometry.polyline
            });
          }
        }
      }

      // More inclusive matching logic with lower thresholds
      const textMatch = fromTextScore >= 0.35 && toTextScore >= 0.35;
      const geoMatch = geoScore >= 0.50;
      const pathMatch = hasOfficialRoute && pathScore >= 0.45;
      const passThroughMatch = passThroughScore >= 0.50;

      // Accept if ANY score is good enough
      const isAccepted = textMatch || geoMatch || pathMatch || passThroughMatch;

      if (!isAccepted) {
        continue;
      }

      isPartialRoute = passThroughScore >= 0.50 && passThroughScore > Math.max(geoScore, pathScore);

      // Weighted scoring: prefer exact matches, but include partial routes
      const finalScore = clamp(
        Math.max(
          fromTextScore * toTextScore * 0.5,     // Text exact match
          geoScore * 0.7,                         // Geo corridor match
          pathScore * 0.8,                        // Path match
          passThroughScore * 0.6                  // Pass-through route (lower priority)
        ),
        0,
        1
      );

      scoredMatches.push({
        ride: {
          ...ride,
          driver: dataStore.getUser(ride.driverId),
          driverProfile: dataStore.getDriverProfile(ride.driverId),
          isPartialRoute,
          riderDropPoint: isPartialRoute ? input.to : undefined
        },
        score: finalScore
      });
    }

    return scoredMatches
      .sort((left, right) => {
        // Prioritize exact matches first
        const leftExact = left.ride.isPartialRoute ? 0 : 1;
        const rightExact = right.ride.isPartialRoute ? 0 : 1;
        if (rightExact !== leftExact) {
          return rightExact - leftExact;
        }

        // Then sort by score
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        // Then by price
        if (left.ride.pricePerSeat !== right.ride.pricePerSeat) {
          return left.ride.pricePerSeat - right.ride.pricePerSeat;
        }

        // Then by departure time
        return left.ride.departureTime.localeCompare(right.ride.departureTime);
      })
      .map((item) => item.ride);
  }

  getDriverRides(driverId: string) {
    return [...dataStore.rides.values()].filter((item) => item.driverId === driverId);
  }

  getRideBookings(driverId: string, rideId: string): BookingWithDetails[] {
    const ride = dataStore.getRide(rideId);
    if (ride.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can view requests");
    }
    return dataStore.getBookingsForRide(rideId).map((item) => this.mapBookingDetails(item.id));
  }

  getRiderBookings(riderId: string): BookingWithDetails[] {
    return dataStore.getBookingsForRider(riderId).map((item) => this.mapBookingDetails(item.id));
  }

  getRideDetails(rideId: string): RideWithDriver {
    const ride = dataStore.getRide(rideId);
    return {
      ...ride,
      driver: dataStore.getUser(ride.driverId),
      driverProfile: dataStore.getDriverProfile(ride.driverId)
    };
  }

  updateRideStatus(driverId: string, rideId: string, status: RideStatus) {
    const ride = dataStore.getRide(rideId);
    if (ride.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can update ride status");
    }
    return dataStore.updateRide(rideId, { status });
  }

  updateRideDetails(driverId: string, rideId: string, input: RideUpdateInput) {
    const ride = dataStore.getRide(rideId);
    if (ride.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can edit ride details");
    }
    if ([RideStatus.InProgress, RideStatus.Completed, RideStatus.Cancelled].includes(ride.status)) {
      throw new AppError(409, ErrorCode.Conflict, "Ride cannot be edited after trip has started or completed");
    }

    const occupiedSeats = ride.seatsTotal - ride.seatsAvailable;
    const nextSeatsTotal = input.seatsTotal ?? ride.seatsTotal;
    if (nextSeatsTotal < occupiedSeats) {
      throw new AppError(409, ErrorCode.Conflict, `Seats total cannot be less than already reserved seats (${occupiedSeats})`);
    }

    const patch = {
      from: input.from ?? ride.from,
      to: input.to ?? ride.to,
      date: input.date ?? ride.date,
      departureTime: input.departureTime ?? ride.departureTime,
      seatsTotal: nextSeatsTotal,
      seatsAvailable: Math.max(0, nextSeatsTotal - occupiedSeats),
      pricePerSeat: input.pricePerSeat ?? ride.pricePerSeat,
      womenOnly: input.womenOnly ?? ride.womenOnly,
      acAvailable: input.acAvailable ?? ride.acAvailable,
      routePolyline: input.routePolyline ?? ride.routePolyline,
      lastDriverEditAt: new Date().toISOString(),
      lastDriverEditNote: input.updateNote?.trim() || undefined
    };
    const changedSummary: string[] = [];
    if (patch.from !== ride.from) changedSummary.push(`From: ${ride.from} -> ${patch.from}`);
    if (patch.to !== ride.to) changedSummary.push(`To: ${ride.to} -> ${patch.to}`);
    if (patch.date !== ride.date) changedSummary.push(`Date: ${ride.date} -> ${patch.date}`);
    if (patch.departureTime !== ride.departureTime) changedSummary.push(`Departure: ${ride.departureTime} -> ${patch.departureTime}`);
    if (patch.seatsTotal !== ride.seatsTotal) changedSummary.push(`Seats Total: ${ride.seatsTotal} -> ${patch.seatsTotal}`);
    if (patch.pricePerSeat !== ride.pricePerSeat) changedSummary.push(`Price/Seat: INR ${ride.pricePerSeat} -> INR ${patch.pricePerSeat}`);
    if (Boolean(patch.womenOnly) !== Boolean(ride.womenOnly)) {
      changedSummary.push(`Women-only: ${ride.womenOnly ? "Yes" : "No"} -> ${patch.womenOnly ? "Yes" : "No"}`);
    }
    if (Boolean(patch.acAvailable) !== Boolean(ride.acAvailable)) {
      changedSummary.push(`AC Available: ${ride.acAvailable ? "Yes" : "No"} -> ${patch.acAvailable ? "Yes" : "No"}`);
    }
    if ((patch.routePolyline ?? "") !== (ride.routePolyline ?? "")) {
      changedSummary.push("Route path was updated");
    }

    const updatedRide = dataStore.updateRide(ride.id, patch);
    const impacted = dataStore
      .getBookingsForRide(ride.id)
      .filter((item) => [BookingStatus.Accepted, BookingStatus.PaymentPending, BookingStatus.Confirmed].includes(item.status));

    if (impacted.length) {
      impacted.forEach((booking) => {
        dataStore.updateBooking(booking.id, {
          driverEditNoticeAt: updatedRide.lastDriverEditAt,
          driverEditNote: updatedRide.lastDriverEditNote,
          driverEditSummary: changedSummary.length ? changedSummary : undefined,
          riderUpdateAcknowledgedAt: undefined
        });
        notificationService.send({
          userId: booking.riderId,
          title: "Ride details updated by driver",
          body: "Driver updated trip details. Please review and keep or cancel your booking.",
          data: {
            bookingId: booking.id,
            rideId: ride.id
          }
        });
      });
    }

    return updatedRide;
  }

  cancelRide(driverId: string, input: RideCancelInput) {
    const ride = dataStore.getRide(input.rideId);
    if (ride.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can cancel this trip");
    }
    if ([RideStatus.Completed, RideStatus.Cancelled].includes(ride.status)) {
      throw new AppError(409, ErrorCode.Conflict, "Ride cannot be cancelled in current state");
    }

    const reason = input.reason.trim();
    const customMessage = input.customMessage?.trim() || undefined;
    const nowIso = new Date().toISOString();

    const activeTrip = dataStore.getActiveTripByRide(ride.id);
    if (activeTrip && activeTrip.status === TripStatus.Active) {
      dataStore.updateTrip(activeTrip.id, {
        status: TripStatus.Cancelled,
        endedAt: nowIso
      });
    }

    const impactedBookings = dataStore
      .getBookingsForRide(ride.id)
      .filter((booking) => this.activeBookingStatuses.includes(booking.status));

    impactedBookings.forEach((booking) => {
      let nextPaymentStatus = booking.paymentStatus;
      if (booking.paymentStatus === PaymentStatus.InEscrow) {
        const riderWallet = dataStore.getWallet(booking.riderId);
        dataStore.updateWallet(booking.riderId, {
          escrowBalance: Math.max(0, riderWallet.escrowBalance - booking.amount)
        });
        dataStore.addWalletTransaction(booking.riderId, booking.amount, WalletTxnType.RefundDebit, booking.id, "Ride cancelled by driver");
        nextPaymentStatus = PaymentStatus.Refunded;
      }

      dataStore.updateBooking(booking.id, {
        status: BookingStatus.Cancelled,
        paymentStatus: nextPaymentStatus,
        driverCancellationReason: reason,
        driverCancellationMessage: customMessage
      });

      notificationService.send({
        userId: booking.riderId,
        title: "Trip cancelled by driver",
        body: customMessage ? customMessage : `Driver cancelled this trip due to: ${reason}`,
        data: { bookingId: booking.id, rideId: ride.id }
      });
    });

    dataStore.updateDriverProfile(driverId, {
      rideCreationBlockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastRideCancellationReason: reason,
      lastRideCancellationMessage: customMessage
    });

    const cancelledRide = dataStore.updateRide(ride.id, {
      status: RideStatus.Cancelled,
      seatsAvailable: ride.seatsTotal,
      cancelledAt: nowIso,
      cancellationReason: reason,
      cancellationMessage: customMessage
    });
    this.logActivity("RIDE_CANCELLED_BY_DRIVER", driverId, {
      rideId: ride.id,
      activeBookingsImpacted: impactedBookings.length,
      reason,
      customMessage
    });
    return cancelledRide;
  }

  requestBooking(riderId: string, input: BookingRequestInput): BookingWithDetails {
    const ride = dataStore.getRide(input.rideId);
    if (input.seatsBooked !== 1) {
      throw new AppError(400, ErrorCode.ValidationFailed, "Only 1 seat can be booked at a time.");
    }
    if (ride.driverId === riderId) {
      throw new AppError(409, ErrorCode.Conflict, "Driver cannot book their own ride.");
    }
    if (ride.status !== RideStatus.Open) {
      throw new AppError(409, ErrorCode.RideClosed, "Ride is not available for booking");
    }
    if (ride.seatsAvailable < input.seatsBooked) {
      throw new AppError(409, ErrorCode.Conflict, "Not enough seats available");
    }

    const riderActiveBooking = this.findActiveBookingForRider(riderId);
    if (riderActiveBooking) {
      throw new AppError(
        409,
        ErrorCode.Conflict,
        "You already have an active booking. Cancel or complete it before booking a new ride."
      );
    }

    const rideActiveBooking = this.findActiveBookingForRide(ride.id);
    if (rideActiveBooking) {
      throw new AppError(
        409,
        ErrorCode.Conflict,
        "This ride already has an active rider. New booking is allowed after cancel or trip completion."
      );
    }

    const driverActiveBooking = this.findActiveBookingForDriver(ride.driverId);
    if (driverActiveBooking) {
      throw new AppError(
        409,
        ErrorCode.Conflict,
        "Driver already has an active rider on another trip. Try after that trip is cancelled or completed."
      );
    }

    const booking = dataStore.createBooking({
      rideId: ride.id,
      riderId,
      seatsBooked: input.seatsBooked,
      amount: ride.pricePerSeat * input.seatsBooked,
      status: BookingStatus.Requested,
      paymentStatus: PaymentStatus.Created
    });

    dataStore.updateRide(ride.id, {
      seatsAvailable: ride.seatsAvailable - input.seatsBooked
    });

    notificationService.send({
      userId: ride.driverId,
      title: "New booking request",
      body: `A rider requested ${input.seatsBooked} seat(s) on your ride.`,
      data: {
        bookingId: booking.id,
        rideId: ride.id
      }
    });
    this.logActivity("BOOKING_REQUESTED", riderId, {
      bookingId: booking.id,
      rideId: ride.id,
      driverId: ride.driverId
    });

    return this.mapBookingDetails(booking.id);
  }

  respondToBooking(driverId: string, input: BookingRespondInput): BookingWithDetails {
    const booking = dataStore.getBooking(input.bookingId);
    const ride = dataStore.getRide(booking.rideId);
    if (ride.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can respond");
    }
    if (booking.status !== BookingStatus.Requested) {
      throw new AppError(409, ErrorCode.Conflict, "Booking already resolved");
    }

    const accepted = input.action === "ACCEPT";
    if (accepted) {
      const existingActiveBooking = this.findActiveBookingForDriver(driverId, booking.id);
      if (existingActiveBooking) {
        throw new AppError(
          409,
          ErrorCode.Conflict,
          "You already have an active rider. Complete or cancel current booking before accepting another."
        );
      }
    }

    const updated = dataStore.updateBooking(booking.id, {
      status: accepted ? BookingStatus.Accepted : BookingStatus.Rejected
    });

    if (!accepted) {
      dataStore.updateRide(ride.id, {
        seatsAvailable: ride.seatsAvailable + booking.seatsBooked
      });
    }

    notificationService.send({
      userId: booking.riderId,
      title: accepted ? "Booking accepted" : "Booking rejected",
      body: accepted ? "Proceed to payment to confirm your booking." : "Try another ride that suits your route.",
      data: { bookingId: booking.id }
    });
    this.logActivity("BOOKING_RESPONDED", driverId, {
      bookingId: booking.id,
      rideId: ride.id,
      action: input.action
    });

    return this.mapBookingDetails(updated.id);
  }

  cancelBooking(riderId: string, input: BookingCancelInput): BookingWithDetails {
    const booking = dataStore.getBooking(input.bookingId);
    if (booking.riderId !== riderId) {
      throw new AppError(403, ErrorCode.Forbidden, "Booking does not belong to current rider");
    }

    if ([BookingStatus.Rejected, BookingStatus.Cancelled, BookingStatus.Completed].includes(booking.status)) {
      throw new AppError(409, ErrorCode.Conflict, "Booking cannot be cancelled in current state");
    }

    const ride = dataStore.getRide(booking.rideId);
    const activeTrip = dataStore.getActiveTripByRide(ride.id);
    if (activeTrip) {
      throw new AppError(409, ErrorCode.Conflict, "Cannot cancel after trip has started");
    }

    const nextSeats = Math.min(ride.seatsTotal, ride.seatsAvailable + booking.seatsBooked);
    dataStore.updateRide(ride.id, { seatsAvailable: nextSeats });

    if (booking.paymentStatus === PaymentStatus.InEscrow) {
      const riderWallet = dataStore.getWallet(riderId);
      dataStore.updateWallet(riderId, {
        escrowBalance: Math.max(0, riderWallet.escrowBalance - booking.amount)
      });
      dataStore.addWalletTransaction(riderId, booking.amount, WalletTxnType.RefundDebit, booking.id, "Booking cancelled by rider");
    }

    const updated = dataStore.updateBooking(booking.id, {
      status: BookingStatus.Cancelled,
      paymentStatus: booking.paymentStatus === PaymentStatus.InEscrow ? PaymentStatus.Refunded : booking.paymentStatus,
      riderCancellationReason: input.reason?.trim() || undefined
    });

    notificationService.send({
      userId: ride.driverId,
      title: "Rider cancelled booking",
      body: "A rider cancelled booking after ride detail review.",
      data: { bookingId: booking.id, rideId: ride.id }
    });
    this.logActivity("BOOKING_CANCELLED_BY_RIDER", riderId, {
      bookingId: booking.id,
      rideId: ride.id,
      reason: input.reason?.trim() || null
    });

    return this.mapBookingDetails(updated.id);
  }

  acknowledgeBookingUpdate(riderId: string, input: BookingAcknowledgeUpdateInput): BookingWithDetails {
    const booking = dataStore.getBooking(input.bookingId);
    if (booking.riderId !== riderId) {
      throw new AppError(403, ErrorCode.Forbidden, "Booking does not belong to current rider");
    }
    if (!booking.driverEditNoticeAt) {
      return this.mapBookingDetails(booking.id);
    }

    dataStore.updateBooking(booking.id, {
      riderUpdateAcknowledgedAt: new Date().toISOString()
    });

    return this.mapBookingDetails(booking.id);
  }

  async createPaymentOrder(riderId: string, input: CreatePaymentOrderInput): Promise<{
    booking: BookingWithDetails;
    order: { id: string; amount: number; currency: string; keyId?: string };
  }> {
    const booking = dataStore.getBooking(input.bookingId);
    if (booking.riderId !== riderId) {
      throw new AppError(403, ErrorCode.Forbidden, "Booking does not belong to current rider");
    }
    if (booking.status !== BookingStatus.Accepted) {
      throw new AppError(409, ErrorCode.Conflict, "Booking must be accepted before payment");
    }

    const order = await razorpayService.createOrder({
      amountInPaise: Math.round(booking.amount * 100),
      receipt: booking.id,
      notes: { bookingId: booking.id }
    });

    dataStore.updateBooking(booking.id, {
      status: BookingStatus.PaymentPending,
      paymentStatus: PaymentStatus.Created,
      razorpayOrderId: order.id
    });

    return {
      booking: this.mapBookingDetails(booking.id),
      order: {
        ...order,
        keyId: env.RAZORPAY_KEY_ID
      }
    };
  }

  confirmPayment(riderId: string, input: ConfirmPaymentInput): BookingWithDetails {
    const booking = dataStore.getBooking(input.bookingId);
    if (booking.riderId !== riderId) {
      throw new AppError(403, ErrorCode.Forbidden, "Booking does not belong to current rider");
    }
    if (booking.status !== BookingStatus.PaymentPending && booking.status !== BookingStatus.Accepted) {
      throw new AppError(409, ErrorCode.Conflict, "Booking is not ready for payment confirmation");
    }

    const valid = razorpayService.verifySignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
    if (!valid) {
      throw new AppError(400, ErrorCode.PaymentFailed, "Invalid Razorpay signature");
    }

    dataStore.updateBooking(booking.id, {
      status: BookingStatus.Confirmed,
      paymentStatus: PaymentStatus.InEscrow,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId
    });

    const riderWallet = dataStore.getWallet(riderId);
    dataStore.updateWallet(riderId, {
      escrowBalance: riderWallet.escrowBalance + booking.amount
    });
    dataStore.addWalletTransaction(riderId, -booking.amount, WalletTxnType.EscrowCredit, booking.id, "Escrow hold for booking");

    notificationService.send({
      userId: dataStore.getRide(booking.rideId).driverId,
      title: "Payment confirmed",
      body: "Rider payment is secured in escrow.",
      data: { bookingId: booking.id }
    });

    return this.mapBookingDetails(booking.id);
  }

  startTrip(driverId: string, input: TripStartInput): ActiveTripResponse {
    const ride = dataStore.getRide(input.rideId);
    if (ride.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can start trip");
    }
    if (ride.status === RideStatus.Completed) {
      throw new AppError(409, ErrorCode.Conflict, "Ride already completed");
    }

    const existing = dataStore.getActiveTripByRide(ride.id);
    if (existing) {
      return {
        trip: existing,
        liveLocation: dataStore.getLiveLocation(existing.id)
      };
    }

    const confirmedBookings = dataStore.getBookingsForRide(ride.id).filter((item) => item.status === BookingStatus.Confirmed);
    if (!confirmedBookings.length) {
      throw new AppError(409, ErrorCode.Conflict, "At least one confirmed booking is required");
    }

    const trip = dataStore.createTrip({
      rideId: ride.id,
      driverId,
      startedAt: new Date().toISOString(),
      status: TripStatus.Active,
      activeBookingIds: confirmedBookings.map((item) => item.id)
    });
    dataStore.updateRide(ride.id, { status: RideStatus.InProgress });
    this.logActivity("TRIP_STARTED", driverId, {
      rideId: ride.id,
      tripId: trip.id,
      confirmedBookings: confirmedBookings.length
    });

    confirmedBookings.forEach((booking) => {
      notificationService.send({
        userId: booking.riderId,
        title: "Trip started",
        body: "Driver has started the trip. Live tracking is now active.",
        data: { tripId: trip.id, bookingId: booking.id }
      });
    });

    return {
      trip
    };
  }

  endTrip(driverId: string, input: TripEndInput): ActiveTripResponse {
    const trip = dataStore.getTrip(input.tripId);
    if (trip.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only ride owner can end trip");
    }
    if (trip.status !== TripStatus.Active) {
      throw new AppError(409, ErrorCode.Conflict, "Trip is not active");
    }

    const ride = dataStore.getRide(trip.rideId);
    dataStore.updateTrip(trip.id, {
      status: TripStatus.Completed,
      endedAt: new Date().toISOString()
    });
    dataStore.updateRide(ride.id, {
      status: RideStatus.Completed
    });

    trip.activeBookingIds.forEach((bookingId) => {
      const booking = dataStore.getBooking(bookingId);
      if (booking.paymentStatus !== PaymentStatus.InEscrow) {
        return;
      }

      const commission = (booking.amount * env.COMMISSION_PERCENT) / 100;
      const payout = booking.amount - commission;

      const riderWallet = dataStore.getWallet(booking.riderId);
      dataStore.updateWallet(booking.riderId, {
        escrowBalance: Math.max(0, riderWallet.escrowBalance - booking.amount)
      });

      const driverWallet = dataStore.getWallet(ride.driverId);
      dataStore.updateWallet(ride.driverId, {
        availableBalance: driverWallet.availableBalance + payout
      });

      dataStore.updateBooking(booking.id, {
        status: BookingStatus.Completed,
        paymentStatus: PaymentStatus.Released
      });

      dataStore.addWalletTransaction(ride.driverId, payout, WalletTxnType.PayoutRelease, booking.id, "Escrow released after trip completion");
      dataStore.addWalletTransaction(ride.driverId, -commission, WalletTxnType.CommissionDebit, booking.id, "Platform commission");
      dataStore.addWalletTransaction(booking.riderId, 0, WalletTxnType.EscrowCredit, booking.id, "Escrow released to driver");

      notificationService.send({
        userId: booking.riderId,
        title: "Trip completed",
        body: "Please rate your driver to reveal mutual ratings.",
        data: { bookingId: booking.id }
      });
    });
    this.logActivity("TRIP_ENDED", driverId, {
      tripId: trip.id,
      rideId: ride.id,
      bookingsCompleted: trip.activeBookingIds.length
    });

    return {
      trip: dataStore.getTrip(trip.id),
      liveLocation: dataStore.getLiveLocation(trip.id)
    };
  }

  updateLiveLocation(driverId: string, input: LiveLocationUpdateInput) {
    const trip = dataStore.getTrip(input.tripId);
    if (trip.driverId !== driverId) {
      throw new AppError(403, ErrorCode.Forbidden, "Only driver can update trip location");
    }
    if (trip.status !== TripStatus.Active) {
      throw new AppError(409, ErrorCode.Conflict, "Location updates allowed only for active trips");
    }

    const point = dataStore.setLiveLocation({
      tripId: input.tripId,
      driverId,
      lat: input.lat,
      lng: input.lng,
      heading: input.heading,
      speed: input.speed,
      timestamp: new Date().toISOString()
    });

    firebaseAdminService.pushTripLocation(firebasePaths.tripLocation(input.tripId), point);
    return point;
  }

  getActiveTripForUser(userId: string): ActiveTripResponse | null {
    const trip = [...dataStore.trips.values()].find((item) => {
      if (item.driverId === userId && item.status === TripStatus.Active) return true;
      if (item.status !== TripStatus.Active) return false;
      return item.activeBookingIds.some((bookingId) => dataStore.getBooking(bookingId).riderId === userId);
    });

    if (!trip) {
      return null;
    }
    return {
      trip,
      liveLocation: dataStore.getLiveLocation(trip.id)
    };
  }

  getWallet(userId: string): WalletResponse {
    return {
      wallet: dataStore.getWallet(userId),
      transactions: dataStore.getWalletTransactions(userId)
    };
  }

  withdrawWallet(userId: string, input: WalletWithdrawInput): WalletResponse {
    const wallet = dataStore.getWallet(userId);
    if (input.amount <= 0) {
      throw new AppError(400, ErrorCode.ValidationFailed, "Withdrawal amount must be greater than zero");
    }
    if (wallet.availableBalance < input.amount) {
      throw new AppError(409, ErrorCode.Conflict, "Insufficient available balance");
    }

    dataStore.updateWallet(userId, {
      availableBalance: wallet.availableBalance - input.amount
    });
    dataStore.addWalletTransaction(userId, -input.amount, WalletTxnType.Withdrawal, undefined, `Withdrawal to ${input.upiId}`);

    notificationService.send({
      userId,
      title: "Withdrawal initiated",
      body: `INR ${input.amount} withdrawal to ${input.upiId} is being processed.`
    });
    return this.getWallet(userId);
  }

  submitRating(userId: string, input: RatingSubmitInput) {
    const booking = dataStore.getBooking(input.bookingId);
    if (booking.status !== BookingStatus.Completed) {
      throw new AppError(409, ErrorCode.Conflict, "Rating is allowed after trip completion");
    }

    const ride = dataStore.getRide(booking.rideId);
    const isRider = booking.riderId === userId;
    const isDriver = ride.driverId === userId;

    if (!isRider && !isDriver) {
      throw new AppError(403, ErrorCode.Forbidden, "You are not a participant in this booking");
    }

    if (isRider && input.role !== RatingRole.RiderToDriver) {
      throw new AppError(400, ErrorCode.ValidationFailed, "Rider must submit rider-to-driver rating");
    }
    if (isDriver && input.role !== RatingRole.DriverToRider) {
      throw new AppError(400, ErrorCode.ValidationFailed, "Driver must submit driver-to-rider rating");
    }

    const toUserId = isRider ? ride.driverId : booking.riderId;
    const rating = dataStore.addRating({
      bookingId: input.bookingId,
      fromUserId: userId,
      toUserId,
      score: input.score,
      comment: input.comment,
      role: input.role
    });
    this.logActivity("RATING_SUBMITTED", userId, {
      bookingId: input.bookingId,
      role: input.role,
      score: input.score
    });
    return rating;
  }

  revealRatings(userId: string, bookingId: string): RatingsRevealResponse {
    const booking = dataStore.getBooking(bookingId);
    const ride = dataStore.getRide(booking.rideId);
    if (booking.riderId !== userId && ride.driverId !== userId) {
      throw new AppError(403, ErrorCode.Forbidden, "Ratings are private to participants");
    }

    const ratings = dataStore.getRatings(bookingId);
    const hasRiderRating = ratings.some((item) => item.role === RatingRole.RiderToDriver);
    const hasDriverRating = ratings.some((item) => item.role === RatingRole.DriverToRider);
    const visible = hasRiderRating && hasDriverRating;
    return {
      visible,
      ratings: visible ? ratings : []
    };
  }

  listChats(userId: string, bookingId: string): BookingChatResponse {
    this.assertBookingParticipant(userId, bookingId);
    return {
      bookingId,
      messages: dataStore.getChatMessages(bookingId)
    };
  }

  async sendChatMessage(userId: string, bookingId: string, message: string): Promise<ChatMessage> {
    this.assertBookingParticipant(userId, bookingId);
    const payload: ChatMessage = {
      id: uuidv4(),
      bookingId,
      senderId: userId,
      message,
      createdAt: new Date().toISOString()
    };
    dataStore.putChatMessage(payload);
    await firebaseAdminService.pushChatMessage(firebasePaths.chat(bookingId), payload);
    return payload;
  }

  registerPushToken(userId: string, token: string, platform: "IOS" | "ANDROID"): { registered: true } {
    dataStore.upsertPushToken(userId, token, platform);
    return { registered: true };
  }

  processRazorpayWebhook(eventType: string, payload: unknown) {
    // Idempotency can be implemented with persistent storage keyed by event id.
    return {
      received: true,
      eventType,
      payload
    };
  }

  private logActivity(type: string, userId?: string, metadata?: Record<string, unknown>) {
    void firebaseAdminService.logActivity({
      type,
      userId,
      metadata
    });
  }

  private mapBookingDetails(bookingId: string): BookingWithDetails {
    const booking = dataStore.getBooking(bookingId);
    const ride = dataStore.getRide(booking.rideId);
    const rider = dataStore.getUser(booking.riderId);
    const driver = dataStore.getUser(ride.driverId);
    return {
      ...booking,
      ride,
      rider,
      driver
    };
  }

  private getUserActiveBooking(userId: string): BookingWithDetails | undefined {
    const booking = this.findActiveBookingForRider(userId);
    if (!booking) {
      return undefined;
    }
    return this.mapBookingDetails(booking.id);
  }

  private getUserActiveTrip(userId: string): ActiveTripResponse | undefined {
    const trip = this.getActiveTripForUser(userId);
    return trip ?? undefined;
  }

  private assertBookingParticipant(userId: string, bookingId: string): void {
    const booking = dataStore.getBooking(bookingId);
    const ride = dataStore.getRide(booking.rideId);
    if (booking.riderId !== userId && ride.driverId !== userId) {
      throw new AppError(403, ErrorCode.Forbidden, "Not allowed for this booking");
    }
  }

  private findActiveBookingForRider(riderId: string, excludeBookingId?: string) {
    return [...dataStore.bookings.values()].find((booking) => {
      if (booking.riderId !== riderId) return false;
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      return this.activeBookingStatuses.includes(booking.status);
    });
  }

  private findActiveBookingForRide(rideId: string, excludeBookingId?: string) {
    return dataStore.getBookingsForRide(rideId).find((booking) => {
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      return this.activeBookingStatuses.includes(booking.status);
    });
  }

  private findActiveBookingForDriver(driverId: string, excludeBookingId?: string) {
    return [...dataStore.bookings.values()].find((booking) => {
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      if (!this.activeBookingStatuses.includes(booking.status)) return false;
      const bookingRide = dataStore.getRide(booking.rideId);
      return bookingRide.driverId === driverId;
    });
  }
}

export const platformService = new PlatformService();
