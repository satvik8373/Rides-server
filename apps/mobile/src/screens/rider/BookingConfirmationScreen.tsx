import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { BookingStatus } from "@ahmedabadcar/shared";
import { AppButton, AppCard, AppScreen, AppText, StatusPill } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "BookingConfirmation">;
type IoniconName = keyof typeof Ionicons.glyphMap;

export const BookingConfirmationScreen = ({ route, navigation }: Props) => {
  const booking = useAppStore((state) => state.activeBooking);
  const setActiveBooking = useAppStore((state) => state.setActiveBooking);
  const activeTrip = useAppStore((state) => state.activeTrip);
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const notifiedUpdateAtRef = useRef<string | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshBooking = async (showError = false) => {
    try {
      const bookings = await api.getMyBookings();
      const matched = bookings.find((item) => item.id === route.params.bookingId);
      if (matched) {
        setActiveBooking(matched);
      } else if (showError) {
        AppAlert.alert("Could not load booking", "Booking was not found.");
      }
    } catch (error) {
      if (showError) {
        AppAlert.alert("Could not load booking", error instanceof Error ? error.message : "Try again");
      }
    }
  };

  const openTracking = async () => {
    if (!booking) return;
    try {
      if (activeTrip?.trip.activeBookingIds.includes(booking.id)) {
        navigation.navigate("ActiveTripTracking", { tripId: activeTrip.trip.id });
        return;
      }
      const trip = await api.getActiveTrip();
      if (trip?.trip.activeBookingIds.includes(booking.id)) {
        setActiveTrip(trip);
        navigation.navigate("ActiveTripTracking", { tripId: trip.trip.id });
      } else {
        AppAlert.alert("Trip not started yet", "Once driver starts the trip, live tracking will appear here.");
      }
    } catch (error) {
      AppAlert.alert("Unable to open tracking", error instanceof Error ? error.message : "Try again");
    }
  };

  const cancelBooking = async (reason: string) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      const updated = await api.cancelBooking({ bookingId: booking.id, reason });
      setActiveBooking(updated);
      AppAlert.alert("Booking cancelled", "Your booking has been cancelled.");
    } catch (error) {
      AppAlert.alert("Cancel failed", error instanceof Error ? error.message : "Try again");
    } finally {
      setActionLoading(false);
    }
  };

  const hasPendingDriverUpdate = Boolean(
    booking &&
      booking.status !== BookingStatus.Cancelled &&
      booking.status !== BookingStatus.Completed &&
      booking.driverEditNoticeAt &&
      !booking.riderUpdateAcknowledgedAt
  );

  useEffect(() => {
    if (!booking?.driverEditNoticeAt || !hasPendingDriverUpdate) {
      return;
    }
    if (notifiedUpdateAtRef.current === booking.driverEditNoticeAt) {
      return;
    }
    notifiedUpdateAtRef.current = booking.driverEditNoticeAt;
    AppAlert.alert("Ride Details Updated", "Driver updated ride details. Please review and confirm or cancel.");
  }, [booking?.driverEditNoticeAt, hasPendingDriverUpdate]);

  useEffect(() => {
    void refreshBooking(true);
    const timer = setInterval(() => {
      void refreshBooking(false);
    }, 10_000);
    return () => clearInterval(timer);
  }, [route.params.bookingId]);

  if (!booking) {
    return (
      <AppScreen>
        <AppCard style={styles.emptyCard}>
          <AppText variant="headline">Booking not found</AppText>
          <AppText variant="bodyMd" tone="muted">
            We could not find this booking in your current session. Try refreshing from Trips.
          </AppText>
          <AppButton label="Back to Trips" onPress={() => navigation.goBack()} />
        </AppCard>
      </AppScreen>
    );
  }

  const isCompleted = booking.status === BookingStatus.Completed;
  const isCancelled = booking.status === BookingStatus.Cancelled;
  const isRejected = booking.status === BookingStatus.Rejected;
  const canCancel = [BookingStatus.Requested, BookingStatus.Accepted, BookingStatus.PaymentPending, BookingStatus.Confirmed].includes(booking.status);

  const statusLabelMap: Record<BookingStatus, string> = {
    [BookingStatus.Requested]: "Request Sent",
    [BookingStatus.Accepted]: "Driver Accepted",
    [BookingStatus.Rejected]: "Request Rejected",
    [BookingStatus.PaymentPending]: "Payment Pending",
    [BookingStatus.Confirmed]: "Booking Confirmed",
    [BookingStatus.Cancelled]: "Booking Cancelled",
    [BookingStatus.Completed]: "Trip Completed"
  };

  const statusTone = isCancelled || isRejected ? "rider" : isCompleted ? "driver" : "neutral";
  const statusIcon = useMemo<IoniconName>(() => {
    if (isCompleted) return "checkmark-done-circle";
    if (isCancelled || isRejected) return "close-circle";
    return "time";
  }, [isCancelled, isCompleted, isRejected]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconWrap}>
              <Ionicons name={statusIcon} size={22} color={theme.colors.onPrimary} />
            </View>
            <StatusPill label={statusLabelMap[booking.status]} tone={statusTone} />
          </View>
          <AppText variant="displaySm" tone="white">
            {booking.ride.from} → {booking.ride.to}
          </AppText>
          <AppText variant="bodyMd" tone="white" style={styles.heroSubtext}>
            {booking.ride.date} • {booking.ride.departureTime} • {booking.seatsBooked} seat(s)
          </AppText>
          <AppText variant="bodyMd" tone="white" style={styles.heroSubtext}>
            Driver: {booking.driver.fullName || booking.driver.phoneNumber}
          </AppText>
          <View style={styles.amountBadge}>
            <AppText variant="title" tone="primary">
              INR {booking.amount}
            </AppText>
          </View>
        </View>

        {hasPendingDriverUpdate ? (
          <AppCard style={styles.card}>
            <StatusPill label="Driver updated ride details" tone="rider" />
            <AppText variant="headline">Please review this update</AppText>
            <AppText variant="bodyMd" tone="muted">
              Please review this change and confirm if you are still comfortable with the trip.
            </AppText>
            {booking.driverEditSummary?.length ? (
              <View style={styles.summaryCard}>
                <AppText variant="bodyMd" tone="muted">
                  What changed:
                </AppText>
                {booking.driverEditSummary.map((line, index) => (
                  <AppText key={`${booking.id}-change-${index}`} variant="bodyMd">
                    - {line}
                  </AppText>
                ))}
              </View>
            ) : null}
            {booking.driverEditNote ? <AppText variant="bodyMd">Note: {booking.driverEditNote}</AppText> : null}
            <AppButton
              label="Keep Booking (I am Comfortable)"
              loading={actionLoading}
              onPress={async () => {
                setActionLoading(true);
                try {
                  const updated = await api.acknowledgeBookingUpdate({ bookingId: booking.id });
                  setActiveBooking(updated);
                  AppAlert.alert("Thank you", "Your booking is kept and driver has been informed.");
                } catch (error) {
                  AppAlert.alert("Could not confirm", error instanceof Error ? error.message : "Try again");
                } finally {
                  setActionLoading(false);
                }
              }}
            />
            <AppButton
              label="Cancel Booking"
              variant="secondary"
              loading={actionLoading}
              onPress={() => cancelBooking("Rider not comfortable after driver updated ride details")}
            />
          </AppCard>
        ) : null}

        <AppCard style={styles.card}>
          <AppText variant="title">Trip Actions</AppText>
          <View style={styles.infoChip}>
            <Ionicons name="shield-checkmark" size={15} color={theme.colors.primary} />
            <AppText variant="bodyMd" tone="muted">
              Escrow is secure and releases only after trip completion.
            </AppText>
          </View>
          {isCompleted ? (
            <AppButton label="Rate Driver" onPress={() => navigation.navigate("Rating", { bookingId: booking.id })} />
          ) : null}
          {!isCompleted && !isCancelled && !isRejected ? (
            <AppButton label="Track Trip" onPress={openTracking} />
          ) : null}
          {!isCompleted && !isCancelled && !isRejected ? (
            <AppButton label="Open Chat" onPress={() => navigation.navigate("BookingChat", { bookingId: booking.id })} variant="secondary" />
          ) : null}
          {isCancelled || isRejected ? (
            <AppText variant="bodyMd" tone="muted">
              This booking is no longer active.
            </AppText>
          ) : null}
          {booking.status === BookingStatus.Requested ? (
            <AppButton label="Refresh Booking Status" onPress={() => refreshBooking(true)} variant="tertiary" />
          ) : null}
          {canCancel && !hasPendingDriverUpdate ? (
            <AppButton label="Cancel Booking" variant="tertiary" onPress={() => cancelBooking("Rider cancelled booking")} />
          ) : null}
        </AppCard>
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
  heroCard: {
    borderRadius: 28,
    backgroundColor: theme.colors.primaryContainer,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.ambient
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  heroSubtext: {
    opacity: 0.9
  },
  amountBadge: {
    marginTop: theme.spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12
  },
  card: {
    gap: theme.spacing.md
  },
  summaryCard: {
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.sm
  },
  infoChip: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  emptyCard: {
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.md
  }
});


