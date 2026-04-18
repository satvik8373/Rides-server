import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { LiveLocationPoint } from "@ahmedabadcar/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppScreen, AppText, LoadingState, SOSButton, StatusPill } from "../../components";
import { useLiveTracking } from "../../hooks/useLiveTracking";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveTripTracking">;

export const ActiveTripTrackingScreen = ({ route, navigation }: Props) => {
  const activeTrip = useAppStore((state) => state.activeTrip);
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const user = useAppStore((state) => state.user);
  const mode = useAppStore((state) => state.mode);

  const [loading, setLoading] = useState(false);
  const [point, setPoint] = useState<LiveLocationPoint | undefined>(activeTrip?.liveLocation);

  const tripId = route.params.tripId || activeTrip?.trip.id;
  const isDriver = useMemo(() => mode === "DRIVER" && activeTrip?.trip.driverId === user?.id, [mode, activeTrip?.trip.driverId, user?.id]);

  useLiveTracking({
    tripId,
    driverMode: Boolean(isDriver),
    onRiderLocation: setPoint
  });

  useEffect(() => {
    if (activeTrip?.trip.id === tripId) {
      return;
    }
    setLoading(true);
    api
      .getActiveTrip()
      .then((trip) => {
        if (trip) {
          setActiveTrip(trip);
          setPoint(trip.liveLocation);
        }
      })
      .catch((error) => AppAlert.alert("Could not load trip", error instanceof Error ? error.message : "Try again"))
      .finally(() => setLoading(false));
  }, [tripId, activeTrip?.trip.id, setActiveTrip]);

  if (loading || !activeTrip) {
    return (
      <AppScreen>
        <LoadingState message="Loading live tracking..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconWrap}>
              <Ionicons name="navigate" size={18} color={theme.colors.onPrimary} />
            </View>
            <StatusPill label={activeTrip.trip.status} tone="driver" />
          </View>
          <AppText variant="displaySm" tone="white">
            Live Trip Tracking
          </AppText>
          <AppText variant="bodyMd" tone="white" style={styles.heroSubtext}>
            Trip ID: {activeTrip.trip.id.slice(0, 8)} • Updates every 5 seconds
          </AppText>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="title">Driver Location</AppText>
          {point ? (
            <View style={styles.locationGrid}>
              <View style={styles.locationCell}>
                <AppText variant="label" tone="muted">
                  LATITUDE
                </AppText>
                <AppText variant="bodyLg">{point.lat.toFixed(6)}</AppText>
              </View>
              <View style={styles.locationCell}>
                <AppText variant="label" tone="muted">
                  LONGITUDE
                </AppText>
                <AppText variant="bodyLg">{point.lng.toFixed(6)}</AppText>
              </View>
            </View>
          ) : (
            <AppText variant="bodyMd" tone="muted">
              Waiting for first location update...
            </AppText>
          )}
          <AppText variant="bodyMd" tone="muted">
            Last update: {point ? new Date(point.timestamp).toLocaleTimeString() : "Not available yet"}
          </AppText>
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="title">Trip Actions</AppText>
          <AppButton
            label="Open Booking Chat"
            onPress={() => {
              const bookingId = activeTrip.trip.activeBookingIds[0];
              if (!bookingId) {
                AppAlert.alert("No booking chat available");
                return;
              }
              navigation.navigate("BookingChat", { bookingId });
            }}
          />
          {isDriver ? (
            <AppText variant="bodyMd" tone="muted">
              You are sharing your live location as driver.
            </AppText>
          ) : (
            <AppText variant="bodyMd" tone="muted">
              You are viewing the driver live location as rider.
            </AppText>
          )}
        </AppCard>
      </ScrollView>

      <SOSButton
        onPress={() =>
          AppAlert.alert(
            "SOS Triggered",
            "Emergency contacts and support have been notified with your live location (configure production integrations)."
          )
        }
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: theme.colors.primaryContainer,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  heroSubtext: {
    opacity: 0.9
  },
  card: {
    gap: theme.spacing.sm
  },
  locationGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  locationCell: {
    flex: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    gap: 2
  }
});


