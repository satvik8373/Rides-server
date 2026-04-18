import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { DriverProfile, Ride, UserMode } from "@ahmedabadcar/shared";
import { AppButton, AppCard, AppScreen, AppText, EmptyState, ModeToggle, StatusPill } from "../../components";
import type { MainTabParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = BottomTabScreenProps<MainTabParamList, "Home"> & {
  openPostRide: () => void;
  openManageRide: (rideId?: string) => void;
  openKyc: () => void;
};

export const DriverHomeScreen = ({ openPostRide, openManageRide, openKyc }: Props) => {
  const user = useAppStore((state) => state.user);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const driverProfile = useAppStore((state) => state.driverProfile);
  const patchDriverProfile = useAppStore((state) => state.patchDriverProfile);
  const wallet = useAppStore((state) => state.wallet?.wallet);
  const currentLocationLabel = useAppStore((state) => state.currentLocationLabel);

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDashboard = async (showError = true) => {
    setLoading(true);
    try {
      const [ridesResult, kycResult] = await Promise.allSettled([
        api.getDriverRides() as Promise<Ride[]>,
        api.getKycStatus() as Promise<DriverProfile>
      ]);

      let hasAnyData = false;

      if (ridesResult.status === "fulfilled") {
        setRides(ridesResult.value);
        hasAnyData = true;
      }

      if (kycResult.status === "fulfilled") {
        patchDriverProfile(kycResult.value);
        hasAnyData = true;
      }

      if (!hasAnyData && showError) {
        const error = ridesResult.status === "rejected" ? ridesResult.reason : kycResult.status === "rejected" ? kycResult.reason : undefined;
        AppAlert.alert("Failed to load driver dashboard", getApiErrorMessage(error));
      }
    } catch (error) {
      if (showError) {
        AppAlert.alert("Failed to load driver dashboard", getApiErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard(false);
  }, []);

  const onModeChange = async (next: UserMode) => {
    if (next === mode) {
      return;
    }
    const previous = mode;
    setMode(next);
    try {
      await api.updateMode({ mode: next });
    } catch (error) {
      setMode(previous);
      AppAlert.alert("Mode switch failed", getApiErrorMessage(error));
    }
  };

  const kycVerified = driverProfile?.kycStatus === "VERIFIED";
  const weeklyEarning = useMemo(() => wallet?.availableBalance ?? 0, [wallet?.availableBalance]);
  const currentCity = useMemo(
    () => currentLocationLabel?.split(",").map((item) => item.trim()).find((item) => item.length > 1),
    [currentLocationLabel]
  );

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandCopy}>
              <AppText variant="title" tone="primary">
                AhmedabadCar
              </AppText>
              <AppText variant="label" tone="muted">
                Driver Dashboard
              </AppText>
            </View>
            <View style={styles.cityPill}>
              <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
              <AppText variant="label" tone="primary">
                {currentCity || "Set city"}
              </AppText>
            </View>
          </View>
          <ModeToggle value={mode} onChange={(next) => void onModeChange(next)} />
        </View>

        <View style={styles.greetingWrap}>
          <View style={styles.greetingRow}>
            <AppText variant="displaySm">Hello, {user?.fullName?.split(" ")[0] || "Driver"}</AppText>
            {kycVerified ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
          </View>
          <AppText variant="bodyMd" tone="muted">
            Ready to share your next journey?
          </AppText>
        </View>

        <AppButton label="Post a New Ride" onPress={openPostRide} disabled={loading} />

        <AppCard style={styles.earningsCard}>
          <View style={styles.earningsTop}>
            <View>
              <AppText variant="label" tone="muted">
                WEEKLY EARNINGS
              </AppText>
              <AppText variant="displaySm">INR {weeklyEarning.toFixed(2)}</AppText>
            </View>
            <StatusPill label="+12%" tone="driver" />
          </View>
          <View style={styles.earningsStats}>
            <View style={styles.statCard}>
              <AppText variant="label" tone="muted">
                COMPLETED
              </AppText>
              <AppText variant="title">{rides.filter((ride) => ride.status === "COMPLETED").length} rides</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText variant="label" tone="muted">
                KYC STATUS
              </AppText>
              <AppText variant="title">{kycVerified ? "Verified" : "Pending"}</AppText>
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <AppText variant="title">Upcoming Journeys</AppText>
            <AppButton label="Refresh" onPress={() => void loadDashboard(true)} variant="tertiary" />
          </View>

          {rides.length ? (
            rides.slice(0, 3).map((ride) => (
              <View key={ride.id} style={styles.rideItem}>
                <View style={styles.rideLeftBar} />
                <View style={styles.rideContent}>
                  <AppText variant="title">
                    {ride.from} → {ride.to}
                  </AppText>
                  <AppText variant="bodyMd" tone="muted">
                    {ride.date} • {ride.departureTime}
                  </AppText>
                  <View style={styles.row}>
                    <StatusPill label={ride.status} tone="neutral" />
                    <StatusPill label={`${ride.seatsAvailable} seats`} tone="driver" />
                  </View>
                  <AppButton label="Manage Ride" onPress={() => openManageRide(ride.id)} variant="secondary" />
                </View>
              </View>
            ))
          ) : (
            <EmptyState title="No rides posted" message="Start by posting your first ride." />
          )}
        </AppCard>

        {!kycVerified ? (
          <AppCard style={styles.card}>
            <AppText variant="title">Driver Verification</AppText>
            <AppText variant="bodyMd" tone="muted">
              KYC is optional, but verified drivers earn more trust and bookings.
            </AppText>
            <AppButton label="Complete KYC (Optional)" onPress={openKyc} />
          </AppCard>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl
  },
  header: {
    gap: theme.spacing.sm
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brandCopy: {
    gap: 2
  },
  cityPill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(8,107,83,0.25)",
    backgroundColor: theme.colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  greetingWrap: {
    gap: theme.spacing.xs
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  earningsCard: {
    borderRadius: 28,
    gap: theme.spacing.md
  },
  earningsTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  earningsStats: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    gap: 2
  },
  card: {
    gap: theme.spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rideItem: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  rideLeftBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primaryContainer
  },
  rideContent: {
    flex: 1,
    gap: theme.spacing.xs
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  }
});


