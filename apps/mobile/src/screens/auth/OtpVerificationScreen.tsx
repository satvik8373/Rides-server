import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton, AppInput, AppScreen, AppText } from "../../components";
import type { AuthStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "OTP">;

export const OtpVerificationScreen = ({ route }: Props) => {
  const { phoneNumber } = route.params;
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore((state) => state.setAuth);

  const onVerifyOtp = async () => {
    if (otp.length < 4) {
      AppAlert.alert("Enter valid OTP");
      return;
    }
    setLoading(true);
    try {
      const response = await api.verifyOtp(phoneNumber, otp);
      setAuth({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
        driverProfile: response.driverProfile
      });
    } catch (error) {
      AppAlert.alert("Verification failed", getApiErrorMessage(error, "Unable to verify OTP"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + theme.spacing.sm, theme.spacing.lg) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              <Ionicons name="shield-checkmark" size={30} color={theme.colors.primary} />
            </View>
            <AppText variant="displaySm">Verify your number</AppText>
            <AppText variant="bodyLg" tone="muted" style={styles.centerText}>
              OTP sent to {phoneNumber}
            </AppText>
          </View>

          <View style={styles.formCard}>
            <AppInput
              label="OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              accessibilityLabel="Enter OTP code"
              accessibilityHint="Type the one-time password sent to your mobile number"
            />
            <AppButton label="Verify & Continue" onPress={onVerifyOtp} loading={loading} accessibilityHint="Verifies OTP and signs you in" />
            <AppText variant="bodyMd" tone="muted" style={styles.centerText}>
              Didn’t get OTP?
            </AppText>
            <AppButton label="Resend OTP" onPress={() => void api.sendOtp(phoneNumber)} variant="tertiary" />
          </View>

          <View style={styles.hintCard}>
            <Ionicons name="lock-closed" size={18} color={theme.colors.primary} />
            <View style={styles.hintTextWrap}>
              <AppText variant="title">Stay Secure</AppText>
              <AppText variant="bodyMd" tone="muted">
                Never share this OTP with anyone.
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  container: {
    flex: 1
  },
  content: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
    gap: theme.spacing.md,
    alignItems: "center"
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center"
  },
  formCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  hintCard: {
    borderRadius: 20,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceContainer,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  hintTextWrap: {
    flex: 1
  },
  centerText: {
    textAlign: "center"
  }
});


