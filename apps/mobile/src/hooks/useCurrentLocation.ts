import { useEffect } from "react";
import * as Location from "expo-location";
import { useAppStore } from "../store";

const LOCATION_ACCURACY = Location.Accuracy.Balanced;

const normalizeToken = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const buildLocationLabel = (address?: Location.LocationGeocodedAddress | null, lat?: number, lng?: number) => {
  const city = [address?.city, address?.district, address?.subregion, address?.region].find((item) => normalizeToken(item).length > 1);
  const place = [address?.name, address?.street].find(
    (item) => normalizeToken(item).length > 1 && normalizeToken(item) !== normalizeToken(city)
  );
  if (place && city) {
    return `${place}, ${city}`;
  }
  if (city) {
    return city;
  }
  if (lat !== undefined && lng !== undefined) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  return "Current Location";
};

export const useCurrentLocation = () => {
  const setLocationPermission = useAppStore((state) => state.setLocationPermission);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const existingPermission = await Location.getForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        let permissionStatus = existingPermission.status;
        if (permissionStatus === Location.PermissionStatus.UNDETERMINED) {
          const requestedPermission = await Location.requestForegroundPermissionsAsync();
          if (!active) {
            return;
          }
          permissionStatus = requestedPermission.status;
        }

        if (permissionStatus !== Location.PermissionStatus.GRANTED) {
          setLocationPermission("denied");
          return;
        }

        setLocationPermission("granted");
        const position = await Location.getCurrentPositionAsync({
          accuracy: LOCATION_ACCURACY
        });
        if (!active) {
          return;
        }

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let label = buildLocationLabel(undefined, lat, lng);

        try {
          const geocodeRows = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (active) {
            label = buildLocationLabel(geocodeRows[0], lat, lng);
          }
        } catch {
          // Keep coordinate fallback label if reverse geocoding fails.
        }

        if (!active) {
          return;
        }

        setCurrentLocation({
          lat,
          lng,
          label
        });
      } catch {
        if (!active) {
          return;
        }
        setLocationPermission("denied");
      }
    };

    void sync();

    return () => {
      active = false;
    };
  }, [setCurrentLocation, setLocationPermission]);
};
