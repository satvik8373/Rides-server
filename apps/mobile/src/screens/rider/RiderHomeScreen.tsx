import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { UserMode } from "@ahmedabadcar/shared";
import { AppButton, AppCard, AppInput, AppScreen, AppText, ModeToggle, StatusPill } from "../../components";
import type { MainTabParamList } from "../../navigation/types";
import { api, type ApiLocationSuggestion } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = BottomTabScreenProps<MainTabParamList, "Home"> & {
  openSearchResults: (params: { from: string; to: string; date: string }) => void;
};

type LocationField = "from" | "to";

export const RiderHomeScreen = ({ openSearchResults }: Props) => {
  const user = useAppStore((state) => state.user);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const setSearchResults = useAppStore((state) => state.setSearchResults);
  const activeBooking = useAppStore((state) => state.activeBooking);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentLocationLabel = useAppStore((state) => state.currentLocationLabel);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("Gandhinagar");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [maxPrice, setMaxPrice] = useState("");
  const [womenOnly, setWomenOnly] = useState(false);
  const [acOnly, setAcOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [searchField, setSearchField] = useState<LocationField>("from");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<ApiLocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | undefined>();
  const autocompleteRequestId = useRef(0);

  const greeting = useMemo(() => `Hello, ${user?.fullName?.split(" ")[0] ?? "Rider"}`, [user?.fullName]);
  const currentCity = useMemo(() => currentLocationLabel?.split(",").map((item) => item.trim()).find((item) => item.length > 1), [currentLocationLabel]);
  const nearbyCitySuggestions = useMemo(() => {
    const defaults = [currentCity, "Ahmedabad", "Gandhinagar", "Vadodara", "Surat", "Rajkot"].filter(
      (item): item is string => Boolean(item?.trim())
    );
    return Array.from(new Set(defaults)).slice(0, 6);
  }, [currentCity]);

  useEffect(() => {
    if (!currentLocationLabel) {
      return;
    }
    setFrom((prev) => (prev.trim().length ? prev : currentLocationLabel));
  }, [currentLocationLabel]);

  useEffect(() => {
    if (!locationSearchVisible) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      setLocationError(undefined);
      return;
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      setLocationError(undefined);
      return;
    }

    const requestId = ++autocompleteRequestId.current;
    setLocationLoading(true);
    setLocationError(undefined);

    const timer = setTimeout(() => {
      api
        .autocompleteLocations(query, currentLocation)
        .then((items) => {
          if (requestId !== autocompleteRequestId.current) {
            return;
          }
          setLocationSuggestions(items);
          setLocationLoading(false);
        })
        .catch((error) => {
          if (requestId !== autocompleteRequestId.current) {
            return;
          }
          setLocationLoading(false);
          setLocationError(getApiErrorMessage(error, "Unable to fetch locations"));
        });
    }, 280);

    return () => {
      clearTimeout(timer);
    };
  }, [currentLocation, locationSearchVisible, searchQuery]);

  const onModeChange = async (next: UserMode) => {
    if (next === mode) {
      return;
    }
    const previous = mode;
    setMode(next);
    try {
      await api.updateMode({ mode: next });
    } catch (error) {
      setMode(previous);
      AppAlert.alert("Mode switch failed", getApiErrorMessage(error));
    }
  };

  const onSearch = async () => {
    if (!from.trim() || !to.trim()) {
      AppAlert.alert("Route required", "Please select both pickup and destination locations.");
      return;
    }

    setLoading(true);
    try {
      const rides = await api.searchRides({
        from: from.trim(),
        to: to.trim(),
        date,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        womenOnly: womenOnly || undefined,
        acAvailable: acOnly || undefined
      });
      setSearchResults(rides);
      openSearchResults({ from: from.trim(), to: to.trim(), date });
    } catch (error) {
      AppAlert.alert("Search failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const openLocationSearch = (field: LocationField) => {
    setSearchField(field);
    setSearchQuery(field === "from" ? from : to);
    setLocationSuggestions([]);
    setLocationError(undefined);
    setLocationSearchVisible(true);
  };

  const closeLocationSearch = () => {
    setLocationSearchVisible(false);
    setLocationSuggestions([]);
    setLocationError(undefined);
    setLocationLoading(false);
  };

  const applyLocationSuggestion = (item: ApiLocationSuggestion) => {
    if (searchField === "from") {
      setFrom(item.fullText);
    } else {
      setTo(item.fullText);
    }
    closeLocationSearch();
  };

  const useTypedLocation = () => {
    const typed = searchQuery.trim();
    if (!typed) {
      return;
    }
    if (searchField === "from") {
      setFrom(typed);
    } else {
      setTo(typed);
    }
    closeLocationSearch();
  };

  const useCurrentLocationForField = () => {
    if (!currentLocationLabel) {
      return;
    }
    if (searchField === "from") {
      setFrom(currentLocationLabel);
    } else {
      setTo(currentLocationLabel);
    }
    closeLocationSearch();
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandCopy}>
              <AppText variant="title" tone="primary">
                AhmedabadCar
              </AppText>
              <AppText variant="label" tone="muted">
                Rider Dashboard
              </AppText>
            </View>
            <View style={styles.cityPill}>
              <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
              <AppText variant="label" tone="primary">
                {currentCity || "Set city"}
              </AppText>
            </View>
          </View>

          <ModeToggle value={mode} onChange={(next) => void onModeChange(next)} />
        </View>

        <View style={styles.heroCopy}>
          <AppText variant="displaySm">{greeting}</AppText>
          <AppText variant="bodyMd" tone="muted">
            Where to? Safe and reliable intercity travel.
          </AppText>
        </View>

        <AppCard style={styles.searchCard}>
          <Pressable style={styles.locationField} onPress={() => openLocationSearch("from")}>
            <View style={styles.locationFieldCopy}>
              <AppText variant="label" tone="muted">
                PICK-UP
              </AppText>
              <AppText variant="bodyLg" tone={from ? "default" : "muted"}>
                {from || "Tap to search pickup location"}
              </AppText>
            </View>
            <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
          </Pressable>

          <Pressable style={styles.locationField} onPress={() => openLocationSearch("to")}>
            <View style={styles.locationFieldCopy}>
              <AppText variant="label" tone="muted">
                DROP-OFF
              </AppText>
              <AppText variant="bodyLg" tone={to ? "default" : "muted"}>
                {to || "Tap to search destination"}
              </AppText>
            </View>
            <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
          </Pressable>

          <View style={styles.metaGrid}>
            <AppInput label="Date" value={date} onChangeText={setDate} />
            <AppInput label="Max Price" value={maxPrice} onChangeText={setMaxPrice} keyboardType="number-pad" />
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterChip}>
              <AppText variant="bodyMd">Women-only</AppText>
              <Switch value={womenOnly} onValueChange={setWomenOnly} />
            </View>
            <View style={styles.filterChip}>
              <AppText variant="bodyMd">AC only</AppText>
              <Switch value={acOnly} onValueChange={setAcOnly} />
            </View>
          </View>

          <View style={styles.citySuggestionBlock}>
            <AppText variant="label" tone="muted">
              POPULAR NEARBY CITIES
            </AppText>
            <View style={styles.citySuggestionRow}>
              {nearbyCitySuggestions.map((city) => (
                <Pressable key={city} style={styles.cityChip} onPress={() => setTo(city)}>
                  <AppText variant="bodyMd">{city}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <AppButton label="Search Rides" onPress={onSearch} loading={loading} />
        </AppCard>

        {activeBooking ? (
          <AppCard style={styles.upcomingCard}>
            <View style={styles.upcomingTop}>
              <View>
                <AppText variant="label" tone="muted">
                  UPCOMING TRIP
                </AppText>
                <AppText variant="title">
                  {activeBooking.ride.from} → {activeBooking.ride.to}
                </AppText>
              </View>
              <StatusPill label={activeBooking.status} tone="driver" />
            </View>
            <AppText variant="bodyMd" tone="muted">
              {activeBooking.ride.date} • {activeBooking.ride.departureTime}
            </AppText>
          </AppCard>
        ) : null}

        <View style={styles.quickRow}>
          <StatusPill label="Escrow secured payments" tone="driver" />
          <StatusPill label="Real-time tracking" tone="neutral" />
        </View>

        <Pressable style={styles.mapCard}>
          <View style={styles.mapOverlay}>
            <View>
              <AppText variant="title">Explore Live Drivers</AppText>
              <AppText variant="bodyMd" tone="muted">
                Find instant matches on your route.
              </AppText>
            </View>
            <View style={styles.mapButton}>
              <Ionicons name="navigate" size={16} color={theme.colors.onPrimary} />
            </View>
          </View>
        </Pressable>

        {mode === UserMode.Driver ? (
          <AppText variant="label" tone="primary">
            You are in Driver mode. Tabs will switch automatically.
          </AppText>
        ) : null}
      </ScrollView>

      <Modal
        visible={locationSearchVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeLocationSearch}
      >
        <AppScreen style={styles.searchScreen}>
          <View style={styles.searchHeader}>
            <Pressable style={styles.backButton} onPress={closeLocationSearch}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
            </Pressable>
            <View style={styles.searchHeaderCopy}>
              <AppText variant="title">{searchField === "from" ? "Search Pickup Location" : "Search Drop Location"}</AppText>
              <AppText variant="bodyMd" tone="muted">
                Type city, area, landmark, or exact place name
              </AppText>
            </View>
          </View>

          <AppCard style={styles.searchCardModal}>
            <AppInput
              label={searchField === "from" ? "FROM" : "TO"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="words"
              placeholder={searchField === "from" ? "Search pickup location" : "Search drop location"}
            />
          </AppCard>

          <View style={styles.searchBody}>
            {currentLocationLabel ? (
              <Pressable style={styles.currentLocationButton} onPress={useCurrentLocationForField}>
                <Ionicons name="locate" size={16} color={theme.colors.primary} />
                <View style={styles.currentLocationCopy}>
                  <AppText variant="title" tone="primary">
                    Use current location
                  </AppText>
                  <AppText variant="bodyMd" tone="muted">
                    {currentLocationLabel}
                  </AppText>
                </View>
              </Pressable>
            ) : null}

            {locationLoading ? (
              <AppText variant="bodyMd" tone="muted">
                Searching locations...
              </AppText>
            ) : null}

            {locationError ? (
              <AppText variant="bodyMd" tone="error">
                {locationError}
              </AppText>
            ) : null}

            {!locationLoading && !locationError && searchQuery.trim().length < 2 ? (
              <View style={styles.hintBlock}>
                <AppText variant="bodyMd" tone="muted">
                  Start typing at least 2 letters, or choose a nearby city:
                </AppText>
                <View style={styles.citySuggestionRow}>
                  {nearbyCitySuggestions.map((city) => (
                    <Pressable key={`hint-${city}`} style={styles.cityChip} onPress={() => setSearchQuery(city)}>
                      <AppText variant="bodyMd">{city}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <FlatList
              data={locationSuggestions}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.searchList}
              renderItem={({ item }) => (
                <Pressable style={styles.searchItem} onPress={() => applyLocationSuggestion(item)}>
                  <View style={styles.searchItemCopy}>
                    <AppText variant="bodyLg">{item.primaryText}</AppText>
                    {item.secondaryText ? (
                      <AppText variant="bodyMd" tone="muted">
                        {item.secondaryText}
                      </AppText>
                    ) : null}
                  </View>
                  <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                </Pressable>
              )}
              ListFooterComponent={
                !locationLoading && searchQuery.trim().length >= 2 ? (
                  <Pressable style={styles.useTypedButton} onPress={useTypedLocation}>
                    <AppText variant="title" tone="primary">
                      Use "{searchQuery.trim()}"
                    </AppText>
                  </Pressable>
                ) : null
              }
            />
          </View>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl
  },
  header: {
    gap: theme.spacing.sm
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brandCopy: {
    gap: 2
  },
  cityPill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(8,107,83,0.25)",
    backgroundColor: theme.colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  heroCopy: {
    gap: theme.spacing.xs
  },
  searchCard: {
    borderRadius: 30,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.25)"
  },
  locationField: {
    borderRadius: theme.radius.md,
    minHeight: 58,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.28)",
    backgroundColor: theme.colors.surfaceContainerLowest,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  locationFieldCopy: {
    flex: 1,
    gap: 2
  },
  metaGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  filterRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  filterChip: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  citySuggestionBlock: {
    gap: theme.spacing.xs
  },
  citySuggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  cityChip: {
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(8,107,83,0.25)",
    backgroundColor: theme.colors.surfaceContainerLow
  },
  upcomingCard: {
    borderRadius: 28,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(0,84,64,0.16)"
  },
  upcomingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  mapCard: {
    height: 170,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: "hidden",
    justifyContent: "flex-end"
  },
  mapOverlay: {
    margin: theme.spacing.md,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  mapButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary
  },
  searchScreen: {
    paddingHorizontal: 0
  },
  searchHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start"
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainerLow
  },
  searchHeaderCopy: {
    flex: 1,
    gap: 2
  },
  searchCardModal: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: 20
  },
  searchBody: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm
  },
  searchList: {
    paddingBottom: theme.spacing.xxl
  },
  searchItem: {
    minHeight: 56,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(190,201,195,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  searchItemCopy: {
    flex: 1,
    gap: 2
  },
  useTypedButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(8,107,83,0.28)",
    backgroundColor: theme.colors.surfaceContainerLow
  },
  currentLocationButton: {
    minHeight: 56,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(8,107,83,0.22)",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  currentLocationCopy: {
    flex: 1,
    gap: 2
  },
  hintBlock: {
    gap: theme.spacing.xs
  }
});
