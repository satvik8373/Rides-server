import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const inferExpoHostIp = (): string | undefined => {
  const constantsAny = Constants as unknown as Record<string, any>;
  const candidates: Array<string | undefined> = [
    constantsAny.expoGoConfig?.debuggerHost,
    constantsAny.expoGoConfig?.hostUri,
    constantsAny.manifest?.debuggerHost,
    constantsAny.manifest?.hostUri
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") {
      continue;
    }
    const host = candidate.split(":")[0]?.trim();
    if (host) {
      return host;
    }
  }
  return undefined;
};

const resolveApiBaseUrl = (inputUrl: string): string => {
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(inputUrl);
  if (!isLocalhost) {
    return inputUrl;
  }

  const hostIp = inferExpoHostIp();
  if (!hostIp) {
    return inputUrl;
  }
  return inputUrl.replace(/localhost|127\.0\.0\.1/gi, hostIp);
};

const apiBaseUrlRaw = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? "http://localhost:4000/v1";

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(apiBaseUrlRaw),
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? extra.firebaseApiKey ?? "",
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? extra.firebaseAuthDomain ?? "",
  firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? extra.firebaseDatabaseUrl ?? "",
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? extra.firebaseProjectId ?? "",
  firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? extra.firebaseStorageBucket ?? "",
  firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? extra.firebaseMessagingSenderId ?? "",
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extra.firebaseAppId ?? "",
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? extra.razorpayKeyId ?? ""
};
