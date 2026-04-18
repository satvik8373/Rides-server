import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const AppInput = ({ label, error, style, ...props }: AppInputProps) => {
  return (
    <View style={styles.container}>
      {label ? (
        <AppText variant="label" tone="muted" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        {...props}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />
      {error ? (
        <AppText variant="label" tone="error" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs
  },
  label: {
    marginLeft: theme.spacing.xs,
    letterSpacing: 1,
    fontSize: 11
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 54,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.2)"
  },
  inputError: {
    borderColor: theme.colors.error
  },
  error: {
    marginLeft: theme.spacing.xs
  }
});
