import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "../services/api";
import { useAppStore } from "../store";

const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
let notificationHandlerConfigured = false;

export const usePushRegistration = () => {
  const accessToken = useAppStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken || isExpoGo) {
      return;
    }

    const register = async () => {
      try {
        const Notifications = await import("expo-notifications");
        if (!notificationHandlerConfigured) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true
            })
          });
          notificationHandlerConfigured = true;
        }

        const permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== "granted") {
          return;
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        await api.registerPushToken(token.data, Platform.OS === "ios" ? "IOS" : "ANDROID");
      } catch {
        // Push registration is best-effort for development environments.
      }
    };

    register();
  }, [accessToken]);
};
