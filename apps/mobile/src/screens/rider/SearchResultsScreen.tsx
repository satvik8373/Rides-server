import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppScreen, AppText, EmptyState, RideCard } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "SearchResults">;

const FILTERS = ["Best Match", "Lowest Price", "Women Only", "AC", "Time"];

export const SearchResultsScreen = ({ route, navigation }: Props) => {
  const rides = useAppStore((state) => state.searchResults);
  const setSearchResults = useAppStore((state) => state.setSearchResults);
  const setSelectedRide = useAppStore((state) => state.setSelectedRide);

  const refresh = async () => {
    try {
      const data = await api.searchRides(route.params);
      setSearchResults(data);
    } catch (error) {
      AppAlert.alert("Could not refresh", getApiErrorMessage(error));
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <View style={styles.headerCard}>
        <View>
          <AppText variant="label" tone="muted">
            SEARCH SUMMARY
          </AppText>
          <AppText variant="title">
            {route.params.from} → {route.params.to}
          </AppText>
          <AppText variant="bodyMd" tone="muted">
            {route.params.date}
          </AppText>
        </View>
        <View style={styles.summaryIcon}>
          <Ionicons name="search" size={18} color={theme.colors.primary} />
        </View>
      </View>

      <FlatList
        data={FILTERS}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item, index }) => (
          <Pressable style={[styles.filterChip, index === 0 ? styles.filterChipActive : null]}>
            <AppText variant="bodyMd" tone={index === 0 ? "white" : "default"}>
              {item}
            </AppText>
          </Pressable>
        )}
      />

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No rides found" message="Try changing date or nearby pickup points." />}
        renderItem={({ item }) => (
          <RideCard
            ride={item}
            onPress={() => {
              setSelectedRide(item);
              navigation.navigate("RideDetail", { rideId: item.id });
            }}
          />
        )}
      />

      <AppButton label="Refresh Results" onPress={refresh} variant="secondary" />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  headerCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.25)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center"
  },
  filterList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceContainerLow
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary
  },
  list: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  }
});


