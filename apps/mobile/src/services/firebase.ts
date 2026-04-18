import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, off, onValue, push, ref, set } from "firebase/database";
import type { ChatMessage, LiveLocationPoint } from "@ahmedabadcar/shared";
import { appConfig } from "./config";

const firebaseConfig = {
  apiKey: appConfig.firebaseApiKey,
  authDomain: appConfig.firebaseAuthDomain,
  databaseURL: appConfig.firebaseDatabaseUrl,
  projectId: appConfig.firebaseProjectId,
  storageBucket: appConfig.firebaseStorageBucket,
  messagingSenderId: appConfig.firebaseMessagingSenderId,
  appId: appConfig.firebaseAppId
};

const isValidDatabaseUrl = (value?: string): boolean => {
  if (!value) {
    return false;
  }
  return /^https:\/\/.+(\.firebaseio\.com|\.firebasedatabase\.app)(\/)?$/i.test(value.trim());
};

const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && isValidDatabaseUrl(firebaseConfig.databaseURL));
let db: ReturnType<typeof getDatabase> | undefined;

if (firebaseEnabled) {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Firebase init failed. Realtime features are disabled.", error);
    db = undefined;
  }
} else {
  // eslint-disable-next-line no-console
  console.warn("Firebase config missing/invalid. Realtime features are disabled until EXPO_PUBLIC_FIREBASE_DATABASE_URL is set.");
}

const noopUnsubscribe = () => undefined;

export const firebaseService = {
  subscribeTripLocation(tripId: string, callback: (point?: LiveLocationPoint) => void) {
    if (!db) {
      callback(undefined);
      return noopUnsubscribe;
    }
    const node = ref(db, `/trips/${tripId}/location`);
    const listener = onValue(node, (snapshot) => {
      callback((snapshot.val() as LiveLocationPoint | null) ?? undefined);
    });
    return () => off(node, "value", listener);
  },
  subscribeChat(bookingId: string, callback: (messages: ChatMessage[]) => void) {
    if (!db) {
      callback([]);
      return noopUnsubscribe;
    }
    const node = ref(db, `/bookings/${bookingId}/chat`);
    const listener = onValue(node, (snapshot) => {
      const value = snapshot.val() ?? {};
      const messages = Object.values(value) as ChatMessage[];
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(messages);
    });
    return () => off(node, "value", listener);
  },
  async writeTripLocation(tripId: string, point: LiveLocationPoint) {
    if (!db) {
      return;
    }
    await set(ref(db, `/trips/${tripId}/location`), point);
  },
  async sendChatMessage(bookingId: string, message: ChatMessage) {
    if (!db) {
      return;
    }
    await push(ref(db, `/bookings/${bookingId}/chat`), message);
  }
};
