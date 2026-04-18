import { Pressable, StyleSheet, View } from "react-native";
import { UserMode } from "@ahmedabadcar/shared";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface ModeToggleProps {
  value: UserMode;
  onChange: (mode: UserMode) => void;
}

export const ModeToggle = ({ value, onChange }: ModeToggleProps) => {
  return (
    <View style={styles.container}>
      {[UserMode.Rider, UserMode.Driver].map((mode) => {
        const active = mode === value;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[styles.option, active && styles.active]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${mode === UserMode.Rider ? "Rider" : "Driver"} mode`}
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={mode === UserMode.Rider ? "person" : "car-sport"}
              size={18}
              color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <AppText variant="label" style={{ color: active ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
              {mode === UserMode.Rider ? "Rider Mode" : "Drive Mode"}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 999,
    padding: theme.spacing.xs
  },
  option: {
    flex: 1,
    borderRadius: 999,
    flexDirection: "row",
    gap: theme.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    minHeight: 44
  },
  active: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    ...theme.shadows.ambient
  }
});
