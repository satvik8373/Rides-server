import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import { RatingRole } from "@ahmedabadcar/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppInput, AppScreen, AppText, StatusPill } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Rating">;

export const RatingScreen = ({ route }: Props) => {
  const user = useAppStore((state) => state.user);
  const activeBooking = useAppStore((state) => state.activeBooking);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ratings, setRatings] = useState<{ fromUserId: string; score: number; comment?: string }[]>([]);

  const myRole = useMemo(() => {
    if (!activeBooking || activeBooking.id !== route.params.bookingId) {
      return RatingRole.RiderToDriver;
    }
    return activeBooking.riderId === user?.id ? RatingRole.RiderToDriver : RatingRole.DriverToRider;
  }, [activeBooking, route.params.bookingId, user?.id]);

  const refreshReveal = async () => {
    try {
      const reveal = await api.revealRatings(route.params.bookingId);
      setVisible(reveal.visible);
      setRatings(reveal.ratings);
    } catch (error) {
      AppAlert.alert("Could not load ratings", error instanceof Error ? error.message : "Try again");
    }
  };

  useEffect(() => {
    void refreshReveal();
  }, [route.params.bookingId]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.submitRating({
        bookingId: route.params.bookingId,
        role: myRole,
        score,
        comment: comment.trim() || undefined
      });
      await refreshReveal();
      AppAlert.alert("Rating submitted");
    } catch (error) {
      AppAlert.alert("Rating failed", error instanceof Error ? error.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconWrap}>
              <Ionicons name="star" size={17} color={theme.colors.onPrimary} />
            </View>
            <AppText variant="label" tone="white">
              TRIP FEEDBACK
            </AppText>
          </View>
          <AppText variant="displaySm" tone="white">
            Rate Your Trip
          </AppText>
          <AppText variant="bodyMd" tone="white" style={styles.heroSubtext}>
            Ratings become visible only after both rider and driver submit.
          </AppText>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="title">Select Score</AppText>
          <View style={styles.scoreRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <AppButton key={value} label={`${value} ★`} variant={score === value ? "primary" : "secondary"} onPress={() => setScore(value)} />
            ))}
          </View>
          <AppInput
            label="Feedback (Optional)"
            placeholder="Share feedback..."
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.commentInput}
          />
          <AppButton label="Submit Rating" onPress={submit} loading={submitting} />
        </AppCard>

        <AppCard style={styles.card}>
          <StatusPill label={visible ? "Ratings Visible" : "Waiting for other participant"} tone={visible ? "driver" : "neutral"} />
          {visible ? (
            ratings.map((item) => (
              <View key={item.fromUserId} style={styles.ratingItem}>
                <AppText variant="title">{item.score}/5</AppText>
                <AppText variant="bodyMd" tone="muted">
                  {item.comment || "No comment"}
                </AppText>
              </View>
            ))
          ) : (
            <AppText variant="bodyMd" tone="muted">
              Ratings remain hidden until both users rate each other.
            </AppText>
          )}
          <AppButton label="Refresh Rating Visibility" onPress={refreshReveal} variant="tertiary" />
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
    gap: theme.spacing.sm
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  heroSubtext: {
    opacity: 0.9
  },
  card: {
    gap: theme.spacing.md
  },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  commentInput: {
    minHeight: 92,
    paddingTop: theme.spacing.sm
  },
  ratingItem: {
    gap: theme.spacing.xs
  }
});


