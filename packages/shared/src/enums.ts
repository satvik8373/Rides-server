export enum UserMode {
  Rider = "RIDER",
  Driver = "DRIVER"
}

export enum KycStatus {
  NotStarted = "NOT_STARTED",
  Pending = "PENDING",
  Verified = "VERIFIED",
  Rejected = "REJECTED"
}

export enum RideStatus {
  Draft = "DRAFT",
  Open = "OPEN",
  InProgress = "IN_PROGRESS",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED"
}

export enum BookingStatus {
  Requested = "REQUESTED",
  Accepted = "ACCEPTED",
  Rejected = "REJECTED",
  PaymentPending = "PAYMENT_PENDING",
  Confirmed = "CONFIRMED",
  Cancelled = "CANCELLED",
  Completed = "COMPLETED"
}

export enum TripStatus {
  NotStarted = "NOT_STARTED",
  Active = "ACTIVE",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED"
}

export enum PaymentStatus {
  Created = "CREATED",
  Authorized = "AUTHORIZED",
  Captured = "CAPTURED",
  InEscrow = "IN_ESCROW",
  Released = "RELEASED",
  Refunded = "REFUNDED",
  Failed = "FAILED"
}

export enum WalletTxnType {
  EscrowCredit = "ESCROW_CREDIT",
  PayoutRelease = "PAYOUT_RELEASE",
  Withdrawal = "WITHDRAWAL",
  CommissionDebit = "COMMISSION_DEBIT",
  RefundDebit = "REFUND_DEBIT",
  BonusCredit = "BONUS_CREDIT"
}

export enum RatingRole {
  RiderToDriver = "RIDER_TO_DRIVER",
  DriverToRider = "DRIVER_TO_RIDER"
}

export enum ErrorCode {
  Unauthorized = "UNAUTHORIZED",
  Forbidden = "FORBIDDEN",
  NotFound = "NOT_FOUND",
  ValidationFailed = "VALIDATION_FAILED",
  Conflict = "CONFLICT",
  PaymentFailed = "PAYMENT_FAILED",
  KycRequired = "KYC_REQUIRED",
  RideClosed = "RIDE_CLOSED",
  Unknown = "UNKNOWN"
}

