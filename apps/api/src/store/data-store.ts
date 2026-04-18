import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
} from "@ahmedabadcar/shared";
import {
  BookingStatus,
  KycStatus,
  PaymentStatus,
  RatingRole,
  RideStatus,
  TripStatus,
  UserMode,
  ErrorCode,
  WalletTxnType
} from "@ahmedabadcar/shared";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import { firebaseAdminService } from "../services/firebase-admin.service.js";
import { AppError } from "../utils/app-error.js";
import { normalizePhoneNumber } from "../utils/phone.js";

interface RefreshSession {
  token: string;
  userId: string;
  createdAt: string;
}

interface OtpRecord {
  phoneNumber: string;
  code: string;
  expiresAt: number;
}

interface PushTokenRecord {
  userId: string;
  token: string;
  platform: "IOS" | "ANDROID";
  createdAt: string;
}

interface PersistedData {
  users: UserProfile[];
  drivers: DriverProfile[];
  rides: Ride[];
  bookings: Booking[];
  trips: Trip[];
  wallets: Wallet[];
  walletTransactions: Array<[string, WalletTransaction[]]>;
  ratings: Array<[string, Rating[]]>;
  refreshSessions: RefreshSession[];
  chatMessages: Array<[string, ChatMessage[]]>;
  liveLocations: LiveLocationPoint[];
  pushTokens: Array<[string, PushTokenRecord[]]>;
}

export interface DeleteUserCascadeResult {
  userId: string;
  phoneNumber: string;
  rideIds: string[];
  bookingIds: string[];
  tripIds: string[];
  chatsDeleted: number;
  ratingsDeleted: number;
}

export class DataStore {
  private readonly persistenceEnabled = process.env.NODE_ENV !== "test" && !process.env.VITEST;
  private readonly persistPath = this.resolvePersistPath();
  public users = new Map<string, UserProfile>();
  public drivers = new Map<string, DriverProfile>();
  public rides = new Map<string, Ride>();
  public bookings = new Map<string, Booking>();
  public trips = new Map<string, Trip>();
  public wallets = new Map<string, Wallet>();
  public walletTransactions = new Map<string, WalletTransaction[]>();
  public ratings = new Map<string, Rating[]>();
  public refreshSessions = new Map<string, RefreshSession>();
  public otpStore = new Map<string, OtpRecord>();
  public chatMessages = new Map<string, ChatMessage[]>();
  public liveLocations = new Map<string, LiveLocationPoint>();
  public pushTokens = new Map<string, PushTokenRecord[]>();

  constructor() {
    this.loadFromDisk();
    this.syncStateToFirestore();
  }

  private resolvePersistPath(): string {
    if (env.NODE_ENV === "test") {
      return "";
    }
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const appRoot = path.resolve(currentDir, "..", "..");
    return path.join(appRoot, ".data", "store.json");
  }

  private loadFromDisk(): void {
    if (!this.persistenceEnabled || !this.persistPath || !fs.existsSync(this.persistPath)) {
      return;
    }
    try {
      const raw = fs.readFileSync(this.persistPath, "utf-8");
      const parsed = JSON.parse(raw) as PersistedData;

      this.users = new Map((parsed.users ?? []).map((item) => [item.id, item]));
      this.drivers = new Map((parsed.drivers ?? []).map((item) => [item.userId, item]));
      this.rides = new Map((parsed.rides ?? []).map((item) => [item.id, item]));
      this.bookings = new Map((parsed.bookings ?? []).map((item) => [item.id, item]));
      this.trips = new Map((parsed.trips ?? []).map((item) => [item.id, item]));
      this.wallets = new Map((parsed.wallets ?? []).map((item) => [item.userId, item]));
      this.walletTransactions = new Map(parsed.walletTransactions ?? []);
      this.ratings = new Map(parsed.ratings ?? []);
      this.refreshSessions = new Map((parsed.refreshSessions ?? []).map((item) => [item.token, item]));
      this.chatMessages = new Map(parsed.chatMessages ?? []);
      this.liveLocations = new Map((parsed.liveLocations ?? []).map((item) => [item.tripId, item]));
      this.pushTokens = new Map(parsed.pushTokens ?? []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to load persisted datastore. Starting with in-memory state.", error);
    }
  }

  private persistToDisk(): void {
    if (!this.persistenceEnabled || !this.persistPath) {
      return;
    }
    try {
      fs.mkdirSync(path.dirname(this.persistPath), { recursive: true });
      const payload: PersistedData = {
        users: [...this.users.values()],
        drivers: [...this.drivers.values()],
        rides: [...this.rides.values()],
        bookings: [...this.bookings.values()],
        trips: [...this.trips.values()],
        wallets: [...this.wallets.values()],
        walletTransactions: [...this.walletTransactions.entries()],
        ratings: [...this.ratings.entries()],
        refreshSessions: [...this.refreshSessions.values()],
        chatMessages: [...this.chatMessages.entries()],
        liveLocations: [...this.liveLocations.values()],
        pushTokens: [...this.pushTokens.entries()]
      };
      fs.writeFileSync(this.persistPath, JSON.stringify(payload, null, 2), "utf-8");
      void firebaseAdminService.syncStateSnapshot(payload);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to persist datastore state.", error);
    }
  }

  private syncStateToFirestore(): void {
    if (!this.persistenceEnabled) {
      return;
    }
    void firebaseAdminService.syncStateSnapshot({
      users: [...this.users.values()],
      drivers: [...this.drivers.values()],
      rides: [...this.rides.values()],
      bookings: [...this.bookings.values()],
      trips: [...this.trips.values()],
      wallets: [...this.wallets.values()],
      walletTransactions: [...this.walletTransactions.entries()],
      ratings: [...this.ratings.entries()],
      refreshSessions: [...this.refreshSessions.values()],
      chatMessages: [...this.chatMessages.entries()],
      liveLocations: [...this.liveLocations.values()],
      pushTokens: [...this.pushTokens.entries()]
    });
  }

  private userActivityScore(userId: string): number {
    const user = this.users.get(userId);
    if (!user) {
      return 0;
    }
    const ridesCount = [...this.rides.values()].filter((ride) => ride.driverId === userId).length;
    const bookingsCount = [...this.bookings.values()].filter((booking) => booking.riderId === userId).length;
    const tripsCount = [...this.trips.values()].filter((trip) => trip.driverId === userId).length;
    const wallet = this.wallets.get(userId);
    const driver = this.drivers.get(userId);
    return (
      (user.fullName?.trim() ? 10 : 0) +
      ridesCount * 4 +
      bookingsCount * 3 +
      tripsCount * 3 +
      ((wallet?.availableBalance ?? 0) > 0 || (wallet?.escrowBalance ?? 0) > 0 ? 2 : 0) +
      (driver?.kycStatus === KycStatus.Verified ? 3 : 0)
    );
  }

  private mergeUserInto(targetUserId: string, sourceUserId: string): void {
    if (targetUserId === sourceUserId) {
      return;
    }
    const targetUser = this.users.get(targetUserId);
    const sourceUser = this.users.get(sourceUserId);
    if (!targetUser || !sourceUser) {
      return;
    }

    for (const [rideId, ride] of this.rides.entries()) {
      if (ride.driverId === sourceUserId) {
        this.rides.set(rideId, { ...ride, driverId: targetUserId, updatedAt: new Date().toISOString() });
      }
    }
    for (const [bookingId, booking] of this.bookings.entries()) {
      if (booking.riderId === sourceUserId) {
        this.bookings.set(bookingId, { ...booking, riderId: targetUserId, updatedAt: new Date().toISOString() });
      }
    }
    for (const [tripId, trip] of this.trips.entries()) {
      if (trip.driverId === sourceUserId) {
        this.trips.set(tripId, { ...trip, driverId: targetUserId, updatedAt: new Date().toISOString() });
      }
    }

    const targetWallet = this.wallets.get(targetUserId);
    const sourceWallet = this.wallets.get(sourceUserId);
    if (targetWallet || sourceWallet) {
      this.wallets.set(targetUserId, {
        userId: targetUserId,
        availableBalance: (targetWallet?.availableBalance ?? 0) + (sourceWallet?.availableBalance ?? 0),
        escrowBalance: (targetWallet?.escrowBalance ?? 0) + (sourceWallet?.escrowBalance ?? 0),
        updatedAt: new Date().toISOString()
      });
    }

    const mergedTransactions = [...(this.walletTransactions.get(targetUserId) ?? []), ...(this.walletTransactions.get(sourceUserId) ?? [])];
    if (mergedTransactions.length) {
      const dedup = new Map(mergedTransactions.map((txn) => [txn.id, { ...txn, userId: targetUserId }]));
      this.walletTransactions.set(targetUserId, [...dedup.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    }

    const targetDriver = this.drivers.get(targetUserId);
    const sourceDriver = this.drivers.get(sourceUserId);
    if (sourceDriver) {
      const mergedDriver: DriverProfile = {
        userId: targetUserId,
        kycStatus:
          targetDriver?.kycStatus === KycStatus.Verified || sourceDriver.kycStatus === KycStatus.Verified
            ? KycStatus.Verified
            : targetDriver?.kycStatus ?? sourceDriver.kycStatus,
        badgeLabel: targetDriver?.badgeLabel ?? sourceDriver.badgeLabel,
        aadhaarDocUrl: targetDriver?.aadhaarDocUrl ?? sourceDriver.aadhaarDocUrl,
        drivingLicenseDocUrl: targetDriver?.drivingLicenseDocUrl ?? sourceDriver.drivingLicenseDocUrl,
        vehicleRcDocUrl: targetDriver?.vehicleRcDocUrl ?? sourceDriver.vehicleRcDocUrl,
        vehicleNumber: targetDriver?.vehicleNumber ?? sourceDriver.vehicleNumber,
        vehicleModel: targetDriver?.vehicleModel ?? sourceDriver.vehicleModel,
        verifiedAt: targetDriver?.verifiedAt ?? sourceDriver.verifiedAt,
        rejectionReason: targetDriver?.rejectionReason ?? sourceDriver.rejectionReason,
        updatedAt: new Date().toISOString()
      };
      this.drivers.set(targetUserId, mergedDriver);
      if (mergedDriver.kycStatus === KycStatus.Verified) {
        this.users.set(targetUserId, {
          ...this.getUser(targetUserId),
          isDriverVerified: true,
          updatedAt: new Date().toISOString()
        });
      }
    }

    for (const [bookingId, ratingList] of this.ratings.entries()) {
      this.ratings.set(
        bookingId,
        ratingList.map((rating) => ({
          ...rating,
          fromUserId: rating.fromUserId === sourceUserId ? targetUserId : rating.fromUserId,
          toUserId: rating.toUserId === sourceUserId ? targetUserId : rating.toUserId
        }))
      );
    }

    for (const [token, session] of this.refreshSessions.entries()) {
      if (session.userId === sourceUserId) {
        this.refreshSessions.set(token, { ...session, userId: targetUserId });
      }
    }

    const mergedPushTokens = [...(this.pushTokens.get(targetUserId) ?? []), ...(this.pushTokens.get(sourceUserId) ?? [])];
    if (mergedPushTokens.length) {
      const dedupTokens = new Map(mergedPushTokens.map((item) => [item.token, { ...item, userId: targetUserId }]));
      this.pushTokens.set(targetUserId, [...dedupTokens.values()]);
    }

    this.users.set(targetUserId, {
      ...this.getUser(targetUserId),
      fullName: this.getUser(targetUserId).fullName || sourceUser.fullName,
      email: this.getUser(targetUserId).email || sourceUser.email,
      avatarUrl: this.getUser(targetUserId).avatarUrl || sourceUser.avatarUrl,
      gender: this.getUser(targetUserId).gender || sourceUser.gender,
      updatedAt: new Date().toISOString()
    });

    this.users.delete(sourceUserId);
    this.drivers.delete(sourceUserId);
    this.wallets.delete(sourceUserId);
    this.walletTransactions.delete(sourceUserId);
    this.pushTokens.delete(sourceUserId);
  }

  reset(): void {
    this.users.clear();
    this.drivers.clear();
    this.rides.clear();
    this.bookings.clear();
    this.trips.clear();
    this.wallets.clear();
    this.walletTransactions.clear();
    this.ratings.clear();
    this.refreshSessions.clear();
    this.otpStore.clear();
    this.chatMessages.clear();
    this.liveLocations.clear();
    this.pushTokens.clear();
    this.persistToDisk();
  }

  deleteUserCascade(userId: string): DeleteUserCascadeResult {
    const user = this.getUser(userId);
    const rideIds = [...this.rides.values()]
      .filter((ride) => ride.driverId === userId)
      .map((ride) => ride.id);
    const rideIdSet = new Set(rideIds);

    const bookingIds = [...this.bookings.values()]
      .filter((booking) => booking.riderId === userId || rideIdSet.has(booking.rideId))
      .map((booking) => booking.id);
    const bookingIdSet = new Set(bookingIds);

    const tripIds = [...this.trips.values()]
      .filter((trip) => trip.driverId === userId || rideIdSet.has(trip.rideId))
      .map((trip) => trip.id);
    const tripIdSet = new Set(tripIds);

    let chatsDeleted = 0;
    let ratingsDeleted = 0;

    for (const bookingId of bookingIds) {
      chatsDeleted += this.chatMessages.get(bookingId)?.length ?? 0;
      ratingsDeleted += this.ratings.get(bookingId)?.length ?? 0;
      this.chatMessages.delete(bookingId);
      this.ratings.delete(bookingId);
      this.bookings.delete(bookingId);
    }

    for (const rideId of rideIds) {
      this.rides.delete(rideId);
    }

    for (const tripId of tripIds) {
      this.trips.delete(tripId);
      this.liveLocations.delete(tripId);
    }

    for (const [tripId, trip] of this.trips.entries()) {
      if (tripIdSet.has(tripId)) {
        continue;
      }
      const filteredBookingIds = trip.activeBookingIds.filter((bookingId) => !bookingIdSet.has(bookingId));
      if (filteredBookingIds.length !== trip.activeBookingIds.length) {
        this.trips.set(tripId, {
          ...trip,
          activeBookingIds: filteredBookingIds,
          updatedAt: new Date().toISOString()
        });
      }
    }

    for (const [bookingId, bookingRatings] of this.ratings.entries()) {
      const filteredRatings = bookingRatings.filter((rating) => rating.fromUserId !== userId && rating.toUserId !== userId);
      if (filteredRatings.length !== bookingRatings.length) {
        ratingsDeleted += bookingRatings.length - filteredRatings.length;
      }
      if (!filteredRatings.length) {
        this.ratings.delete(bookingId);
      } else {
        this.ratings.set(bookingId, filteredRatings);
      }
    }

    for (const [token, session] of [...this.refreshSessions.entries()]) {
      if (session.userId === userId) {
        this.refreshSessions.delete(token);
      }
    }

    this.wallets.delete(userId);
    this.walletTransactions.delete(userId);
    this.drivers.delete(userId);
    this.users.delete(userId);
    this.pushTokens.delete(userId);
    this.otpStore.delete(normalizePhoneNumber(user.phoneNumber));

    this.persistToDisk();

    return {
      userId,
      phoneNumber: user.phoneNumber,
      rideIds,
      bookingIds,
      tripIds,
      chatsDeleted,
      ratingsDeleted
    };
  }

  upsertUser(phoneNumber: string, fullName = ""): UserProfile {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const existingMatches = [...this.users.values()].filter((item) => normalizePhoneNumber(item.phoneNumber) === normalizedPhone);
    if (existingMatches.length) {
      const canonical = existingMatches.sort((a, b) => this.userActivityScore(b.id) - this.userActivityScore(a.id))[0];
      for (const duplicate of existingMatches) {
        if (duplicate.id !== canonical.id) {
          this.mergeUserInto(canonical.id, duplicate.id);
        }
      }
      const refreshedCanonical = this.getUser(canonical.id);
      const updatedCanonical: UserProfile = {
        ...refreshedCanonical,
        phoneNumber: normalizedPhone,
        fullName: refreshedCanonical.fullName || fullName,
        updatedAt: new Date().toISOString()
      };
      this.users.set(canonical.id, updatedCanonical);
      this.persistToDisk();
      return updatedCanonical;
    }

    const now = new Date().toISOString();
    const user: UserProfile = {
      id: uuidv4(),
      phoneNumber: normalizedPhone,
      fullName,
      preferredMode: UserMode.Rider,
      isDriverVerified: false,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(user.id, user);

    const driverProfile: DriverProfile = {
      userId: user.id,
      kycStatus: KycStatus.NotStarted,
      updatedAt: now
    };
    this.drivers.set(user.id, driverProfile);

    this.wallets.set(user.id, {
      userId: user.id,
      availableBalance: 0,
      escrowBalance: 0,
      updatedAt: now
    });
    this.walletTransactions.set(user.id, []);
    this.persistToDisk();
    return user;
  }

  updateUser(userId: string, patch: Partial<UserProfile>): UserProfile {
    const existing = this.getUser(userId);
    const updated: UserProfile = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.users.set(userId, updated);
    this.persistToDisk();
    return updated;
  }

  getUser(userId: string): UserProfile {
    const user = this.users.get(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NotFound, "User not found");
    }
    return user;
  }

  getDriverProfile(userId: string): DriverProfile {
    const driver = this.drivers.get(userId);
    if (driver) {
      return driver;
    }

    // Backward-compatible self-heal for older persisted users.
    this.getUser(userId);
    const created: DriverProfile = {
      userId,
      kycStatus: KycStatus.NotStarted,
      updatedAt: new Date().toISOString()
    };
    this.drivers.set(userId, created);
    this.persistToDisk();
    return created;
  }

  updateDriverProfile(userId: string, patch: Partial<DriverProfile>): DriverProfile {
    const current = this.getDriverProfile(userId);
    const updated: DriverProfile = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.drivers.set(userId, updated);

    if (updated.kycStatus === KycStatus.Verified) {
      this.updateUser(userId, {
        isDriverVerified: true
      });
      return updated;
    }
    this.persistToDisk();
    return updated;
  }

  createRide(input: Omit<Ride, "id" | "createdAt" | "updatedAt">): Ride {
    const now = new Date().toISOString();
    const ride: Ride = {
      ...input,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    this.rides.set(ride.id, ride);
    this.persistToDisk();
    return ride;
  }

  updateRide(rideId: string, patch: Partial<Ride>): Ride {
    const current = this.getRide(rideId);
    const updated: Ride = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.rides.set(rideId, updated);
    this.persistToDisk();
    return updated;
  }

  getRide(rideId: string): Ride {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new AppError(404, ErrorCode.NotFound, "Ride not found");
    }
    return ride;
  }

  createBooking(input: Omit<Booking, "id" | "createdAt" | "updatedAt">): Booking {
    const now = new Date().toISOString();
    const booking: Booking = {
      ...input,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    this.bookings.set(booking.id, booking);
    this.persistToDisk();
    return booking;
  }

  updateBooking(bookingId: string, patch: Partial<Booking>): Booking {
    const current = this.getBooking(bookingId);
    const updated: Booking = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.bookings.set(bookingId, updated);
    this.persistToDisk();
    return updated;
  }

  getBooking(bookingId: string): Booking {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new AppError(404, ErrorCode.NotFound, "Booking not found");
    }
    return booking;
  }

  getBookingsForRide(rideId: string): Booking[] {
    return [...this.bookings.values()].filter((item) => item.rideId === rideId);
  }

  getBookingsForRider(riderId: string): Booking[] {
    return [...this.bookings.values()].filter((item) => item.riderId === riderId);
  }

  createTrip(input: Omit<Trip, "id" | "createdAt" | "updatedAt">): Trip {
    const now = new Date().toISOString();
    const trip: Trip = {
      ...input,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    this.trips.set(trip.id, trip);
    this.persistToDisk();
    return trip;
  }

  updateTrip(tripId: string, patch: Partial<Trip>): Trip {
    const current = this.getTrip(tripId);
    const updated: Trip = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.trips.set(tripId, updated);
    this.persistToDisk();
    return updated;
  }

  getTrip(tripId: string): Trip {
    const trip = this.trips.get(tripId);
    if (!trip) {
      throw new AppError(404, ErrorCode.NotFound, "Trip not found");
    }
    return trip;
  }

  getActiveTripByRide(rideId: string): Trip | undefined {
    return [...this.trips.values()].find((trip) => trip.rideId === rideId && trip.status === TripStatus.Active);
  }

  getWallet(userId: string): Wallet {
    const wallet = this.wallets.get(userId);
    if (wallet) {
      return wallet;
    }

    // Backward-compatible self-heal for older persisted users.
    this.getUser(userId);
    const created: Wallet = {
      userId,
      availableBalance: 0,
      escrowBalance: 0,
      updatedAt: new Date().toISOString()
    };
    this.wallets.set(userId, created);
    if (!this.walletTransactions.has(userId)) {
      this.walletTransactions.set(userId, []);
    }
    this.persistToDisk();
    return created;
  }

  updateWallet(userId: string, patch: Partial<Wallet>): Wallet {
    const current = this.getWallet(userId);
    const updated: Wallet = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.wallets.set(userId, updated);
    this.persistToDisk();
    return updated;
  }

  addWalletTransaction(userId: string, amount: number, type: WalletTxnType, referenceId?: string, note?: string): WalletTransaction {
    const transaction: WalletTransaction = {
      id: uuidv4(),
      userId,
      amount,
      type,
      referenceId,
      note,
      createdAt: new Date().toISOString()
    };
    const current = this.walletTransactions.get(userId) ?? [];
    current.unshift(transaction);
    this.walletTransactions.set(userId, current);
    this.persistToDisk();
    return transaction;
  }

  getWalletTransactions(userId: string): WalletTransaction[] {
    return this.walletTransactions.get(userId) ?? [];
  }

  addRating(input: Omit<Rating, "id" | "submittedAt">): Rating {
    const rating: Rating = {
      ...input,
      id: uuidv4(),
      submittedAt: new Date().toISOString()
    };
    const current = this.ratings.get(input.bookingId) ?? [];
    const filtered = current.filter((item) => item.role !== input.role);
    filtered.push(rating);
    this.ratings.set(input.bookingId, filtered);
    this.persistToDisk();
    return rating;
  }

  getRatings(bookingId: string): Rating[] {
    return this.ratings.get(bookingId) ?? [];
  }

  setOtp(phoneNumber: string, code: string, ttlMs = 5 * 60 * 1000): void {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    this.otpStore.set(normalizedPhone, {
      phoneNumber: normalizedPhone,
      code,
      expiresAt: Date.now() + ttlMs
    });
  }

  verifyOtp(phoneNumber: string, code: string): boolean {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const record = this.otpStore.get(normalizedPhone);
    if (!record) {
      return false;
    }
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(normalizedPhone);
      return false;
    }
    if (record.code !== code) {
      return false;
    }
    this.otpStore.delete(normalizedPhone);
    return true;
  }

  setRefreshSession(token: string, userId: string): void {
    this.refreshSessions.set(token, {
      token,
      userId,
      createdAt: new Date().toISOString()
    });
    this.persistToDisk();
  }

  hasRefreshSession(token: string): boolean {
    return this.refreshSessions.has(token);
  }

  revokeRefreshSession(token: string): void {
    this.refreshSessions.delete(token);
    this.persistToDisk();
  }

  putChatMessage(message: ChatMessage): ChatMessage {
    const current = this.chatMessages.get(message.bookingId) ?? [];
    current.push(message);
    this.chatMessages.set(message.bookingId, current);
    this.persistToDisk();
    return message;
  }

  getChatMessages(bookingId: string): ChatMessage[] {
    return this.chatMessages.get(bookingId) ?? [];
  }

  setLiveLocation(point: LiveLocationPoint): LiveLocationPoint {
    this.liveLocations.set(point.tripId, point);
    this.persistToDisk();
    return point;
  }

  getLiveLocation(tripId: string): LiveLocationPoint | undefined {
    return this.liveLocations.get(tripId);
  }

  upsertPushToken(userId: string, token: string, platform: "IOS" | "ANDROID"): void {
    const current = this.pushTokens.get(userId) ?? [];
    const without = current.filter((item) => item.token !== token);
    without.unshift({
      userId,
      token,
      platform,
      createdAt: new Date().toISOString()
    });
    this.pushTokens.set(userId, without);
    this.persistToDisk();
  }

  getPushTokens(userId: string): PushTokenRecord[] {
    return this.pushTokens.get(userId) ?? [];
  }
}

export const dataStore = new DataStore();

export const seedDemoData = (): void => {
  if (dataStore.users.size > 0) {
    return;
  }
  const driver = dataStore.upsertUser("+919999999991", "Demo Driver");
  const rider = dataStore.upsertUser("+919999999992", "Demo Rider");

  dataStore.updateDriverProfile(driver.id, {
    kycStatus: KycStatus.Verified,
    badgeLabel: "Verified Driver",
    vehicleModel: "Hyundai i20",
    vehicleNumber: "GJ01AB1234",
    verifiedAt: new Date().toISOString()
  });
  dataStore.updateUser(driver.id, { preferredMode: UserMode.Driver });
  dataStore.updateUser(rider.id, { preferredMode: UserMode.Rider });

  const ride = dataStore.createRide({
    driverId: driver.id,
    from: "Science City, Ahmedabad",
    to: "GIFT City, Gandhinagar",
    date: new Date().toISOString().slice(0, 10),
    departureTime: "09:00",
    seatsTotal: 3,
    seatsAvailable: 3,
    pricePerSeat: 220,
    suggestedPricePerSeat: 210,
    womenOnly: false,
    acAvailable: true,
    status: RideStatus.Open
  });

  const booking = dataStore.createBooking({
    rideId: ride.id,
    riderId: rider.id,
    seatsBooked: 1,
    amount: 220,
    status: BookingStatus.Confirmed,
    paymentStatus: PaymentStatus.InEscrow
  });

  dataStore.updateRide(ride.id, {
    seatsAvailable: 2
  });

  const riderWallet = dataStore.getWallet(rider.id);
  dataStore.updateWallet(rider.id, {
    escrowBalance: riderWallet.escrowBalance + booking.amount
  });
  dataStore.addWalletTransaction(rider.id, -booking.amount, WalletTxnType.EscrowCredit, booking.id, "Escrow reserved for booking");
};
