import admin from "firebase-admin";
import { env } from "../config/env.js";

let initialized = false;
let warnedDisabled = false;
let warnedFirestoreError = false;

export interface FirestoreStateSnapshot {
  users: Array<{ id: string } & object>;
  drivers: Array<{ userId: string } & object>;
  rides: Array<{ id: string } & object>;
  bookings: Array<{ id: string } & object>;
  trips: Array<{ id: string } & object>;
  wallets: Array<{ userId: string } & object>;
  walletTransactions: Array<[string, unknown[]]>;
  ratings: Array<[string, unknown[]]>;
  chatMessages: Array<[string, unknown[]]>;
  liveLocations: Array<{ tripId: string } & object>;
  pushTokens: Array<[string, unknown[]]>;
  refreshSessions?: unknown[];
}

interface ActivityLogInput {
  type: string;
  userId?: string;
  phoneNumber?: string;
  metadata?: Record<string, unknown>;
}

interface DeleteAccountCleanupInput {
  userId: string;
  rideIds: string[];
  bookingIds: string[];
  tripIds: string[];
}

const initialize = (): void => {
  if (initialized) {
    return;
  }

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    if (!warnedDisabled) {
      // eslint-disable-next-line no-console
      console.warn("[FirebaseAdmin] Firebase credentials are missing. Firestore/RTDB sync is disabled.");
      warnedDisabled = true;
    }
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    }),
    databaseURL: env.FIREBASE_DATABASE_URL || `https://${env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
  initialized = true;
};

const getFirestore = () => {
  initialize();
  if (!initialized) {
    return undefined;
  }
  return admin.firestore();
};

const chunkedUpsert = async (
  collectionName: string,
  records: Array<Record<string, unknown>>,
  idKey: string
): Promise<void> => {
  if (!records.length) {
    return;
  }
  const db = getFirestore();
  if (!db) {
    return;
  }

  let batch = db.batch();
  let writes = 0;
  const commitBatch = async () => {
    if (!writes) return;
    await batch.commit();
    batch = db.batch();
    writes = 0;
  };

  for (const record of records) {
    const id = String(record[idKey] ?? "");
    if (!id) continue;
    batch.set(
      db.collection(collectionName).doc(id),
      {
        ...record,
        _syncedAt: new Date().toISOString()
      },
      { merge: true }
    );
    writes += 1;
    if (writes >= 400) {
      await commitBatch();
    }
  }

  await commitBatch();
};

export const firebaseAdminService = {
  isEnabled(): boolean {
    return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  },
  async pushTripLocation(path: string, payload: unknown): Promise<void> {
    initialize();
    if (!initialized) {
      return;
    }
    await admin.database().ref(path).set(payload);

    const db = getFirestore();
    if (!db) return;
    if (payload && typeof payload === "object" && "tripId" in payload) {
      const tripId = String((payload as { tripId?: string }).tripId ?? "");
      if (tripId) {
        await db.collection("liveLocations").doc(tripId).set(
          {
            ...(payload as Record<string, unknown>),
            _syncedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }
    }
  },
  async pushChatMessage(path: string, payload: unknown): Promise<void> {
    initialize();
    if (!initialized) {
      return;
    }
    await admin.database().ref(path).push(payload);
    const db = getFirestore();
    if (!db) return;
    if (payload && typeof payload === "object") {
      const bookingId = String((payload as { bookingId?: string }).bookingId ?? "");
      const messageId = String((payload as { id?: string }).id ?? "");
      if (bookingId && messageId) {
        await db
          .collection("chatMessages")
          .doc(bookingId)
          .collection("messages")
          .doc(messageId)
          .set(
            {
              ...(payload as Record<string, unknown>),
              _syncedAt: new Date().toISOString()
            },
            { merge: true }
          );
      }
    }
  },
  async syncStateSnapshot(snapshot: FirestoreStateSnapshot): Promise<void> {
    const db = getFirestore();
    if (!db) {
      return;
    }

    try {
      await chunkedUpsert("users", snapshot.users as Array<Record<string, unknown>>, "id");
      await chunkedUpsert("driverProfiles", snapshot.drivers as Array<Record<string, unknown>>, "userId");
      await chunkedUpsert("rides", snapshot.rides as Array<Record<string, unknown>>, "id");
      await chunkedUpsert("bookings", snapshot.bookings as Array<Record<string, unknown>>, "id");
      await chunkedUpsert("trips", snapshot.trips as Array<Record<string, unknown>>, "id");
      await chunkedUpsert("wallets", snapshot.wallets as Array<Record<string, unknown>>, "userId");
      await chunkedUpsert("liveLocations", snapshot.liveLocations as Array<Record<string, unknown>>, "tripId");

      await chunkedUpsert(
        "walletTransactions",
        snapshot.walletTransactions.map(([userId, transactions]) => ({
          userId,
          transactions
        })),
        "userId"
      );

      await chunkedUpsert(
        "ratings",
        snapshot.ratings.map(([bookingId, ratings]) => ({
          bookingId,
          ratings
        })),
        "bookingId"
      );

      await chunkedUpsert(
        "chatMessageSnapshots",
        snapshot.chatMessages.map(([bookingId, messages]) => ({
          bookingId,
          messages
        })),
        "bookingId"
      );

      await chunkedUpsert(
        "pushTokens",
        snapshot.pushTokens.map(([userId, tokens]) => ({
          userId,
          tokens
        })),
        "userId"
      );

      await db.collection("syncMeta").doc("state").set(
        {
          lastSyncedAt: new Date().toISOString(),
          counts: {
            users: snapshot.users.length,
            drivers: snapshot.drivers.length,
            rides: snapshot.rides.length,
            bookings: snapshot.bookings.length,
            trips: snapshot.trips.length
          }
        },
        { merge: true }
      );
    } catch (error) {
      if (!warnedFirestoreError) {
        // eslint-disable-next-line no-console
        console.warn("[FirebaseAdmin] Firestore snapshot sync failed.", error);
        warnedFirestoreError = true;
      }
    }
  },
  async cleanupDeletedAccount(input: DeleteAccountCleanupInput): Promise<void> {
    initialize();
    if (!initialized) {
      return;
    }

    try {
      const db = getFirestore();
      if (db) {
        const batch = db.batch();
        batch.delete(db.collection("users").doc(input.userId));
        batch.delete(db.collection("driverProfiles").doc(input.userId));
        batch.delete(db.collection("wallets").doc(input.userId));
        batch.delete(db.collection("walletTransactions").doc(input.userId));
        batch.delete(db.collection("pushTokens").doc(input.userId));

        input.rideIds.forEach((rideId) => {
          batch.delete(db.collection("rides").doc(rideId));
        });
        input.bookingIds.forEach((bookingId) => {
          batch.delete(db.collection("bookings").doc(bookingId));
          batch.delete(db.collection("ratings").doc(bookingId));
          batch.delete(db.collection("chatMessageSnapshots").doc(bookingId));
          batch.delete(db.collection("chatMessages").doc(bookingId));
        });
        input.tripIds.forEach((tripId) => {
          batch.delete(db.collection("trips").doc(tripId));
          batch.delete(db.collection("liveLocations").doc(tripId));
        });
        await batch.commit();

        for (const bookingId of input.bookingIds) {
          const messagesSnapshot = await db.collection("chatMessages").doc(bookingId).collection("messages").get();
          if (messagesSnapshot.empty) {
            continue;
          }

          let innerBatch = db.batch();
          let writeCount = 0;
          for (const messageDoc of messagesSnapshot.docs) {
            innerBatch.delete(messageDoc.ref);
            writeCount += 1;
            if (writeCount >= 400) {
              await innerBatch.commit();
              innerBatch = db.batch();
              writeCount = 0;
            }
          }
          if (writeCount > 0) {
            await innerBatch.commit();
          }
        }
      }

      for (const bookingId of input.bookingIds) {
        await admin.database().ref(`/bookings/${bookingId}/chat`).remove();
      }
      for (const tripId of input.tripIds) {
        await admin.database().ref(`/trips/${tripId}/location`).remove();
      }
    } catch (error) {
      if (!warnedFirestoreError) {
        // eslint-disable-next-line no-console
        console.warn("[FirebaseAdmin] Failed to cleanup deleted account artifacts.", error);
        warnedFirestoreError = true;
      }
    }
  },
  async logActivity(input: ActivityLogInput): Promise<void> {
    const db = getFirestore();
    if (!db) {
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        type: input.type,
        createdAt: new Date().toISOString()
      };
      if (input.userId) {
        payload.userId = input.userId;
      }
      if (input.phoneNumber) {
        payload.phoneNumber = input.phoneNumber;
      }
      if (input.metadata && Object.keys(input.metadata).length) {
        payload.metadata = input.metadata;
      }
      await db.collection("activityLogs").add(payload);
    } catch (error) {
      if (!warnedFirestoreError) {
        // eslint-disable-next-line no-console
        console.warn("[FirebaseAdmin] Firestore activity log write failed.", error);
        warnedFirestoreError = true;
      }
    }
  }
};
