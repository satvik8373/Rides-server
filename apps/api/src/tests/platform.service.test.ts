import { BookingStatus, KycStatus, PaymentStatus, RatingRole, RideStatus } from "@ahmedabadcar/shared";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { locationService } from "../services/location.service.js";
import { platformService } from "../services/platform.service.js";
import { dataStore } from "../store/data-store.js";

describe("PlatformService business rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    dataStore.reset();
  });

  it("releases escrow to driver wallet when trip ends", async () => {
    const driverAuth = await bootstrapVerifiedDriver("+919100000001", "Driver One");
    const riderAuth = await bootstrapRider("+919100000002", "Rider One");

    const ride = await platformService.createRide(driverAuth.user.id, {
      from: "Ahmedabad",
      to: "Gandhinagar",
      date: "2026-04-04",
      departureTime: "08:30",
      seatsTotal: 3,
      pricePerSeat: 200
    });

    const booking = platformService.requestBooking(riderAuth.user.id, {
      rideId: ride.id,
      seatsBooked: 1
    });
    platformService.respondToBooking(driverAuth.user.id, {
      bookingId: booking.id,
      action: "ACCEPT"
    });
    const order = await platformService.createPaymentOrder(riderAuth.user.id, { bookingId: booking.id });
    platformService.confirmPayment(riderAuth.user.id, {
      bookingId: booking.id,
      razorpayOrderId: order.order.id,
      razorpayPaymentId: "pay_test_1",
      razorpaySignature: "mock_signature"
    });

    const activeTrip = platformService.startTrip(driverAuth.user.id, { rideId: ride.id });
    platformService.endTrip(driverAuth.user.id, { tripId: activeTrip.trip.id });

    const driverWallet = platformService.getWallet(driverAuth.user.id).wallet;
    expect(driverWallet.availableBalance).toBeGreaterThan(0);
  });

  it("keeps ratings hidden until both users submit", async () => {
    const driverAuth = await bootstrapVerifiedDriver("+919100000003", "Driver Two");
    const riderAuth = await bootstrapRider("+919100000004", "Rider Two");

    const completedBooking = await createCompletedBooking(driverAuth.user.id, riderAuth.user.id);
    platformService.submitRating(riderAuth.user.id, {
      bookingId: completedBooking.id,
      role: RatingRole.RiderToDriver,
      score: 5,
      comment: "Great ride"
    });

    const afterOne = platformService.revealRatings(riderAuth.user.id, completedBooking.id);
    expect(afterOne.visible).toBe(false);

    platformService.submitRating(driverAuth.user.id, {
      bookingId: completedBooking.id,
      role: RatingRole.DriverToRider,
      score: 4,
      comment: "On time"
    });

    const afterBoth = platformService.revealRatings(riderAuth.user.id, completedBooking.id);
    expect(afterBoth.visible).toBe(true);
    expect(afterBoth.ratings).toHaveLength(2);
  });

  it("marks rider review required after driver edits and allows rider cancellation", async () => {
    const driverAuth = await bootstrapVerifiedDriver("+919100000005", "Driver Three");
    const riderAuth = await bootstrapRider("+919100000006", "Rider Three");

    const ride = await platformService.createRide(driverAuth.user.id, {
      from: "Vastrapur",
      to: "GIFT City",
      date: "2026-04-04",
      departureTime: "09:00",
      seatsTotal: 3,
      pricePerSeat: 250
    });

    const booking = platformService.requestBooking(riderAuth.user.id, {
      rideId: ride.id,
      seatsBooked: 1
    });
    platformService.respondToBooking(driverAuth.user.id, {
      bookingId: booking.id,
      action: "ACCEPT"
    });
    const order = await platformService.createPaymentOrder(riderAuth.user.id, { bookingId: booking.id });
    platformService.confirmPayment(riderAuth.user.id, {
      bookingId: booking.id,
      razorpayOrderId: order.order.id,
      razorpayPaymentId: "pay_test_3",
      razorpaySignature: "mock_signature"
    });

    platformService.updateRideDetails(driverAuth.user.id, ride.id, {
      departureTime: "09:20",
      seatsTotal: 4,
      updateNote: "Departure delayed by 20 minutes"
    });

    const withNotice = platformService.getRiderBookings(riderAuth.user.id).find((item) => item.id === booking.id);
    expect(withNotice?.driverEditNoticeAt).toBeTruthy();
    expect(withNotice?.driverEditNote).toContain("Departure delayed");
    expect(withNotice?.driverEditSummary?.some((line) => line.includes("Departure"))).toBe(true);

    platformService.acknowledgeBookingUpdate(riderAuth.user.id, { bookingId: booking.id });
    const acknowledged = platformService.getRiderBookings(riderAuth.user.id).find((item) => item.id === booking.id);
    expect(acknowledged?.riderUpdateAcknowledgedAt).toBeTruthy();

    const cancelled = platformService.cancelBooking(riderAuth.user.id, {
      bookingId: booking.id,
      reason: "Timing no longer works"
    });
    expect(cancelled.status).toBe(BookingStatus.Cancelled);
    expect(cancelled.paymentStatus).toBe(PaymentStatus.Refunded);

    const riderWallet = platformService.getWallet(riderAuth.user.id).wallet;
    expect(riderWallet.escrowBalance).toBe(0);
    const updatedRide = platformService.getRideDetails(ride.id);
    expect(updatedRide.seatsAvailable).toBe(updatedRide.seatsTotal);
  });

  it("allows only one active ride per driver until cancelled or completed", async () => {
    const driverAuth = await bootstrapVerifiedDriver("+919100000007", "Driver Four");

    const firstRide = await platformService.createRide(driverAuth.user.id, {
      from: "Ahmedabad",
      to: "Surat",
      date: "2026-04-04",
      departureTime: "07:00",
      seatsTotal: 3,
      pricePerSeat: 300
    });

    await expect(
      platformService.createRide(driverAuth.user.id, {
        from: "Ahmedabad",
        to: "Vadodara",
        date: "2026-04-04",
        departureTime: "10:00",
        seatsTotal: 3,
        pricePerSeat: 250
      })
    ).rejects.toThrow("already have an active ride");

    platformService.updateRideStatus(driverAuth.user.id, firstRide.id, RideStatus.Cancelled);

    const secondRide = await platformService.createRide(driverAuth.user.id, {
      from: "Ahmedabad",
      to: "Vadodara",
      date: "2026-04-04",
      departureTime: "10:00",
      seatsTotal: 3,
      pricePerSeat: 250
    });
    expect(secondRide.id).toBeTruthy();
  });

  it("finds partial-route rides for nearby pickup/drop using city-center search", async () => {
    const driverOne = await bootstrapVerifiedDriver("+919100000018", "Driver Ten");
    const driverTwo = await bootstrapVerifiedDriver("+919100000019", "Driver Eleven");

    vi.spyOn(locationService, "geocode").mockImplementation(async (query: string) => {
      const normalized = query.toLowerCase().trim();
      if (normalized === "himmatnagar") return { lat: 23.598, lng: 72.966, label: "Himmatnagar", source: "OSM" };
      if (normalized === "ahmedabad") return { lat: 23.0225, lng: 72.5714, label: "Ahmedabad", source: "OSM" };
      if (normalized === "prantij") return { lat: 23.437, lng: 72.854, label: "Prantij", source: "OSM" };
      if (normalized === "naroda") return { lat: 23.068, lng: 72.675, label: "Naroda", source: "OSM" };
      if (normalized === "gandhinagar") return { lat: 23.2233, lng: 72.6497, label: "Gandhinagar", source: "OSM" };
      return undefined;
    });
    vi.spyOn(locationService, "getRouteGeometry").mockImplementation(async (from: string, to: string) => {
      const key = `${from.toLowerCase().trim()}::${to.toLowerCase().trim()}`;
      if (key === "himmatnagar::ahmedabad") {
        return {
          source: "GOOGLE",
          polyline: "mock_polyline_forward",
          points: [
            { lat: 23.598, lng: 72.966 },
            { lat: 23.437, lng: 72.854 },
            { lat: 23.068, lng: 72.675 },
            { lat: 23.0225, lng: 72.5714 }
          ]
        };
      }
      if (key === "ahmedabad::himmatnagar") {
        return {
          source: "GOOGLE",
          polyline: "mock_polyline_reverse",
          points: [
            { lat: 23.0225, lng: 72.5714 },
            { lat: 23.068, lng: 72.675 },
            { lat: 23.437, lng: 72.854 },
            { lat: 23.598, lng: 72.966 }
          ]
        };
      }
      return undefined;
    });

    await platformService.createRide(driverOne.user.id, {
      from: "Himmatnagar",
      to: "Ahmedabad",
      date: "2026-04-04",
      departureTime: "08:45",
      seatsTotal: 3,
      pricePerSeat: 230
    });
    await platformService.createRide(driverTwo.user.id, {
      from: "Ahmedabad",
      to: "Himmatnagar",
      date: "2026-04-04",
      departureTime: "09:30",
      seatsTotal: 3,
      pricePerSeat: 210
    });

    const matches = await platformService.searchRides({
      from: "Prantij",
      to: "Naroda",
      date: "2026-04-04"
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.from).toBe("Himmatnagar");
    expect(matches[0]?.to).toBe("Ahmedabad");
    expect(matches.some((ride) => ride.from === "Ahmedabad" && ride.to === "Himmatnagar")).toBe(false);

    const nonMatches = await platformService.searchRides({
      from: "Himmatnagar",
      to: "Gandhinagar",
      date: "2026-04-04"
    });
    expect(nonMatches.length).toBe(0);
  });

  it("allows only one active booking per rider and one active rider per ride", async () => {
    const driverOne = await bootstrapVerifiedDriver("+919100000008", "Driver Five");
    const driverTwo = await bootstrapVerifiedDriver("+919100000009", "Driver Six");
    const riderOne = await bootstrapRider("+919100000010", "Rider Three");
    const riderTwo = await bootstrapRider("+919100000011", "Rider Four");

    const rideOne = await platformService.createRide(driverOne.user.id, {
      from: "Gota",
      to: "Prahladnagar",
      date: "2026-04-04",
      departureTime: "08:15",
      seatsTotal: 2,
      pricePerSeat: 160
    });
    const rideTwo = await platformService.createRide(driverTwo.user.id, {
      from: "Naranpura",
      to: "Maninagar",
      date: "2026-04-04",
      departureTime: "09:15",
      seatsTotal: 2,
      pricePerSeat: 140
    });

    const firstBooking = platformService.requestBooking(riderOne.user.id, {
      rideId: rideOne.id,
      seatsBooked: 1
    });

    expect(() =>
      platformService.requestBooking(riderTwo.user.id, {
        rideId: rideOne.id,
        seatsBooked: 1
      })
    ).toThrow("already has an active rider");

    expect(() =>
      platformService.requestBooking(riderOne.user.id, {
        rideId: rideTwo.id,
        seatsBooked: 1
      })
    ).toThrow("already have an active booking");

    platformService.cancelBooking(riderOne.user.id, {
      bookingId: firstBooking.id,
      reason: "Changed plans"
    });

    const afterCancel = platformService.requestBooking(riderTwo.user.id, {
      rideId: rideOne.id,
      seatsBooked: 1
    });
    expect(afterCancel.id).toBeTruthy();
  });

  it("cancels ride with rider notifications/refunds and blocks new ride creation for 24 hours", async () => {
    const driver = await bootstrapVerifiedDriver("+919100000012", "Driver Seven");
    const rider = await bootstrapRider("+919100000013", "Rider Five");

    const ride = await platformService.createRide(driver.user.id, {
      from: "Paldi",
      to: "SG Highway",
      date: "2026-04-04",
      departureTime: "11:00",
      seatsTotal: 2,
      pricePerSeat: 180
    });

    const booking = platformService.requestBooking(rider.user.id, {
      rideId: ride.id,
      seatsBooked: 1
    });
    platformService.respondToBooking(driver.user.id, {
      bookingId: booking.id,
      action: "ACCEPT"
    });
    const order = await platformService.createPaymentOrder(rider.user.id, { bookingId: booking.id });
    platformService.confirmPayment(rider.user.id, {
      bookingId: booking.id,
      razorpayOrderId: order.order.id,
      razorpayPaymentId: "pay_test_cancel_1",
      razorpaySignature: "mock_signature"
    });

    const cancelledRide = platformService.cancelRide(driver.user.id, {
      rideId: ride.id,
      reason: "Vehicle issue",
      customMessage: "Engine issue, trip cancelled."
    });
    expect(cancelledRide.status).toBe(RideStatus.Cancelled);
    expect(cancelledRide.cancellationReason).toBe("Vehicle issue");

    const riderBooking = platformService.getRiderBookings(rider.user.id).find((item) => item.id === booking.id);
    expect(riderBooking?.status).toBe(BookingStatus.Cancelled);
    expect(riderBooking?.paymentStatus).toBe(PaymentStatus.Refunded);
    expect(riderBooking?.driverCancellationReason).toBe("Vehicle issue");

    const riderWallet = platformService.getWallet(rider.user.id).wallet;
    expect(riderWallet.escrowBalance).toBe(0);

    await expect(
      platformService.createRide(driver.user.id, {
        from: "Paldi",
        to: "Gandhinagar",
        date: "2026-04-04",
        departureTime: "15:00",
        seatsTotal: 2,
        pricePerSeat: 200
      })
    ).rejects.toThrow("blocked from creating a new ride");
  });

  it("auto-cancels active rider booking while deleting account", async () => {
    const driver = await bootstrapVerifiedDriver("+919100000014", "Driver Eight");
    const rider = await bootstrapRider("+919100000015", "Rider Six");

    const ride = await platformService.createRide(driver.user.id, {
      from: "Thaltej",
      to: "GIFT City",
      date: "2026-04-04",
      departureTime: "12:00",
      seatsTotal: 2,
      pricePerSeat: 210
    });

    const booking = platformService.requestBooking(rider.user.id, {
      rideId: ride.id,
      seatsBooked: 1
    });

    const deleted = platformService.deleteAccount(rider.user.id);
    expect(deleted.deleted).toBe(true);
    expect(deleted.summary.bookingsDeleted).toBeGreaterThanOrEqual(1);
    expect(() => platformService.getBootstrap(rider.user.id)).toThrow("User not found");
    expect(() => dataStore.getWallet(rider.user.id)).toThrow("User not found");

    const refreshedRide = platformService.getRideDetails(ride.id);
    expect(refreshedRide.seatsAvailable).toBe(refreshedRide.seatsTotal);
    expect(platformService.getRideBookings(driver.user.id, ride.id).find((item) => item.id === booking.id)).toBeUndefined();
  });

  it("auto-cancels active driver ride and refunds rider while deleting account", async () => {
    const driver = await bootstrapVerifiedDriver("+919100000016", "Driver Nine");
    const rider = await bootstrapRider("+919100000017", "Rider Seven");

    const ride = await platformService.createRide(driver.user.id, {
      from: "Bodakdev",
      to: "Maninagar",
      date: "2026-04-04",
      departureTime: "13:30",
      seatsTotal: 2,
      pricePerSeat: 175
    });

    const booking = platformService.requestBooking(rider.user.id, {
      rideId: ride.id,
      seatsBooked: 1
    });
    platformService.respondToBooking(driver.user.id, {
      bookingId: booking.id,
      action: "ACCEPT"
    });
    const order = await platformService.createPaymentOrder(rider.user.id, { bookingId: booking.id });
    platformService.confirmPayment(rider.user.id, {
      bookingId: booking.id,
      razorpayOrderId: order.order.id,
      razorpayPaymentId: "pay_test_delete_driver_1",
      razorpaySignature: "mock_signature"
    });

    const deleted = platformService.deleteAccount(driver.user.id);
    expect(deleted.deleted).toBe(true);
    expect(deleted.summary.ridesDeleted).toBeGreaterThanOrEqual(1);
    expect(() => platformService.getBootstrap(driver.user.id)).toThrow("User not found");

    const riderWallet = platformService.getWallet(rider.user.id).wallet;
    expect(riderWallet.escrowBalance).toBe(0);
    const riderBookings = platformService.getRiderBookings(rider.user.id);
    expect(riderBookings.find((item) => item.id === booking.id)).toBeUndefined();
  });
});

const bootstrapVerifiedDriver = async (phoneNumber: string, name: string) => {
  await platformService.sendOtp(phoneNumber);
  const auth = await platformService.verifyOtp({ phoneNumber, otp: "123456" });
  platformService.updateProfile(auth.user.id, { fullName: name });
  platformService.uploadKyc(auth.user.id, {
    aadhaarDocUrl: "https://cdn.example.com/aadhaar.png",
    drivingLicenseDocUrl: "https://cdn.example.com/dl.png",
    vehicleRcDocUrl: "https://cdn.example.com/rc.png",
    vehicleNumber: "GJ01ZZ1234",
    vehicleModel: "Baleno"
  });
  platformService.updateKycStatus({
    userId: auth.user.id,
    status: KycStatus.Verified
  });
  return auth;
};

const bootstrapRider = async (phoneNumber: string, name: string) => {
  await platformService.sendOtp(phoneNumber);
  const auth = await platformService.verifyOtp({ phoneNumber, otp: "123456" });
  platformService.updateProfile(auth.user.id, { fullName: name });
  return auth;
};

const createCompletedBooking = async (driverId: string, riderId: string) => {
  const ride = await platformService.createRide(driverId, {
    from: "Navrangpura",
    to: "Infocity",
    date: "2026-04-04",
    departureTime: "10:00",
    seatsTotal: 2,
    pricePerSeat: 180
  });
  const booking = platformService.requestBooking(riderId, { rideId: ride.id, seatsBooked: 1 });
  platformService.respondToBooking(driverId, { bookingId: booking.id, action: "ACCEPT" });
  const order = await platformService.createPaymentOrder(riderId, { bookingId: booking.id });
  platformService.confirmPayment(riderId, {
    bookingId: booking.id,
    razorpayOrderId: order.order.id,
    razorpayPaymentId: "pay_test_2",
    razorpaySignature: "mock_signature"
  });
  const trip = platformService.startTrip(driverId, { rideId: ride.id });
  platformService.endTrip(driverId, { tripId: trip.trip.id });
  return booking;
};
