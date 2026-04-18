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
  ConfirmPaymentInput,
  CreatePaymentOrderInput,
  KycUploadInput,
  LiveLocationUpdateInput,
  ModeUpdateInput,
  DriverProfile,
  ChatMessage,
  LiveLocationPoint,
  ProfileSetupInput,
  RatingSubmitInput,
  Rating,
  RatingsRevealResponse,
  Ride,
  RideCancelInput,
  RideCreateInput,
  RideUpdateInput,
  RideSearchInput,
  RideWithDriver,
  TripEndInput,
  TripStartInput,
  UserProfile,
  WalletResponse,
  WalletWithdrawInput
} from "@ahmedabadcar/shared";
import { apiClient } from "./api-client";

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface ApiLocationSuggestion {
  id: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
  lat?: number;
  lng?: number;
  source: "GOOGLE" | "OSM";
}

export const api = {
  sendOtp(phoneNumber: string) {
    return apiClient.post("/auth/send-otp", { phoneNumber }).then(unwrap<{ sent: true; debugOtp?: string }>);
  },
  verifyOtp(phoneNumber: string, otp: string) {
    return apiClient.post("/auth/verify-otp", { phoneNumber, otp }).then(unwrap<AuthResponse>);
  },
  refresh(refreshToken: string) {
    return apiClient.post("/auth/refresh", { refreshToken }).then(unwrap<AuthResponse>);
  },
  logout(refreshToken: string) {
    return apiClient.post("/auth/logout", { refreshToken }).then(unwrap<{ success: true }>);
  },
  deleteAccount() {
    return apiClient
      .delete("/users/account")
      .then(
        unwrap<{
          deleted: true;
          deletedAt: string;
          summary: {
            ridesDeleted: number;
            bookingsDeleted: number;
            tripsDeleted: number;
            chatsDeleted: number;
            ratingsDeleted: number;
          };
        }>
      );
  },
  bootstrap() {
    return apiClient.get("/users/bootstrap").then(unwrap<AppBootstrapResponse>);
  },
  updateProfile(input: ProfileSetupInput) {
    return apiClient.put("/users/profile", input).then(unwrap<UserProfile>);
  },
  updateMode(input: ModeUpdateInput) {
    return apiClient.put("/users/mode", input).then(unwrap<UserProfile>);
  },
  uploadKyc(input: KycUploadInput) {
    return apiClient.post("/kyc/upload", input).then(unwrap<DriverProfile>);
  },
  getKycStatus() {
    return apiClient.get("/kyc/status").then(unwrap<DriverProfile>);
  },
  autocompleteLocations(query: string, near?: { lat: number; lng: number }) {
    return apiClient
      .get("/maps/autocomplete", {
        params: near
          ? {
              q: query,
              lat: near.lat,
              lng: near.lng
            }
          : { q: query }
      })
      .then(unwrap<ApiLocationSuggestion[]>);
  },
  searchRides(input: RideSearchInput) {
    return apiClient.post("/rides/search", input).then(unwrap<RideWithDriver[]>);
  },
  getRide(rideId: string) {
    return apiClient.get(`/rides/${rideId}`).then(unwrap<RideWithDriver>);
  },
  createRide(input: RideCreateInput) {
    return apiClient.post("/rides/create", input).then(unwrap<Ride>);
  },
  updateRide(rideId: string, input: RideUpdateInput) {
    return apiClient.put(`/rides/${rideId}`, input).then(unwrap<Ride>);
  },
  cancelRide(input: RideCancelInput) {
    return apiClient.post(`/rides/${input.rideId}/cancel`, input).then(unwrap<Ride>);
  },
  getDriverRides() {
    return apiClient.get("/rides/my/list").then(unwrap<Ride[]>);
  },
  getRideBookings(rideId: string) {
    return apiClient.get(`/rides/${rideId}/bookings`).then(unwrap<BookingWithDetails[]>);
  },
  getMyBookings() {
    return apiClient.get("/booking/my/list").then(unwrap<BookingWithDetails[]>);
  },
  requestBooking(input: BookingRequestInput) {
    return apiClient.post("/booking/request", input).then(unwrap<BookingWithDetails>);
  },
  respondBooking(input: BookingRespondInput) {
    return apiClient.post("/booking/respond", input).then(unwrap<BookingWithDetails>);
  },
  cancelBooking(input: BookingCancelInput) {
    return apiClient.post("/booking/cancel", input).then(unwrap<BookingWithDetails>);
  },
  acknowledgeBookingUpdate(input: BookingAcknowledgeUpdateInput) {
    return apiClient.post("/booking/ack-update", input).then(unwrap<BookingWithDetails>);
  },
  createPaymentOrder(input: CreatePaymentOrderInput) {
    return apiClient
      .post("/booking/pay-order", input)
      .then(unwrap<{ booking: BookingWithDetails; order: { id: string; amount: number; currency: string; keyId?: string } }>);
  },
  confirmPayment(input: ConfirmPaymentInput) {
    return apiClient.post("/booking/confirm-payment", input).then(unwrap<BookingWithDetails>);
  },
  startTrip(input: TripStartInput) {
    return apiClient.post("/trip/start", input).then(unwrap<ActiveTripResponse>);
  },
  endTrip(input: TripEndInput) {
    return apiClient.post("/trip/end", input).then(unwrap<ActiveTripResponse>);
  },
  updateLiveLocation(input: LiveLocationUpdateInput) {
    return apiClient.post("/trip/live", input).then(unwrap<LiveLocationPoint>);
  },
  getActiveTrip() {
    return apiClient.get("/trip/active").then(unwrap<ActiveTripResponse | null>);
  },
  getWallet() {
    return apiClient.get("/wallet").then(unwrap<WalletResponse>);
  },
  withdrawWallet(input: WalletWithdrawInput) {
    return apiClient.post("/wallet/withdraw", input).then(unwrap<WalletResponse>);
  },
  submitRating(input: RatingSubmitInput) {
    return apiClient.post("/ratings/submit", input).then(unwrap<Rating>);
  },
  revealRatings(bookingId: string) {
    return apiClient.get(`/ratings/reveal/${bookingId}`).then(unwrap<RatingsRevealResponse>);
  },
  getChat(bookingId: string) {
    return apiClient.get(`/chat/${bookingId}`).then(unwrap<BookingChatResponse>);
  },
  sendChat(bookingId: string, message: string) {
    return apiClient.post(`/chat/${bookingId}`, { message }).then(unwrap<ChatMessage>);
  },
  registerPushToken(token: string, platform: "IOS" | "ANDROID") {
    return apiClient.post("/notifications/push-token", { token, platform }).then(unwrap<{ registered: true }>);
  }
};
