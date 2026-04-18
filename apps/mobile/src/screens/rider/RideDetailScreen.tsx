import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import { Ionicons } from "@expo/vector-icons";
import { BookingStatus } from "@ahmedabadcar/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppScreen, AppText, LoadingState, StatusPill } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { appConfig } from "../../services/config";
import { getApiErrorMessage } from "../../services/error-message";
import { razorpayService } from "../../services/razorpay";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "RideDetail">;

export const RideDetailScreen = ({ route, navigation }: Props) => {
  const selectedRide = useAppStore((state) => state.selectedRide);
  const user = useAppStore((state) => state.user);
  const setSelectedRide = useAppStore((state) => state.setSelectedRide);
  const activeBooking = useAppStore((state) => state.activeBooking);
  const setActiveBooking = useAppStore((state) => state.setActiveBooking);

  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [seats, setSeats] = useState("1");

  useEffect(() => {
    if (selectedRide?.id === route.params.rideId) {
      return;
    }
    setLoading(true);
    api
      .getRide(route.params.rideId)
      .then((ride) => setSelectedRide(ride))
      .catch((error) => AppAlert.alert("Failed to load ride", getApiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [route.params.rideId, selectedRide?.id, setSelectedRide]);

  const ride = selectedRide;
  const amount = useMemo(() => (ride ? ride.pricePerSeat * Number(seats || 1) : 0), [ride, seats]);

  const refreshMyBooking = async () => {
    if (!ride) return;
    try {
      const bookings = await api.getMyBookings();
      const booking = bookings.find((item) => item.rideId === ride.id && item.status !== BookingStatus.Completed);
      if (booking) {
        setActiveBooking(booking);
      }
    } catch {
      // ignore
    }
  };

  const requestBooking = async () => {
    if (!ride) return;
    setBookingLoading(true);
    try {
      const booking = await api.requestBooking({
        rideId: ride.id,
        seatsBooked: Number(seats)
      });
      setActiveBooking(booking);
      AppAlert.alert("Request sent", "Driver will accept your request. Tap refresh in a few seconds.");
    } catch (error) {
      AppAlert.alert("Booking request failed", getApiErrorMessage(error));
    } finally {
      setBookingLoading(false);
    }
  };

  const payNow = async () => {
    if (!activeBooking || !user) return;
    setBookingLoading(true);
    try {
      const paymentOrder = await api.createPaymentOrder({ bookingId: activeBooking.id });
      const isMock = paymentOrder.order.id.startsWith("order_mock_") || !appConfig.razorpayKeyId;
      let paymentId = "pay_mock";
      let signature = "mock_signature";

      if (!isMock) {
        const payment = await razorpayService.pay({
          orderId: paymentOrder.order.id,
          amount: activeBooking.amount,
          userName: user.fullName || "AhmedabadCar User",
          userEmail: user.email,
          userPhone: user.phoneNumber,
          booking: paymentOrder.booking
        });
        paymentId = payment.razorpay_payment_id;
        signature = payment.razorpay_signature;
      }

      const confirmed = await api.confirmPayment({
        bookingId: activeBooking.id,
        razorpayOrderId: paymentOrder.order.id,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      });
      setActiveBooking(confirmed);
      navigation.replace("BookingConfirmation", { bookingId: confirmed.id });
    } catch (error) {
      AppAlert.alert("Payment failed", getApiErrorMessage(error));
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading || !ride) {
    return (
      <AppScreen>
        <LoadingState message="Loading ride details..." />
      </AppScreen>
    );
  }

  const bookingMatchesRide = activeBooking?.rideId === ride.id;
  const driverVerified = ride.driverProfile.kycStatus === "VERIFIED";

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <AppText variant="title">Ride Detail</AppText>
          <Ionicons name="heart-outline" size={20} color={theme.colors.onSurfaceVariant} />
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapChip}>
            <Ionicons name="location" size={14} color={theme.colors.onPrimary} />
            <AppText variant="label" tone="white">
              Route Preview
            </AppText>
          </View>
        </View>

        <AppCard style={styles.card}>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.driverInfo}>
              <AppText variant="title">{ride.driver.fullName || ride.driver.phoneNumber}</AppText>
              <AppText variant="bodyMd" tone="muted">
                Trusted driver
              </AppText>
            </View>
            <StatusPill label={driverVerified ? "Verified Driver" : "Unverified"} tone={driverVerified ? "driver" : "neutral"} />
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routeCol}>
              <AppText variant="title">{ride.departureTime}</AppText>
              <AppText variant="label" tone="muted">
                {ride.from}
              </AppText>
            </View>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.outline} />
            <View style={[styles.routeCol, styles.routeColEnd]}>
              <AppText variant="title">{ride.departureTime}</AppText>
              <AppText variant="label" tone="muted">
                {ride.to}
              </AppText>
            </View>
          </View>

          <View style={styles.row}>
            <StatusPill label={`${ride.seatsAvailable} seats left`} tone="driver" />
            {ride.acAvailable ? <StatusPill label="AC" tone="neutral" /> : null}
            {ride.womenOnly ? <StatusPill label="Women Only" tone="rider" /> : null}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="title">Select seats and continue</AppText>
          <AppInput label="Seats" keyboardType="number-pad" value={seats} onChangeText={setSeats} />
          <View style={styles.totalRow}>
            <AppText variant="bodyLg">Total Estimate</AppText>
            <AppText variant="headline" tone="primary">
              INR {amount}
            </AppText>
          </View>
          <AppButton label="Request Booking" onPress={requestBooking} loading={bookingLoading} />
          <AppButton label="Refresh Booking Status" onPress={refreshMyBooking} variant="secondary" />
        </AppCard>

        {bookingMatchesRide ? (
          <AppCard style={styles.card}>
            <AppText variant="title">Booking Status: {activeBooking.status}</AppText>
            <AppText variant="bodyMd" tone="muted">
              Payment remains in escrow and releases after trip completion.
            </AppText>
            {activeBooking.status === BookingStatus.Accepted ? (
              <AppButton label="Pay via Razorpay Escrow" onPress={payNow} loading={bookingLoading} />
            ) : null}
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
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  mapCard: {
    height: 190,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: "flex-end",
    padding: theme.spacing.md
  },
  mapChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(0,84,64,0.88)",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  card: {
    gap: theme.spacing.md,
    borderRadius: 24
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center"
  },
  driverInfo: {
    flex: 1,
    gap: 2
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  routeCol: {
    flex: 1,
    gap: 2
  },
  routeColEnd: {
    alignItems: "flex-end"
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  }
});


