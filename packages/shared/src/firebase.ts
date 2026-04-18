import type { ChatMessage, LiveLocationPoint } from "./models.js";

export interface FirebaseChatChannel {
  bookingId: string;
  path: string;
  participants: string[];
  sampleMessage: ChatMessage;
}

export interface FirebaseTripLocationChannel {
  tripId: string;
  path: string;
  driverId: string;
  allowedRiderIds: string[];
  samplePoint: LiveLocationPoint;
}

export interface FirebaseContract {
  chatChannels: FirebaseChatChannel[];
  tripLocationChannels: FirebaseTripLocationChannel[];
}

export const firebasePaths = {
  chat: (bookingId: string) => `/bookings/${bookingId}/chat`,
  tripLocation: (tripId: string) => `/trips/${tripId}/location`
};
