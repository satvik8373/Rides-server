import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import type { LiveLocationPoint } from "@ahmedabadcar/shared";
import { api } from "../services/api";
import { firebaseService } from "../services/firebase";

interface UseLiveTrackingProps {
  tripId?: string;
  driverMode: boolean;
  onRiderLocation?: (point?: LiveLocationPoint) => void;
}

export const useLiveTracking = ({ tripId, driverMode, onRiderLocation }: UseLiveTrackingProps) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    if (driverMode) {
      let mounted = true;
      const start = async () => {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted" || !mounted) {
          return;
        }

        timerRef.current = setInterval(async () => {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced
            });
            await api.updateLiveLocation({
              tripId,
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              heading: location.coords.heading ?? undefined,
              speed: location.coords.speed ?? undefined
            });
          } catch {
            // Ignore noisy tracking failures and continue polling.
          }
        }, 5000);
      };
      start();

      return () => {
        mounted = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }

    const unsubscribe = firebaseService.subscribeTripLocation(tripId, onRiderLocation ?? (() => undefined));
    return () => unsubscribe();
  }, [tripId, driverMode, onRiderLocation]);
};

