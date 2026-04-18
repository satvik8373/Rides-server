import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import { isAxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { BookingStatus, RideStatus, type BookingWithDetails, type Ride } from "@ahmedabadcar/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppScreen, AppText, EmptyState, LoadingState, StatusPill } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ManageRide">;

const DRIVER_CANCEL_REASONS = [
  "Vehicle issue",
  "Personal emergency",
  "Unexpected route delay",
  "Safety concern",
  "Other"
];

export const ManageRideScreen = ({ route, navigation }: Props) => {
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const [rides, setRides] = useState<Ride[]>([]);
  const [rideId, setRideId] = useState<string | undefined>(route.params?.rideId);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTripId, setActiveTripId] = useState<string>();
  const [saveLoading, setSaveLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDeparture, setEditDeparture] = useState("");
  const [editSeatsTotal, setEditSeatsTotal] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editWomenOnly, setEditWomenOnly] = useState(false);
  const [editAcAvailable, setEditAcAvailable] = useState(false);
  const [editUpdateNote, setEditUpdateNote] = useState("");
  const [cancelReason, setCancelReason] = useState(DRIVER_CANCEL_REASONS[0]);
  const [cancelCustomMessage, setCancelCustomMessage] = useState("");

  const selectedRide = useMemo(() => rides.find((item) => item.id === rideId), [rideId, rides]);
  const confirmedBookings = useMemo(() => bookings.filter((item) => item.status === BookingStatus.Confirmed), [bookings]);
  const activeBookings = useMemo(
    () =>
      bookings.filter((item) =>
        [BookingStatus.Requested, BookingStatus.Accepted, BookingStatus.PaymentPending, BookingStatus.Confirmed].includes(item.status)
      ),
    [bookings]
  );
  const canEditRide = Boolean(selectedRide && ![RideStatus.InProgress, RideStatus.Completed, RideStatus.Cancelled].includes(selectedRide.status));
  const canCancelRide = Boolean(selectedRide && ![RideStatus.Completed, RideStatus.Cancelled].includes(selectedRide.status));
  const canStartTrip = Boolean(
    selectedRide &&
      !activeTripId &&
      confirmedBookings.length > 0 &&
      selectedRide.status !== RideStatus.Completed &&
      selectedRide.status !== RideStatus.Cancelled
  );

  const getErrorMessage = (error: unknown, fallback = "Try again") => {
    if (isAxiosError(error)) {
      const apiMessage = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
      if (typeof apiMessage === "string" && apiMessage.trim()) {
        return apiMessage;
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  };

  const load = async () => {
    setLoading(true);
    try {
      const myRides = (await api.getDriverRides()) as Ride[];
      setRides(myRides);
      const selected = route.params?.rideId ?? rideId ?? myRides[0]?.id;
      setRideId(selected);
      if (selected) {
        const [requests, active] = await Promise.all([api.getRideBookings(selected), api.getActiveTrip()]);
        setBookings(requests);
        if (active?.trip?.rideId === selected) {
          setActiveTripId(active.trip.id);
          setActiveTrip(active);
        } else {
          setActiveTripId(undefined);
        }
      }
    } catch (error) {
      AppAlert.alert("Manage ride failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [route.params?.rideId]);

  useEffect(() => {
    if (!selectedRide) return;
    setEditFrom(selectedRide.from);
    setEditTo(selectedRide.to);
    setEditDate(selectedRide.date);
    setEditDeparture(selectedRide.departureTime);
    setEditSeatsTotal(String(selectedRide.seatsTotal));
    setEditPrice(String(selectedRide.pricePerSeat));
    setEditWomenOnly(Boolean(selectedRide.womenOnly));
    setEditAcAvailable(Boolean(selectedRide.acAvailable));
    setEditUpdateNote(selectedRide.lastDriverEditNote ?? "");
  }, [selectedRide?.id]);

  const respond = async (bookingId: string, action: "ACCEPT" | "REJECT") => {
    try {
      await api.respondBooking({ bookingId, action });
      await load();
    } catch (error) {
      AppAlert.alert("Action failed", getErrorMessage(error));
    }
  };

  const startTrip = async () => {
    if (!rideId || !canStartTrip) {
      AppAlert.alert("Cannot start trip", "At least one rider must have a CONFIRMED booking (paid in escrow) before trip start.");
      return;
    }
    try {
      const active = await api.startTrip({ rideId });
      setActiveTrip(active);
      setActiveTripId(active.trip.id);
      navigation.navigate("ActiveTripTracking", { tripId: active.trip.id });
    } catch (error) {
      AppAlert.alert("Start trip failed", getErrorMessage(error));
    }
  };

  const endTrip = async () => {
    if (!activeTripId) return;
    try {
      const completed = await api.endTrip({ tripId: activeTripId });
      setActiveTrip(completed);
      setActiveTripId(undefined);
      AppAlert.alert("Trip completed", "Escrow has been released and earnings updated.");
      await load();
    } catch (error) {
      AppAlert.alert("End trip failed", getErrorMessage(error));
    }
  };

  const saveRideEdits = async () => {
    if (!selectedRide) return;
    const seatsTotal = Number(editSeatsTotal);
    const pricePerSeat = Number(editPrice);
    if (!editFrom.trim() || !editTo.trim() || !editDate.trim() || !editDeparture.trim()) {
      AppAlert.alert("Missing fields", "Please fill all required ride fields.");
      return;
    }
    if (!Number.isFinite(seatsTotal) || seatsTotal <= 0) {
      AppAlert.alert("Invalid seats", "Seats total must be a positive number.");
      return;
    }
    if (!Number.isFinite(pricePerSeat) || pricePerSeat <= 0) {
      AppAlert.alert("Invalid price", "Price per seat must be a positive number.");
      return;
    }

    setSaveLoading(true);
    try {
      await api.updateRide(selectedRide.id, {
        from: editFrom.trim(),
        to: editTo.trim(),
        date: editDate.trim(),
        departureTime: editDeparture.trim(),
        seatsTotal,
        pricePerSeat,
        womenOnly: editWomenOnly,
        acAvailable: editAcAvailable,
        updateNote: editUpdateNote.trim() || undefined
      });
      await load();
      AppAlert.alert("Ride updated", "Ride changes are saved. Accepted/confirmed riders were notified.");
    } catch (error) {
      AppAlert.alert("Ride update failed", getErrorMessage(error));
    } finally {
      setSaveLoading(false);
    }
  };

  const cancelRideByDriver = async () => {
    if (!selectedRide || !canCancelRide) {
      return;
    }
    if (cancelReason === "Other" && !cancelCustomMessage.trim()) {
      AppAlert.alert("Add details", "Please provide custom message for 'Other' reason.");
      return;
    }

    AppAlert.alert(
      "Confirm Trip Cancellation",
      `This will cancel the ride for ${activeBookings.length} active booking(s), notify riders, process refunds (if any), and block new ride creation for 24 hours.`,
      [
        { text: "Back", style: "cancel" },
        {
          text: "Confirm Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelLoading(true);
            try {
              await api.cancelRide({
                rideId: selectedRide.id,
                reason: cancelReason,
                customMessage: cancelCustomMessage.trim() || undefined
              });
              AppAlert.alert("Ride cancelled", "Riders were notified. 24-hour posting cooldown is now active.");
              await load();
            } catch (error) {
              AppAlert.alert("Cancel trip failed", getErrorMessage(error));
            } finally {
              setCancelLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <AppScreen>
        <LoadingState message="Loading ride requests..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="displaySm">Manage Ride Details</AppText>

        {selectedRide ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <StatusPill label={selectedRide.status} tone="driver" />
              <AppText variant="title" tone="white">
                INR {selectedRide.pricePerSeat}
              </AppText>
            </View>
            <AppText variant="headline" tone="white">
              {selectedRide.from} → {selectedRide.to}
            </AppText>
            <AppText variant="bodyMd" tone="white" style={styles.heroMuted}>
              {selectedRide.date} • {selectedRide.departureTime} • {selectedRide.seatsAvailable} seats available
            </AppText>
          </View>
        ) : (
          <EmptyState title="No rides found" message="Post a ride first to manage requests." />
        )}

        {selectedRide ? (
          <AppCard style={styles.card}>
            <View style={styles.sectionTitle}>
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <AppText variant="title">Edit Ride</AppText>
            </View>
            {!canEditRide ? (
              <AppText variant="bodyMd" tone="muted">
                Ride details cannot be edited once trip is in progress/completed/cancelled.
              </AppText>
            ) : null}
            <AppInput label="From" value={editFrom} onChangeText={setEditFrom} />
            <AppInput label="To" value={editTo} onChangeText={setEditTo} />
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <AppInput label="Date" value={editDate} onChangeText={setEditDate} />
              </View>
              <View style={styles.fieldHalf}>
                <AppInput label="Departure" value={editDeparture} onChangeText={setEditDeparture} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <AppInput label="Seats Total" value={editSeatsTotal} onChangeText={setEditSeatsTotal} keyboardType="number-pad" />
              </View>
              <View style={styles.fieldHalf}>
                <AppInput label="Price / Seat (INR)" value={editPrice} onChangeText={setEditPrice} keyboardType="number-pad" />
              </View>
            </View>
            <View style={styles.row}>
              <AppButton
                label={editWomenOnly ? "Women-only: ON" : "Women-only: OFF"}
                onPress={() => setEditWomenOnly((prev) => !prev)}
                variant="secondary"
                disabled={!canEditRide}
              />
              <AppButton
                label={editAcAvailable ? "AC: ON" : "AC: OFF"}
                onPress={() => setEditAcAvailable((prev) => !prev)}
                variant="secondary"
                disabled={!canEditRide}
              />
            </View>
            <AppInput
              label="Update Note For Riders (Optional)"
              value={editUpdateNote}
              onChangeText={setEditUpdateNote}
              placeholder="Departure shifted by 20 min due to traffic."
            />
            <AppButton label="Save Changes & Notify Riders" onPress={saveRideEdits} loading={saveLoading} disabled={!canEditRide} />
          </AppCard>
        ) : null}

        <AppCard style={styles.card}>
          <View style={styles.sectionTitle}>
            <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
            <AppText variant="title">Booking Requests</AppText>
          </View>
          <AppText variant="bodyMd" tone="muted">
            Confirmed (paid) bookings: {confirmedBookings.length}
          </AppText>
          {bookings.length ? (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <AppText variant="title">{booking.rider.fullName || booking.rider.phoneNumber}</AppText>
                  <StatusPill label={booking.status} tone={booking.status === BookingStatus.Confirmed ? "driver" : "neutral"} />
                </View>
                <AppText variant="bodyMd" tone="muted">
                  Seats: {booking.seatsBooked} • Amount: INR {booking.amount}
                </AppText>
                {booking.status === BookingStatus.Requested ? (
                  <View style={styles.row}>
                    <AppButton label="Decline" onPress={() => respond(booking.id, "REJECT")} variant="secondary" />
                    <AppButton label="Accept Request" onPress={() => respond(booking.id, "ACCEPT")} />
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <EmptyState title="No requests" message="Booking requests will appear here." />
          )}
        </AppCard>

        {selectedRide ? (
          <AppCard style={styles.card}>
            <View style={styles.sectionTitle}>
              <Ionicons name="warning-outline" size={16} color={theme.colors.error} />
              <AppText variant="title">Cancel Ride / Trip</AppText>
            </View>
            <AppText variant="bodyMd" tone="muted">
              Cancelling will notify all active riders.
            </AppText>
            <View style={styles.reasonWrap}>
              {DRIVER_CANCEL_REASONS.map((reason) => (
                <AppButton
                  key={reason}
                  label={reason}
                  onPress={() => setCancelReason(reason)}
                  variant={cancelReason === reason ? "primary" : "secondary"}
                  disabled={!canCancelRide || cancelLoading}
                />
              ))}
            </View>
            <AppInput
              label="Custom Message To Riders (Optional)"
              value={cancelCustomMessage}
              onChangeText={setCancelCustomMessage}
              placeholder="Sorry, I have vehicle breakdown and cannot continue this trip."
            />
            <AppButton
              label={activeTripId ? "Cancel Active Trip" : "Cancel Ride"}
              onPress={cancelRideByDriver}
              loading={cancelLoading}
              disabled={!canCancelRide}
              variant="tertiary"
            />
          </AppCard>
        ) : null}

        {selectedRide && !canStartTrip ? (
          <AppText variant="bodyMd" tone="muted">
            Start Trip unlocks after at least one rider payment is confirmed.
          </AppText>
        ) : null}

        {selectedRide ? (
          <AppButton
            label={confirmedBookings.length ? "Start Trip" : "Start Trip (Waiting for Paid Booking)"}
            onPress={startTrip}
            disabled={!canStartTrip}
          />
        ) : null}
        {activeTripId ? <AppButton label="End Trip" onPress={endTrip} variant="secondary" /> : null}
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
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primaryContainer,
    gap: theme.spacing.sm,
    ...theme.shadows.ambient
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  heroMuted: {
    opacity: 0.85
  },
  card: {
    gap: theme.spacing.md
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  reasonWrap: {
    gap: theme.spacing.xs
  },
  bookingCard: {
    borderRadius: 18,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    gap: theme.spacing.xs
  },
  bookingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  fieldHalf: {
    flex: 1
  }
});


