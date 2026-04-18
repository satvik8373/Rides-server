import { ActivityIndicator, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState = ({ message = "Loading..." }: LoadingStateProps) => (
  <View style={styles.container}>
    <ActivityIndicator color={theme.colors.primary} size="large" />
    <AppText variant="bodyMd" tone="muted">
      {message}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl
  }
});

