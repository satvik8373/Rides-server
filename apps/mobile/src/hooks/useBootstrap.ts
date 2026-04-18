import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAppStore } from "../store";

export const useBootstrap = () => {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string>();
  const hydrated = useAppStore((state) => state.hydrated);
  const secureTokenLoaded = useAppStore((state) => state.secureTokenLoaded);
  const accessToken = useAppStore((state) => state.accessToken);
  const setMode = useAppStore((state) => state.setMode);
  const patchUser = useAppStore((state) => state.patchUser);
  const patchDriverProfile = useAppStore((state) => state.patchDriverProfile);
  const setWallet = useAppStore((state) => state.setWallet);
  const setActiveBooking = useAppStore((state) => state.setActiveBooking);
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const clearAuth = useAppStore((state) => state.clearAuth);

  useEffect(() => {
    if (!hydrated || !secureTokenLoaded) {
      return;
    }
    if (!accessToken) {
      setInitializing(false);
      return;
    }

    const run = async () => {
      try {
        const bootstrap = await api.bootstrap();
        patchUser(bootstrap.user);
        patchDriverProfile(bootstrap.driverProfile);
        setMode(bootstrap.mode);
        setWallet(bootstrap.wallet);
        setActiveBooking(bootstrap.activeBooking);
        setActiveTrip(bootstrap.activeTrip);
        setError(undefined);
      } catch (err) {
        clearAuth();
        setError(err instanceof Error ? err.message : "Failed to bootstrap session");
      } finally {
        setInitializing(false);
      }
    };

    run();
  }, [hydrated, secureTokenLoaded, accessToken, setMode, patchUser, patchDriverProfile, setWallet, setActiveBooking, setActiveTrip, clearAuth]);

  return { initializing, error };
};
