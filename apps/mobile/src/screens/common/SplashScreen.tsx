import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen, AppText } from "../../components";
import { theme } from "../../theme";

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen = ({ message = "Preparing AhmedabadCar..." }: SplashScreenProps) => {
  return (
    <AppScreen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <Ionicons name="car-sport" size={44} color={theme.colors.primary} />
        </View>
        <AppText variant="title1" style={{ color: theme.colors.primary }}>
          AhmedabadCar
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.tagline}>
          Share the road, share the cost.
        </AppText>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <AppText variant="body" tone="secondary" style={styles.loadingText}>
          {message}
        </AppText>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    backgroundColor: theme.colors.background
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.systemGray6,
    alignItems: "center",
    justifyContent: "center"
  },
  tagline: {
    opacity: 0.7
  },
  loadingText: {
    opacity: 0.6,
    marginTop: theme.spacing.md
  }
});
