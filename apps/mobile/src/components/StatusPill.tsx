import { StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface StatusPillProps {
  label: string;
  tone?: "driver" | "rider" | "neutral";
}

export const StatusPill = ({ label, tone = "neutral" }: StatusPillProps) => {
  const backgroundColor =
    tone === "driver" ? theme.colors.primaryFixed : tone === "rider" ? theme.colors.secondaryFixed : theme.colors.surfaceContainerHigh;
  const color =
    tone === "driver" ? theme.colors.onPrimaryFixed : tone === "rider" ? theme.colors.onSecondaryFixed : theme.colors.onSurfaceVariant;

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <AppText variant="label" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6
  }
});

