import {
  type BookingAcknowledgeUpdateInput,
  type BookingCancelInput,
  KycStatus,
  RideStatus,
  sendOtpSchema,
  verifyOtpSchema,
  type BookingRequestInput,
  type BookingRespondInput,
  type ConfirmPaymentInput,
  type CreatePaymentOrderInput,
  type KycStatusUpdateInput,
  type KycUploadInput,
  type LiveLocationUpdateInput,
  type ModeUpdateInput,
  type ProfileSetupInput,
  type RatingSubmitInput,
  type RideCreateInput,
  type RideCancelInput,
  type RideUpdateInput,
  type RideSearchInput,
  type TripEndInput,
  type TripStartInput,
  type WalletWithdrawInput
} from "@ahmedabadcar/shared";
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { locationService } from "../../services/location.service.js";
import { platformService } from "../../services/platform.service.js";
import { postgresService } from "../../services/postgres.service.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();

router.get("/health", async (_req, res) => {
  return sendSuccess(res, {
    status: "ok",
    service: "AhmedabadCar API",
    now: new Date().toISOString(),
    postgresEnabled: postgresService.enabled,
    postgresHealthy: await postgresService.checkHealth()
  });
});

router.post("/auth/send-otp", async (req, res) => {
  const input = sendOtpSchema.parse(req.body);
  const output = await platformService.sendOtp(input.phoneNumber);
  return sendSuccess(res, output);
});

router.post("/auth/verify-otp", async (req, res) => {
  const input = verifyOtpSchema.parse(req.body);
  const output = await platformService.verifyOtp(input);
  return sendSuccess(res, output);
});

router.post("/auth/refresh", (req, res) => {
  const input = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
  return sendSuccess(res, platformService.refreshToken(input.refreshToken));
});

router.post("/auth/logout", (req, res) => {
  const input = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
  return sendSuccess(res, platformService.logout(input.refreshToken));
});

router.use(authMiddleware);

router.get("/maps/autocomplete", async (req, res) => {
  const input = z
    .object({
      q: z.string().min(2).max(120),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional()
    })
    .refine((value) => (value.lat === undefined && value.lng === undefined) || (value.lat !== undefined && value.lng !== undefined), {
      message: "lat and lng must be provided together",
      path: ["lat"]
    })
    .parse({
      q: String(req.query.q ?? ""),
      lat: req.query.lat === undefined ? undefined : Number(req.query.lat),
      lng: req.query.lng === undefined ? undefined : Number(req.query.lng)
    });

  return sendSuccess(
    res,
    await locationService.autocomplete(
      input.q,
      input.lat !== undefined && input.lng !== undefined
        ? {
            lat: input.lat,
            lng: input.lng
          }
        : undefined
    )
  );
});

router.delete("/users/account", (req, res) => {
  return sendSuccess(res, platformService.deleteAccount(req.user!.userId));
});

router.get("/users/bootstrap", (req, res) => {
  return sendSuccess(res, platformService.getBootstrap(req.user!.userId));
});

router.get("/users/profile", (req, res) => {
  const bootstrap = platformService.getBootstrap(req.user!.userId);
  return sendSuccess(res, {
    user: bootstrap.user,
    driverProfile: bootstrap.driverProfile
  });
});

router.get("/user/profile", (req, res) => {
  const bootstrap = platformService.getBootstrap(req.user!.userId);
  return sendSuccess(res, {
    user: bootstrap.user,
    driverProfile: bootstrap.driverProfile
  });
});

router.put("/users/profile", (req, res) => {
  const input = z.object({
    fullName: z.string().min(2),
    email: z.string().email().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional()
  }).parse(req.body) as ProfileSetupInput;
  return sendSuccess(res, platformService.updateProfile(req.user!.userId, input));
});

router.put("/user/update", (req, res) => {
  const input = z.object({
    fullName: z.string().min(2),
    email: z.string().email().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional()
  }).parse(req.body) as ProfileSetupInput;
  return sendSuccess(res, platformService.updateProfile(req.user!.userId, input));
});

router.put("/users/mode", (req, res) => {
  const input = z.object({
    mode: z.enum(["RIDER", "DRIVER"])
  }).parse(req.body) as ModeUpdateInput;
  return sendSuccess(res, platformService.updateMode(req.user!.userId, input));
});

router.post("/kyc/upload", (req, res) => {
  const input = z.object({
    aadhaarDocUrl: z.string().min(4),
    drivingLicenseDocUrl: z.string().min(4),
    vehicleRcDocUrl: z.string().min(4),
    vehicleNumber: z.string().min(4),
    vehicleModel: z.string().min(2)
  }).parse(req.body) as KycUploadInput;
  return sendSuccess(res, platformService.uploadKyc(req.user!.userId, input));
});

router.get("/kyc/status", (req, res) => {
  return sendSuccess(res, platformService.getKycStatus(req.user!.userId));
});

router.post("/kyc/admin/status", (req, res) => {
  // In production, protect using an admin auth guard and RBAC.
  const input = z.object({
    userId: z.string().uuid(),
    status: z.nativeEnum(KycStatus),
    rejectionReason: z.string().optional()
  }).parse(req.body) as KycStatusUpdateInput;
  return sendSuccess(res, platformService.updateKycStatus(input));
});

router.post("/rides/create", async (req, res) => {
  const input = z.object({
    from: z.string().min(2),
    to: z.string().min(2),
    date: z.string().min(8),
    departureTime: z.string().min(3),
    seatsTotal: z.number().int().positive().max(8),
    pricePerSeat: z.number().positive(),
    womenOnly: z.boolean().optional(),
    acAvailable: z.boolean().optional(),
    routePolyline: z.string().optional()
  }).parse(req.body) as RideCreateInput;
  const ride = await platformService.createRide(req.user!.userId, input);
  return sendSuccess(res, ride, 201);
});

router.post("/rides/search", async (req, res) => {
  const input = z.object({
    from: z.string().min(2),
    to: z.string().min(2),
    date: z.string().min(8),
    maxPrice: z.number().positive().optional(),
    womenOnly: z.boolean().optional(),
    acAvailable: z.boolean().optional()
  }).parse(req.body) as RideSearchInput;
  return sendSuccess(res, await platformService.searchRides(input));
});

router.get("/rides/my/list", (req, res) => {
  return sendSuccess(res, platformService.getDriverRides(req.user!.userId));
});

router.get("/rides/:id", (req, res) => {
  return sendSuccess(res, platformService.getRideDetails(req.params.id));
});

router.put("/rides/:id/status", (req, res) => {
  const input = z.object({ status: z.nativeEnum(RideStatus) }).parse(req.body);
  return sendSuccess(res, platformService.updateRideStatus(req.user!.userId, req.params.id, input.status));
});

router.put("/rides/:id", (req, res) => {
  const input = z.object({
    from: z.string().min(2).optional(),
    to: z.string().min(2).optional(),
    date: z.string().min(8).optional(),
    departureTime: z.string().min(3).optional(),
    seatsTotal: z.number().int().positive().max(8).optional(),
    pricePerSeat: z.number().positive().optional(),
    womenOnly: z.boolean().optional(),
    acAvailable: z.boolean().optional(),
    routePolyline: z.string().optional(),
    updateNote: z.string().max(280).optional()
  }).parse(req.body) as RideUpdateInput;
  return sendSuccess(res, platformService.updateRideDetails(req.user!.userId, req.params.id, input));
});

router.post("/rides/:id/cancel", (req, res) => {
  const input = z.object({
    rideId: z.string().uuid(),
    reason: z.string().min(2).max(120),
    customMessage: z.string().max(280).optional()
  }).parse({ ...req.body, rideId: req.params.id }) as RideCancelInput;
  return sendSuccess(res, platformService.cancelRide(req.user!.userId, input));
});

router.get("/rides/:id/bookings", (req, res) => {
  return sendSuccess(res, platformService.getRideBookings(req.user!.userId, req.params.id));
});

router.post("/booking/request", (req, res) => {
  const input = z.object({
    rideId: z.string().uuid(),
    seatsBooked: z.number().int().positive().max(6)
  }).parse(req.body) as BookingRequestInput;
  return sendSuccess(res, platformService.requestBooking(req.user!.userId, input), 201);
});

router.get("/booking/my/list", (req, res) => {
  return sendSuccess(res, platformService.getRiderBookings(req.user!.userId));
});

router.post("/booking/respond", (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid(),
    action: z.enum(["ACCEPT", "REJECT"])
  }).parse(req.body) as BookingRespondInput;
  return sendSuccess(res, platformService.respondToBooking(req.user!.userId, input));
});

router.post("/booking/cancel", (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid(),
    reason: z.string().max(280).optional()
  }).parse(req.body) as BookingCancelInput;
  return sendSuccess(res, platformService.cancelBooking(req.user!.userId, input));
});

router.post("/booking/ack-update", (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid()
  }).parse(req.body) as BookingAcknowledgeUpdateInput;
  return sendSuccess(res, platformService.acknowledgeBookingUpdate(req.user!.userId, input));
});

router.post("/booking/pay-order", async (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid()
  }).parse(req.body) as CreatePaymentOrderInput;
  return sendSuccess(res, await platformService.createPaymentOrder(req.user!.userId, input));
});

router.post("/booking/confirm-payment", (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid(),
    razorpayPaymentId: z.string().min(4),
    razorpayOrderId: z.string().min(4),
    razorpaySignature: z.string().min(4)
  }).parse(req.body) as ConfirmPaymentInput;
  return sendSuccess(res, platformService.confirmPayment(req.user!.userId, input));
});

router.post("/trip/start", (req, res) => {
  const input = z.object({
    rideId: z.string().uuid()
  }).parse(req.body) as TripStartInput;
  return sendSuccess(res, platformService.startTrip(req.user!.userId, input));
});

router.post("/trip/end", (req, res) => {
  const input = z.object({
    tripId: z.string().uuid()
  }).parse(req.body) as TripEndInput;
  return sendSuccess(res, platformService.endTrip(req.user!.userId, input));
});

router.post("/trip/live", (req, res) => {
  const input = z.object({
    tripId: z.string().uuid(),
    lat: z.number(),
    lng: z.number(),
    heading: z.number().optional(),
    speed: z.number().optional()
  }).parse(req.body) as LiveLocationUpdateInput;
  return sendSuccess(res, platformService.updateLiveLocation(req.user!.userId, input));
});

router.get("/trip/active", (req, res) => {
  return sendSuccess(res, platformService.getActiveTripForUser(req.user!.userId));
});

router.get("/wallet", (req, res) => {
  return sendSuccess(res, platformService.getWallet(req.user!.userId));
});

router.post("/wallet/withdraw", (req, res) => {
  const input = z.object({
    amount: z.number().positive(),
    upiId: z.string().min(4)
  }).parse(req.body) as WalletWithdrawInput;
  return sendSuccess(res, platformService.withdrawWallet(req.user!.userId, input));
});

router.post("/ratings/submit", (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid(),
    score: z.number().min(1).max(5),
    comment: z.string().max(280).optional(),
    role: z.enum(["RIDER_TO_DRIVER", "DRIVER_TO_RIDER"])
  }).parse(req.body) as RatingSubmitInput;
  return sendSuccess(res, platformService.submitRating(req.user!.userId, input), 201);
});

router.get("/ratings/reveal/:bookingId", (req, res) => {
  return sendSuccess(res, platformService.revealRatings(req.user!.userId, req.params.bookingId));
});

router.get("/chat/:bookingId", (req, res) => {
  return sendSuccess(res, platformService.listChats(req.user!.userId, req.params.bookingId));
});

router.post("/chat/:bookingId", async (req, res) => {
  const input = z.object({ message: z.string().min(1).max(1000) }).parse(req.body);
  const output = await platformService.sendChatMessage(req.user!.userId, req.params.bookingId, input.message);
  return sendSuccess(res, output, 201);
});

router.post("/notifications/push-token", (req, res) => {
  const input = z.object({
    token: z.string().min(8),
    platform: z.enum(["IOS", "ANDROID"])
  }).parse(req.body);
  return sendSuccess(res, platformService.registerPushToken(req.user!.userId, input.token, input.platform));
});

export default router;
