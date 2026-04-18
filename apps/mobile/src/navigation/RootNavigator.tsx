import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabsNavigator } from "./MainTabsNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { useBootstrap } from "../hooks/useBootstrap";
import { usePushRegistration } from "../hooks/usePushRegistration";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useAppStore } from "../store";
import { SplashScreen } from "../screens/common/SplashScreen";
import { ProfileSetupScreen } from "../screens/common/ProfileSetupScreen";
import { ModeSelectionScreen } from "../screens/common/ModeSelectionScreen";
import { SearchResultsScreen } from "../screens/rider/SearchResultsScreen";
import { RideDetailScreen } from "../screens/rider/RideDetailScreen";
import { BookingConfirmationScreen } from "../screens/rider/BookingConfirmationScreen";
import { PostRideScreen } from "../screens/driver/PostRideScreen";
import { ManageRideScreen } from "../screens/driver/ManageRideScreen";
import { ActiveTripTrackingScreen } from "../screens/trip/ActiveTripTrackingScreen";
import { BookingChatScreen } from "../screens/trip/BookingChatScreen";
import { RatingScreen } from "../screens/trip/RatingScreen";
import { WalletWithdrawScreen } from "../screens/common/WalletWithdrawScreen";
import { KYCStatusScreen } from "../screens/common/KYCStatusScreen";
import { theme } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surfaceContainerLowest,
    text: theme.colors.onSurface,
    border: "transparent",
    primary: theme.colors.primary
  }
};

export const RootNavigator = () => {
  const { initializing } = useBootstrap();
  const accessToken = useAppStore((state) => state.accessToken);
  const user = useAppStore((state) => state.user);
  const modeInitialized = useAppStore((state) => state.modeInitialized);
  const hydrated = useAppStore((state) => state.hydrated);

  const needsProfile = Boolean(accessToken && user && !user.fullName);
  const needsModeSelection = Boolean(accessToken && !needsProfile && !modeInitialized);

  usePushRegistration();
  useCurrentLocation();

  if (!hydrated || initializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!accessToken ? <Stack.Screen name="Auth" component={AuthNavigator} /> : null}
        {accessToken && needsProfile ? <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} /> : null}
        {accessToken && !needsProfile && needsModeSelection ? <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} /> : null}
        {accessToken && !needsProfile && !needsModeSelection ? <Stack.Screen name="MainTabs" component={MainTabsNavigator} /> : null}
        {accessToken && !needsProfile && !needsModeSelection ? <Stack.Screen name="ModeSelectionSettings" component={ModeSelectionScreen} /> : null}

        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="RideDetail" component={RideDetailScreen} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="PostRide" component={PostRideScreen} />
        <Stack.Screen name="ManageRide" component={ManageRideScreen} />
        <Stack.Screen name="ActiveTripTracking" component={ActiveTripTrackingScreen} />
        <Stack.Screen name="BookingChat" component={BookingChatScreen} />
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen name="WalletWithdraw" component={WalletWithdrawScreen} />
        <Stack.Screen name="KYCStatus" component={KYCStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
