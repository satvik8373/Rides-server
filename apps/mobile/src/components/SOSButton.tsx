import { Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface SOSButtonProps {
  onPress: () => void;
}

export const SOSButton = ({ onPress }: SOSButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Emergency SOS"
      accessibilityHint="Sends an emergency alert with your live trip location"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <AppText variant="label" tone="white">
        SOS
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: theme.spacing.md,
    bottom: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.ambient
  }
});
