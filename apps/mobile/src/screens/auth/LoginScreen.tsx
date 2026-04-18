import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton, AppInput, AppScreen, AppText } from "../../components";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { theme } from "../../theme";
import type { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const normalizePhoneNumber = (input: string): string => {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return input.trim();
};

export const LoginScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [loading, setLoading] = useState(false);

  const onSendOtp = async () => {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone.startsWith("+") || normalizedPhone.replace(/[^\d]/g, "").length < 10) {
      AppAlert.alert("Enter a valid mobile number");
      return;
    }
    setLoading(true);
    try {
      const response = await api.sendOtp(normalizedPhone);
      if (response.debugOtp) {
        AppAlert.alert("Dev OTP", `Use ${response.debugOtp} for testing.`);
      }
      setPhoneNumber(normalizedPhone);
      navigation.navigate("OTP", { phoneNumber: normalizedPhone });
    } catch (error) {
      AppAlert.alert("OTP failed", getApiErrorMessage(error, "Unable to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + theme.spacing.sm, theme.spacing.lg) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandWrap}>
            <View style={styles.langWrap}>
              <View style={[styles.langPill, styles.langPillActive]}>
                <AppText variant="label" tone="primary">
                  EN
                </AppText>
              </View>
              <View style={styles.langPill}>
                <AppText variant="label" tone="muted">
                  GU
                </AppText>
              </View>
            </View>
            <View style={styles.logoWrap}>
              <Ionicons name="car-sport" size={34} color={theme.colors.primary} />
            </View>
            <AppText variant="displaySm" tone="primary">
              AhmedabadCar
            </AppText>
            <AppText variant="bodyMd" tone="muted" style={styles.centerText}>
              Your premium transit concierge.
            </AppText>
          </View>

          <View style={styles.formCard}>
            <AppInput
              label="Mobile Number"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(value) => setPhoneNumber(value.replace(/[^\d+]/g, ""))}
              accessibilityLabel="Enter mobile number"
              accessibilityHint="Type your mobile number to receive OTP"
              placeholder="+91 9876543210"
            />

            <AppButton label="Send OTP" onPress={onSendOtp} loading={loading} accessibilityHint="Sends OTP to your mobile number" />

            <View style={styles.dividerWrap}>
              <View style={styles.divider} />
              <AppText variant="label" tone="muted">
                OR CONTINUE WITH
              </AppText>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialBtn}>
              <Ionicons name="logo-google" size={20} color={theme.colors.onSurface} />
              <AppText variant="title">Google Account</AppText>
            </View>

            <AppText variant="bodyMd" tone="muted" style={styles.centerText}>
              By continuing, you agree to Terms and Privacy Policy.
            </AppText>

            <AppText variant="label" tone="primary" style={styles.centerText}>
              New here? Create Account
            </AppText>
          </View>

          <View style={styles.trustRow}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.trustAvatar} />
            ))}
            <View style={styles.trustCount}>
              <AppText variant="label" tone="primary">
                +50K
              </AppText>
            </View>
          </View>
          <AppText variant="label" tone="muted" style={styles.centerText}>
            Trusted by riders in Ahmedabad
          </AppText>
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg
  },
  brandWrap: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  langWrap: {
    flexDirection: "row",
    alignSelf: "flex-end",
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 999,
    padding: 4,
    marginBottom: theme.spacing.md
  },
  langPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 999
  },
  langPillActive: {
    backgroundColor: theme.colors.surfaceContainerLowest
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.ambient
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderRadius: 32,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.ambient
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(190,201,195,0.5)"
  },
  socialBtn: {
    minHeight: 50,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.3)",
    backgroundColor: theme.colors.surfaceContainerLowest,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm
  },
  trustAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -6,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainerLowest
  },
  trustCount: {
    marginLeft: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryFixed,
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainerLowest
  },
  centerText: {
    textAlign: "center"
  },
  bgGlowTop: {
    position: "absolute",
    top: -80,
    right: -110,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: "rgba(160,243,212,0.22)"
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: -140,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "rgba(227,223,255,0.22)"
  }
});


