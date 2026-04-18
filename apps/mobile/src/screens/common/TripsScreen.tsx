import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BookingStatus, type BookingWithDetails, type Ride } from "@ahmedabadcar/shared";
import { AppButton, AppCard, AppScreen, AppText, EmptyState, StatusPill } from "../../components";
import type { MainTabParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = BottomTabScreenProps<MainTabParamList, "Trips"> & {
  openManageRide: (rideId?: string) => void;
  openBookingConfirmation: (bookingId: string) => void;
};

export const TripsScreen = ({ openManageRide, openBookingConfirmation }: Props) => {
  const mode = useAppStore((state) => state.mode);
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const notifiedBookingIdsRef = useRef<Set<string>>(new Set());

  const sortedBookings = useMemo(() => [...bookings].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)), [bookings]);

  const hasPendingDriverUpdate = (booking: BookingWithDetails) =>
    booking.status !== BookingStatus.Cancelled &&
    booking.status !== BookingStatus.Completed &&
    Boolean(booking.driverEditNoticeAt) &&
    !booking.riderUpdateAcknowledgedAt;

  const actionRequiredBookings = sortedBookings.filter(
    (booking) => hasPendingDriverUpdate(booking)
  );

  const activeBookings = sortedBookings.filter(
    (booking) =>
      [BookingStatus.Accepted, BookingStatus.PaymentPending, BookingStatus.Confirmed].includes(booking.status) &&
      !actionRequiredBookings.some((item) => item.id === booking.id)
  );
  const completedBookings = sortedBookings.filter((booking) => booking.status === BookingStatus.Completed);
  const cancelledBookings = sortedBookings.filter((booking) => booking.status === BookingStatus.Cancelled);

  const notifyNewDriverUpdates = (items: BookingWithDetails[]) => {
    const pending = items.filter(
      (booking) =>
      hasPendingDriverUpdate(booking)
    );
    const newlyNotified = pending.filter((booking) => !notifiedBookingIdsRef.current.has(booking.id));
    if (!newlyNotified.length) return;

    newlyNotified.forEach((booking) => notifiedBookingIdsRef.current.add(booking.id));
    AppAlert.alert(
      "Driver Updated Ride Details",
      newlyNotified.length === 1
        ? "One of your booked rides has updated details. Please review it."
        : `${newlyNotified.length} booked rides have updated details. Please review them.`
    );
  };

  const refresh = async (showError = true) => {
    setRefreshing(true);
    try {
      if (mode === "DRIVER") {
        const myRides = (await api.getDriverRides()) as Ride[];
        setRides(myRides);
      } else {
        const myBookings = await api.getMyBookings();
        setBookings(myBookings);
        notifyNewDriverUpdates(myBookings);
      }
    } catch (error) {
      if (showError) {
        AppAlert.alert("Trips refresh failed", error instanceof Error ? error.message : "Try again");
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [mode]);

  useEffect(() => {
    if (mode !== "RIDER") {
      return;
    }
    const timer = setInterval(() => {
      void refresh(false);
    }, 10_000);
    return () => clearInterval(timer);
  }, [mode]);

  const renderRiderBookingCard = (booking: BookingWithDetails) => {
    const needsAction = hasPendingDriverUpdate(booking);
    const isActive = [BookingStatus.Accepted, BookingStatus.PaymentPending, BookingStatus.Confirmed].includes(booking.status);
    const statusTone = booking.status === BookingStatus.Completed ? "driver" : booking.status === BookingStatus.Cancelled ? "rider" : "neutral";
    const isReadOnly = booking.status === BookingStatus.Cancelled || booking.status === BookingStatus.Completed;

    return (
      <Pressable
        key={booking.id}
        onPress={() => openBookingConfirmation(booking.id)}
        style={({ pressed }) => [styles.bookingPressable, pressed ? styles.pressed : null]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${booking.ride.from} to ${booking.ride.to} booking card`}
        accessibilityHint="Opens booking details"
      >
        <AppCard style={[styles.bookingCard, needsAction ? styles.bookingCardHighlight : null]}>
          <View style={styles.bookingHeader}>
            <View style={styles.inlineRow}>
              <StatusPill label={booking.status} tone={statusTone} />
              {needsAction ? <StatusPill label="Action Required" tone="rider" /> : null}
            </View>
            <AppText variant="title" tone="primary">
              INR {booking.amount}
            </AppText>
          </View>

          <AppText variant="headline">
            {booking.ride.from} → {booking.ride.to}
          </AppText>
          <AppText variant="bodyMd" tone="muted">
            {booking.ride.date} • {booking.ride.departureTime} • {booking.seatsBooked} seat(s)
          </AppText>

          {booking.driverEditSummary?.length ? (
            <View style={styles.changeBox}>
              <AppText variant="label" tone="muted">
                Latest change
              </AppText>
              <AppText variant="bodyMd">{booking.driverEditSummary[0]}</AppText>
            </View>
          ) : null}

          <AppText variant="label" tone={needsAction ? "error" : "muted"}>
            {needsAction ? "Review this update now" : isReadOnly ? "Tap card to view details" : "Tap card for trip details and actions"}
          </AppText>

          {needsAction ? <AppButton label="Review Update" onPress={() => openBookingConfirmation(booking.id)} /> : null}
          {isActive && !needsAction ? <StatusPill label="Upcoming trip" tone="driver" /> : null}
        </AppCard>
      </Pressable>
    );
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerBadge}>
              <Ionicons name={mode === "DRIVER" ? "car-sport" : "person"} size={18} color={theme.colors.onPrimary} />
            </View>
            <AppText variant="label" tone="white">
              {mode === "DRIVER" ? "DRIVER TRIPS" : "RIDER TRIPS"}
            </AppText>
          </View>
          <AppText variant="displaySm" tone="white">
            {mode === "DRIVER" ? "Your Ride Operations" : "Your Journey Timeline"}
          </AppText>
          <AppText variant="bodyMd" tone="white" style={styles.headerSubtext}>
            {mode === "DRIVER"
              ? "Manage upcoming rides, requests and trip readiness."
              : "Track booked rides, updates from drivers and trip status in one place."}
          </AppText>
        </View>

        {mode === "RIDER" ? (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryChip}>
              <AppText variant="label" tone="muted">
                ACTION REQUIRED
              </AppText>
              <AppText variant="headline">{actionRequiredBookings.length}</AppText>
            </View>
            <View style={styles.summaryChip}>
              <AppText variant="label" tone="muted">
                UPCOMING
              </AppText>
              <AppText variant="headline">{activeBookings.length}</AppText>
            </View>
            <View style={styles.summaryChip}>
              <AppText variant="label" tone="muted">
                COMPLETED
              </AppText>
              <AppText variant="headline">{completedBookings.length}</AppText>
            </View>
          </View>
        ) : null}

        {mode === "DRIVER" ? (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <AppText variant="title">Posted Rides</AppText>
              <StatusPill label={`${rides.length} total`} tone="neutral" />
            </View>
            {rides.length ? (
              rides.map((ride) => (
                <View key={ride.id} style={styles.item}>
                  <View style={styles.itemTop}>
                    <View>
                      <AppText variant="title">
                        {ride.from} → {ride.to}
                      </AppText>
                      <AppText variant="bodyMd" tone="muted">
                        {ride.date} • {ride.departureTime}
                      </AppText>
                    </View>
                    <StatusPill label={ride.status} tone="neutral" />
                  </View>
                  <View style={styles.inlineRow}>
                    <StatusPill label={`${ride.seatsAvailable} seats`} tone="driver" />
                    <StatusPill label={`INR ${ride.pricePerSeat}/seat`} tone="neutral" />
                  </View>
                  <AppButton label="Manage Ride" onPress={() => openManageRide(ride.id)} variant="secondary" />
                </View>
              ))
            ) : (
              <EmptyState title="No driver trips" message="Post a ride to start receiving requests." />
            )}
          </AppCard>
        ) : (
          <>
            {bookings.length ? (
              <>
                {actionRequiredBookings.length ? (
                  <View style={styles.section}>
                    <AppText variant="title">Needs Your Action ({actionRequiredBookings.length})</AppText>
                    {actionRequiredBookings.map((booking) => renderRiderBookingCard(booking))}
                  </View>
                ) : null}

                {activeBookings.length ? (
                  <View style={styles.section}>
                    <AppText variant="title">Upcoming Trips ({activeBookings.length})</AppText>
                    {activeBookings.map((booking) => renderRiderBookingCard(booking))}
                  </View>
                ) : null}

                {completedBookings.length ? (
                  <View style={styles.section}>
                    <AppText variant="title">Completed ({completedBookings.length})</AppText>
                    {completedBookings.map((booking) => renderRiderBookingCard(booking))}
                  </View>
                ) : null}

                {cancelledBookings.length ? (
                  <View style={styles.section}>
                    <AppText variant="title">Cancelled ({cancelledBookings.length})</AppText>
                    {cancelledBookings.map((booking) => renderRiderBookingCard(booking))}
                  </View>
                ) : null}
              </>
            ) : (
              <EmptyState title="No rider trips" message="Search rides and book your next trip." />
            )}
          </>
        )}

        {mode === "DRIVER" ? (
          <AppButton label="Refresh Trips" onPress={refresh} loading={refreshing} />
        ) : (
          <View style={styles.footerHint}>
            <AppText variant="bodyMd" tone="muted">
              Trips update automatically every 10 seconds.
            </AppText>
            <AppButton label="Refresh Now" onPress={refresh} variant="secondary" loading={refreshing} />
          </View>
        )}
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
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl
  },
  headerCard: {
    borderRadius: 28,
    backgroundColor: theme.colors.primaryContainer,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  headerBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerSubtext: {
    opacity: 0.9
  },
  summaryGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  summaryChip: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.25)",
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
  item: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.sm
  },
  inlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  section: {
    gap: theme.spacing.md
  },
  bookingCard: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)"
  },
  bookingPressable: {
    borderRadius: theme.radius.lg
  },
  bookingCardHighlight: {
    borderColor: theme.colors.secondary,
    backgroundColor: "#fff4ef"
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  changeBox: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  footerHint: {
    gap: theme.spacing.sm
  },
  pressed: {
    opacity: 0.9
  }
});


