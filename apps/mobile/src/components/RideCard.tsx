import { Pressable, StyleSheet, View } from "react-native";
import type { RideWithDriver } from "@ahmedabadcar/shared";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { AppCard } from "./AppCard";
import { AppText } from "./AppText";
import { StatusPill } from "./StatusPill";

interface RideCardProps {
  ride: RideWithDriver;
  onPress?: () => void;
}

export const RideCard = ({ ride, onPress }: RideCardProps) => {
  const Container = onPress ? Pressable : View;
  const isVerified = ride.driverProfile.kycStatus === "VERIFIED";
  const estimatedDurationMinutes = 45;
  return (
    <Container
      {...(onPress
        ? {
            onPress,
            accessible: true,
            accessibilityRole: "button" as const,
            accessibilityLabel: `Ride from ${ride.from} to ${ride.to}, INR ${ride.pricePerSeat} per seat`,
            hitSlop: { top: 8, bottom: 8, left: 8, right: 8 }
          }
        : {})}
    >
      <AppCard style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.driverWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.driverMeta}>
              <View style={styles.driverNameRow}>
                <AppText variant="title">{ride.driver.fullName || "Driver"}</AppText>
                {isVerified ? <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} /> : null}
              </View>
              <AppText variant="bodyMd" tone="muted">
                {ride.acAvailable ? "AC • " : ""}
                {ride.womenOnly ? "Women Only • " : ""}
                Carpool
              </AppText>
            </View>
          </View>
          <View style={styles.priceWrap}>
            <AppText variant="headline" tone="primary">
              INR {ride.pricePerSeat}
            </AppText>
            <AppText variant="label" tone="muted">
              per seat
            </AppText>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <AppText variant="title">{ride.departureTime}</AppText>
            <AppText variant="label" tone="muted">
              {ride.from}
            </AppText>
          </View>
          <View style={styles.routeLineWrap}>
            <AppText variant="label" tone="primary">
              {estimatedDurationMinutes} mins
            </AppText>
            <View style={styles.routeLine} />
          </View>
          <View style={[styles.routePoint, styles.routePointEnd]}>
            <AppText variant="title">{ride.departureTime}</AppText>
            <AppText variant="label" tone="muted">
              {ride.riderDropPoint || ride.to}
            </AppText>
          </View>
        </View>

        {ride.isPartialRoute && (
          <View style={styles.passThroughBanner}>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
            <AppText variant="bodyMd" tone="primary">
              Driver goes to {ride.to} • drops you at {ride.riderDropPoint}
            </AppText>
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.pillsRow}>
            {ride.acAvailable ? <StatusPill label="AC" tone="driver" /> : null}
            {ride.womenOnly ? <StatusPill label="Women Only" tone="rider" /> : null}
          </View>
          <StatusPill label={`${ride.seatsAvailable} left`} tone="neutral" />
        </View>

        <AppText variant="label" tone="muted">
          {ride.date}
        </AppText>
      </AppCard>
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.25)",
    padding: theme.spacing.md
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.sm
  },
  driverWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center"
  },
  driverMeta: {
    gap: 2,
    flex: 1
  },
  driverNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  priceWrap: {
    alignItems: "flex-end"
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  routePoint: {
    flex: 1,
    gap: 2
  },
  routePointEnd: {
    alignItems: "flex-end"
  },
  routeLineWrap: {
    alignItems: "center",
    width: 90
  },
  routeLine: {
    marginTop: 4,
    width: "100%",
    height: 2,
    borderRadius: 2,
    backgroundColor: theme.colors.outlineVariant
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pillsRow: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  passThroughBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: "rgba(0, 122, 255, 0.06)",
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary
  }
});
