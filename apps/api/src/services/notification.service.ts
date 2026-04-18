export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class NotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    // Replace with FCM/OneSignal/Expo Push integration in deployment.
    // This placeholder keeps notification side-effects explicit and testable.
    // eslint-disable-next-line no-console
    console.log("[Notification]", payload);
  }
}

export const notificationService = new NotificationService();

