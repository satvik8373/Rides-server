import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppInput, AppScreen, AppText } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api, type ApiLocationSuggestion } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "PostRide">;
type LocationField = "from" | "to";
type PickerMode = "date" | "time";
type PickerEventType = "dismissed" | "set" | "neutralButtonPressed";

interface DateTimePickerAndroidLike {
  open: (params: {
    value: Date;
    mode: PickerMode;
    is24Hour?: boolean;
    minimumDate?: Date;
    onChange: (event: { type: PickerEventType }, selectedDate?: Date) => void;
  }) => void;
}

const getNativeDateTimePickerAndroid = (): DateTimePickerAndroidLike | null => {
  try {
    const module = require("@react-native-community/datetimepicker") as {
      DateTimePickerAndroid?: DateTimePickerAndroidLike;
    };
    return module.DateTimePickerAndroid ?? null;
  } catch {
    return null;
  }
};

const toTwoDigits = (value: number) => String(value).padStart(2, "0");

const toIsoDate = (value: Date) =>
  `${value.getFullYear()}-${toTwoDigits(value.getMonth() + 1)}-${toTwoDigits(value.getDate())}`;

const toHHmm = (value: Date) => `${toTwoDigits(value.getHours())}:${toTwoDigits(value.getMinutes())}`;

const fromScheduleFields = (date: string, time: string): Date => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return new Date();
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatTimeLabel = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);
  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

export const PostRideScreen = ({ navigation }: Props) => {
  const currentLocation = useAppStore((state) => state.currentLocation);
  const currentLocationLabel = useAppStore((state) => state.currentLocationLabel);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departureTime, setDepartureTime] = useState("09:00");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [pricePerSeat, setPricePerSeat] = useState("220");
  const [womenOnly, setWomenOnly] = useState(false);
  const [acAvailable, setAcAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [androidPickerUnavailable, setAndroidPickerUnavailable] = useState(false);

  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [searchField, setSearchField] = useState<LocationField>("from");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<ApiLocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | undefined>();
  const autocompleteRequestId = useRef(0);

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

  const useCurrentLocation = () => {
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

  const openNativePicker = (mode: PickerMode) => {
    if (Platform.OS !== "android") {
      AppAlert.alert("Use manual schedule", "Native calendar picker is shown by default on Android devices.");
      return;
    }

    const picker = getNativeDateTimePickerAndroid();
    if (!picker) {
      setAndroidPickerUnavailable(true);
      AppAlert.alert(
        "Calendar module missing",
        "Install @react-native-community/datetimepicker and restart app to use device calendar."
      );
      return;
    }

    const current = fromScheduleFields(date, departureTime);
    picker.open({
      value: current,
      mode,
      is24Hour: true,
      minimumDate: mode === "date" ? new Date() : undefined,
      onChange: (event, selectedDate) => {
        if (event.type === "dismissed" || !selectedDate) {
          return;
        }
        if (mode === "date") {
          setDate(toIsoDate(selectedDate));
          return;
        }
        setDepartureTime(toHHmm(selectedDate));
      }
    });
  };

  const onPostRide = async () => {
    if (!from.trim() || !to.trim()) {
      AppAlert.alert("Route required", "Please select both pickup and drop locations.");
      return;
    }

    setLoading(true);
    try {
      const ride = await api.createRide({
        from: from.trim(),
        to: to.trim(),
        date,
        departureTime,
        seatsTotal: Number(seatsTotal),
        pricePerSeat: Number(pricePerSeat),
        womenOnly,
        acAvailable
      });
      AppAlert.alert("Ride posted", `Your ride is live. Suggested fare: INR ${ride.suggestedPricePerSeat ?? ride.pricePerSeat} per seat.`);
      navigation.replace("ManageRide", { rideId: ride.id });
    } catch (error) {
      AppAlert.alert("Post ride failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="displaySm">Post a New Ride</AppText>
          <AppText variant="bodyMd" tone="muted">
            Publish route, seats and fare in one flow.
          </AppText>
        </View>

        <AppCard style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="navigate" size={16} color={theme.colors.primary} />
            <AppText variant="title">Route Details</AppText>
          </View>

          <Pressable style={styles.locationField} onPress={() => openLocationSearch("from")}>
            <View style={styles.locationFieldCopy}>
              <AppText variant="label" tone="muted">
                FROM
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
                TO
              </AppText>
              <AppText variant="bodyLg" tone={to ? "default" : "muted"}>
                {to || "Tap to search drop location"}
              </AppText>
            </View>
            <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
          </Pressable>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar" size={16} color={theme.colors.primary} />
            <AppText variant="title">Schedule</AppText>
          </View>

          {Platform.OS === "android" && !androidPickerUnavailable ? (
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Pressable style={styles.scheduleInput} onPress={() => openNativePicker("date")}>
                  <View style={styles.scheduleCopy}>
                    <AppText variant="label" tone="muted">
                      DATE
                    </AppText>
                    <AppText variant="bodyLg">{formatDateLabel(date)}</AppText>
                  </View>
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                </Pressable>
              </View>
              <View style={styles.fieldHalf}>
                <Pressable style={styles.scheduleInput} onPress={() => openNativePicker("time")}>
                  <View style={styles.scheduleCopy}>
                    <AppText variant="label" tone="muted">
                      DEPARTURE
                    </AppText>
                    <AppText variant="bodyLg">{formatTimeLabel(departureTime)}</AppText>
                  </View>
                  <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <AppInput label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
              </View>
              <View style={styles.fieldHalf}>
                <AppInput label="Departure Time (HH:mm)" value={departureTime} onChangeText={setDepartureTime} />
              </View>
            </View>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people" size={16} color={theme.colors.primary} />
            <AppText variant="title">Seats & Fare</AppText>
          </View>

          <View style={styles.row}>
            <View style={styles.seatWrap}>
              <AppText variant="label" tone="muted">
                SEATS
              </AppText>
              <View style={styles.counterRow}>
                <Pressable
                  style={styles.counterButton}
                  onPress={() => setSeatsTotal((value) => String(Math.max(1, Number(value || "1") - 1)))}
                >
                  <Ionicons name="remove" size={18} color={theme.colors.primary} />
                </Pressable>
                <AppText variant="headline">{seatsTotal}</AppText>
                <Pressable style={[styles.counterButton, styles.counterButtonPrimary]} onPress={() => setSeatsTotal((value) => String(Number(value || "0") + 1))}>
                  <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldHalf}>
              <AppInput label="Price per seat (INR)" value={pricePerSeat} keyboardType="number-pad" onChangeText={setPricePerSeat} />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCard}>
              <AppText variant="bodyLg">Women-only</AppText>
              <Switch value={womenOnly} onValueChange={setWomenOnly} />
            </View>
            <View style={styles.toggleCard}>
              <AppText variant="bodyLg">AC Available</AppText>
              <Switch value={acAvailable} onValueChange={setAcAvailable} />
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.suggestCard}>
          <AppText variant="title" tone="white">
            Smart Fare Suggestion
          </AppText>
          <AppText variant="bodyMd" tone="white" style={styles.whiteMuted}>
            Suggested fare updates automatically after posting based on route demand.
          </AppText>
        </AppCard>

        <AppButton label="Publish Ride" onPress={onPostRide} loading={loading} />
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

          <AppCard style={styles.searchCard}>
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
            {currentLocationLabel && searchField === "from" ? (
              <Pressable style={styles.currentLocationButton} onPress={useCurrentLocation}>
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
              <AppText variant="bodyMd" tone="muted">
                Enter at least 2 letters to get live suggestions.
              </AppText>
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
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl
  },
  header: {
    gap: theme.spacing.xs
  },
  card: {
    gap: theme.spacing.md,
    borderRadius: 24
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
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
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  fieldHalf: {
    flex: 1
  },
  scheduleInput: {
    borderRadius: theme.radius.md,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.2)",
    backgroundColor: theme.colors.surfaceContainerHighest,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  scheduleCopy: {
    gap: 2
  },
  seatWrap: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  counterButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center"
  },
  counterButtonPrimary: {
    backgroundColor: theme.colors.primary
  },
  toggleRow: {
    gap: theme.spacing.sm
  },
  toggleCard: {
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.sm,
    minHeight: 52,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  suggestCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    gap: theme.spacing.xs
  },
  whiteMuted: {
    opacity: 0.88
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
  searchCard: {
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
  }
});
