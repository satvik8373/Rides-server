export type AuthStackParamList = {
  Login: undefined;
  OTP: { phoneNumber: string };
};

export type MainTabParamList = {
  Home: undefined;
  Trips: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  ProfileSetup: undefined;
  ModeSelection: undefined;
  ModeSelectionSettings: undefined;
  MainTabs: undefined;
  SearchResults: { from: string; to: string; date: string };
  RideDetail: { rideId: string };
  PostRide: undefined;
  ManageRide: { rideId?: string };
  BookingConfirmation: { bookingId: string };
  ActiveTripTracking: { tripId: string };
  BookingChat: { bookingId: string };
  WalletWithdraw: undefined;
  KYCStatus: undefined;
  Rating: { bookingId: string };
};
