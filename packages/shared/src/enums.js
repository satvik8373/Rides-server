export var UserMode;
(function (UserMode) {
    UserMode["Rider"] = "RIDER";
    UserMode["Driver"] = "DRIVER";
})(UserMode || (UserMode = {}));
export var KycStatus;
(function (KycStatus) {
    KycStatus["NotStarted"] = "NOT_STARTED";
    KycStatus["Pending"] = "PENDING";
    KycStatus["Verified"] = "VERIFIED";
    KycStatus["Rejected"] = "REJECTED";
})(KycStatus || (KycStatus = {}));
export var RideStatus;
(function (RideStatus) {
    RideStatus["Draft"] = "DRAFT";
    RideStatus["Open"] = "OPEN";
    RideStatus["InProgress"] = "IN_PROGRESS";
    RideStatus["Completed"] = "COMPLETED";
    RideStatus["Cancelled"] = "CANCELLED";
})(RideStatus || (RideStatus = {}));
export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["Requested"] = "REQUESTED";
    BookingStatus["Accepted"] = "ACCEPTED";
    BookingStatus["Rejected"] = "REJECTED";
    BookingStatus["PaymentPending"] = "PAYMENT_PENDING";
    BookingStatus["Confirmed"] = "CONFIRMED";
    BookingStatus["Cancelled"] = "CANCELLED";
    BookingStatus["Completed"] = "COMPLETED";
})(BookingStatus || (BookingStatus = {}));
export var TripStatus;
(function (TripStatus) {
    TripStatus["NotStarted"] = "NOT_STARTED";
    TripStatus["Active"] = "ACTIVE";
    TripStatus["Completed"] = "COMPLETED";
    TripStatus["Cancelled"] = "CANCELLED";
})(TripStatus || (TripStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Created"] = "CREATED";
    PaymentStatus["Authorized"] = "AUTHORIZED";
    PaymentStatus["Captured"] = "CAPTURED";
    PaymentStatus["InEscrow"] = "IN_ESCROW";
    PaymentStatus["Released"] = "RELEASED";
    PaymentStatus["Refunded"] = "REFUNDED";
    PaymentStatus["Failed"] = "FAILED";
})(PaymentStatus || (PaymentStatus = {}));
export var WalletTxnType;
(function (WalletTxnType) {
    WalletTxnType["EscrowCredit"] = "ESCROW_CREDIT";
    WalletTxnType["PayoutRelease"] = "PAYOUT_RELEASE";
    WalletTxnType["Withdrawal"] = "WITHDRAWAL";
    WalletTxnType["CommissionDebit"] = "COMMISSION_DEBIT";
    WalletTxnType["RefundDebit"] = "REFUND_DEBIT";
    WalletTxnType["BonusCredit"] = "BONUS_CREDIT";
})(WalletTxnType || (WalletTxnType = {}));
export var RatingRole;
(function (RatingRole) {
    RatingRole["RiderToDriver"] = "RIDER_TO_DRIVER";
    RatingRole["DriverToRider"] = "DRIVER_TO_RIDER";
})(RatingRole || (RatingRole = {}));
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["Unauthorized"] = "UNAUTHORIZED";
    ErrorCode["Forbidden"] = "FORBIDDEN";
    ErrorCode["NotFound"] = "NOT_FOUND";
    ErrorCode["ValidationFailed"] = "VALIDATION_FAILED";
    ErrorCode["Conflict"] = "CONFLICT";
    ErrorCode["PaymentFailed"] = "PAYMENT_FAILED";
    ErrorCode["KycRequired"] = "KYC_REQUIRED";
    ErrorCode["RideClosed"] = "RIDE_CLOSED";
    ErrorCode["Unknown"] = "UNKNOWN";
})(ErrorCode || (ErrorCode = {}));
