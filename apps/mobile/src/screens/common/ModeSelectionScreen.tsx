import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserMode, type UserMode as UserModeType } from "@ahmedabadcar/shared";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppScreen, AppText } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ModeSelection" | "ModeSelectionSettings">;

export const ModeSelectionScreen = ({ navigation }: Props) => {
  const currentMode = useAppStore((state) => state.mode);
  const modeInitialized = useAppStore((state) => state.modeInitialized);
  const setMode = useAppStore((state) => state.setMode);
  const completeModeSelection = useAppStore((state) => state.completeModeSelection);
  const [loading, setLoading] = useState(false);

  const handleModeChange = (mode: UserModeType) => {
    setMode(mode);
  };

  const onContinue = async () => {
    setLoading(true);
    try {
      await api.updateMode({ mode: currentMode });
      if (!modeInitialized) {
        completeModeSelection();
        return;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace("MainTabs");
      }
    } catch (error) {
      AppAlert.alert("Mode update failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="displaySm">Choose Your Mode</AppText>
          <AppText variant="bodyLg" tone="muted">
            One account, two modes. Switch any time without logout.
          </AppText>
        </View>

        <View style={styles.cards}>
          <Pressable
            onPress={() => handleModeChange(UserMode.Driver)}
            style={[styles.modeCard, currentMode === UserMode.Driver ? styles.modeCardActiveDriver : null]}
          >
            <View style={[styles.iconWrap, styles.driverIconWrap]}>
              <Ionicons name="car-sport" size={24} color={theme.colors.onPrimary} />
            </View>
            <AppText variant="label" tone="primary">
              DRIVER MODE
            </AppText>
            <AppText variant="headline">I want to Drive</AppText>
            <AppText variant="bodyMd" tone="muted">
              Post rides, accept requests, start trips and track earnings.
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => handleModeChange(UserMode.Rider)}
            style={[styles.modeCard, currentMode === UserMode.Rider ? styles.modeCardActiveRider : null]}
          >
            <View style={[styles.iconWrap, styles.riderIconWrap]}>
              <Ionicons name="person" size={24} color={theme.colors.onSecondaryFixed} />
            </View>
            <AppText variant="label" tone="muted">
              RIDER MODE
            </AppText>
            <AppText variant="headline">I want to Ride</AppText>
            <AppText variant="bodyMd" tone="muted">
              Search routes, book seats, track live trip and chat safely.
            </AppText>
          </Pressable>
        </View>

        <AppButton label="Continue" onPress={onContinue} loading={loading} />
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: theme.spacing.xl
  },
  header: {
    gap: theme.spacing.sm
  },
  cards: {
    gap: theme.spacing.md
  },
  modeCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.25)",
    ...theme.shadows.ambient
  },
  modeCardActiveDriver: {
    borderColor: "rgba(0,84,64,0.2)",
    backgroundColor: "#f2fbf8"
  },
  modeCardActiveRider: {
    borderColor: "rgba(159,65,33,0.22)",
    backgroundColor: "#fff6f2"
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  driverIconWrap: {
    backgroundColor: theme.colors.primary
  },
  riderIconWrap: {
    backgroundColor: theme.colors.secondaryFixed
  }
});


