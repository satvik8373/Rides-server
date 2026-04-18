import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppInput, AppScreen, AppText } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileSetup">;

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" as const, icon: "male" as const },
  { label: "Female", value: "FEMALE" as const, icon: "female" as const },
  { label: "Other", value: "OTHER" as const, icon: "person" as const }
];

export const ProfileSetupScreen = (_props: Props) => {
  const user = useAppStore((state) => state.user);
  const patchUser = useAppStore((state) => state.patchUser);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | undefined>(user?.gender);
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (fullName.trim().length < 2) {
      AppAlert.alert("Name is required");
      return;
    }
    setLoading(true);
    try {
      const updated = await api.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        gender
      });
      patchUser(updated);
    } catch (error) {
      AppAlert.alert("Profile update failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={44} color={theme.colors.primary} />
            <View style={styles.addBadge}>
              <Ionicons name="add" size={14} color={theme.colors.onPrimary} />
            </View>
          </View>
          <AppText variant="displaySm">Setup Your Profile</AppText>
          <AppText variant="bodyLg" tone="muted" style={styles.centerText}>
            Complete your account for safer rider and driver matching.
          </AppText>
        </View>

        <View style={styles.card}>
          <AppInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="John Doe" />
          <AppInput label="Email (Optional)" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="john@example.com" />

          <View style={styles.genderWrap}>
            {GENDER_OPTIONS.map((option) => {
              const active = option.value === gender;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  style={[styles.genderCard, active ? styles.genderCardActive : null]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${option.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={option.icon} size={20} color={active ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                  <AppText variant="title" tone={active ? "primary" : "muted"}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppButton label="Complete Profile" onPress={onSave} loading={loading} />
        </View>
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
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  avatarWrap: {
    width: 98,
    height: 98,
    borderRadius: 30,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center"
  },
  addBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.ambient
  },
  genderWrap: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  genderCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceContainer,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: "transparent"
  },
  genderCardActive: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderColor: "rgba(0,84,64,0.2)"
  },
  centerText: {
    textAlign: "center"
  }
});


