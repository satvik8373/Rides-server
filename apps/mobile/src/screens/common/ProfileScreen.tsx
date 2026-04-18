import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { UserMode } from "@ahmedabadcar/shared";
import { AppButton, AppCard, AppScreen, AppText, ModeToggle, StatusPill } from "../../components";
import type { MainTabParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = BottomTabScreenProps<MainTabParamList, "Profile"> & {
  openModeSelection: () => void;
  openKyc: () => void;
};

export const ProfileScreen = ({ openModeSelection, openKyc }: Props) => {
  const user = useAppStore((state) => state.user);
  const driverProfile = useAppStore((state) => state.driverProfile);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const onLogout = async () => {
    try {
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch {
      // Ignore logout API errors and clear local state.
    } finally {
      clearAuth();
    }
  };

  const performDeleteAccount = async () => {
    if (deletingAccount) {
      return;
    }

    setDeletingAccount(true);
    try {
      const result = await api.deleteAccount();
      clearAuth();
      AppAlert.success(
        "Account deleted",
        `${result.summary.ridesDeleted} rides and ${result.summary.bookingsDeleted} bookings removed.`
      );
    } catch (error) {
      AppAlert.alert("Delete account failed", getApiErrorMessage(error));
    } finally {
      setDeletingAccount(false);
    }
  };

  const onDeleteAccount = () => {
    AppAlert.alert(
      "Delete account permanently?",
      "This will remove your profile, rides, bookings, chats, and wallet history. This action cannot be undone.",
      [
        { text: "Keep Account", style: "cancel" },
        { text: "Delete Account", style: "destructive", onPress: () => void performDeleteAccount() }
      ]
    );
  };

  const isVerified = driverProfile?.kycStatus === "VERIFIED";

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="displaySm">Profile</AppText>

        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={24} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="title" tone="white">
              {user?.fullName || "AhmedabadCar User"}
            </AppText>
            <AppText variant="bodyMd" tone="white" style={styles.heroMuted}>
              {user?.phoneNumber}
            </AppText>
            <AppText variant="bodyMd" tone="white" style={styles.heroMuted}>
              {user?.email || "No email added"}
            </AppText>
          </View>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="title">Account Status</AppText>
          <View style={styles.row}>
            <StatusPill label={`Mode: ${mode}`} tone="neutral" />
            <StatusPill label={isVerified ? "Verified Driver" : "Driver not verified"} tone={isVerified ? "driver" : "rider"} />
          </View>
          <AppButton label="Open Mode Selection" onPress={openModeSelection} variant="secondary" />
          {mode === UserMode.Driver && !isVerified ? <AppButton label="Complete KYC (Optional)" onPress={openKyc} /> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="title">Quick Mode Switch</AppText>
          <ModeToggle value={mode} onChange={(next) => void onModeChange(next)} />
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="title" tone="error">
            Danger Zone
          </AppText>
          <AppText variant="bodyMd" tone="muted">
            Active rides and bookings will be auto-cancelled, with escrow refunds handled before deletion.
          </AppText>
          <AppButton
            label="Delete Account"
            onPress={onDeleteAccount}
            variant="danger"
            loading={deletingAccount}
            accessibilityHint="Opens a final confirmation dialog to permanently delete your account"
          />
        </AppCard>

        <AppButton label="Logout" onPress={onLogout} variant="tertiary" disabled={deletingAccount} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    ...theme.shadows.ambient
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  heroText: {
    flex: 1,
    gap: 2
  },
  heroMuted: {
    opacity: 0.88
  },
  card: {
    gap: theme.spacing.md
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  }
});


