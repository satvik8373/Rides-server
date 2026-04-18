import { StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface EmptyStateProps {
  title: string;
  message: string;
}

export const EmptyState = ({ title, message }: EmptyStateProps) => (
  <View style={styles.container}>
    <AppText variant="title">{title}</AppText>
    <AppText variant="bodyMd" tone="muted" style={styles.text}>
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
  },
  text: {
    textAlign: "center"
  }
});

