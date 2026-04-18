import { StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { AppButton } from "./AppButton";
import { AppText } from "./AppText";

interface ErrorStateProps {
  message: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, actionLabel = "Try Again", onRetry }: ErrorStateProps) => (
  <View style={styles.container}>
    <AppText variant="title" tone="error">
      Something went wrong
    </AppText>
    <AppText variant="bodyMd" tone="muted">
      {message}
    </AppText>
    {onRetry ? <AppButton label={actionLabel} onPress={onRetry} /> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl
  }
});

