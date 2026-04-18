import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const AppButton = ({ label, onPress, variant = "primary", disabled, loading, accessibilityLabel, accessibilityHint }: AppButtonProps) => {
  const isDisabled = disabled || loading;
  const commonA11y = {
    accessible: true as const,
    accessibilityRole: "button" as const,
    accessibilityLabel: accessibilityLabel ?? label,
    accessibilityHint,
    accessibilityState: {
      disabled: Boolean(isDisabled),
      busy: Boolean(loading)
    },
    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 }
  };

  if (variant === "primary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [styles.wrapper, pressed && styles.pressed, isDisabled && styles.disabled]}
        {...commonA11y}
      >
        <View style={styles.primary}>
          <AppText variant="title" tone="white">
            {loading ? "Please wait..." : label}
          </AppText>
        </View>
      </Pressable>
    );
  }

  if (variant === "secondary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed, isDisabled && styles.disabled]}
        {...commonA11y}
      >
        <AppText variant="title" style={{ color: theme.colors.onSecondaryFixed }}>
          {loading ? "Please wait..." : label}
        </AppText>
      </Pressable>
    );
  }

  if (variant === "danger") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [styles.danger, pressed && styles.pressed, isDisabled && styles.disabled]}
        {...commonA11y}
      >
        <AppText variant="title" tone="white">
          {loading ? "Please wait..." : label}
        </AppText>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.tertiary, pressed && styles.pressed, isDisabled && styles.disabled]}
      {...commonA11y}
    >
      <AppText variant="title" style={{ color: theme.colors.tertiary }}>
        {loading ? "Please wait..." : label}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.radius.lg,
    overflow: "hidden"
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    alignItems: "center"
  },
  secondary: {
    backgroundColor: theme.colors.secondaryFixed,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    alignItems: "center"
  },
  danger: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    alignItems: "center"
  },
  tertiary: {
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    alignItems: "center"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.6
  }
});
