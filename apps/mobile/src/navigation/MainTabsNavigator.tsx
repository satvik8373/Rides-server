import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { RiderHomeScreen } from "../screens/rider/RiderHomeScreen";
import { ProfileScreen } from "../screens/common/ProfileScreen";
import { TripsScreen } from "../screens/common/TripsScreen";
import { WalletScreen } from "../screens/common/WalletScreen";
import { useAppStore } from "../store";
import type { MainTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
type TabIconName = keyof typeof Ionicons.glyphMap;

// iOS blue (Apple standard)
const IOS_BLUE = "#007AFF";
const IOS_GRAY = "#8E8E93";

export const MainTabsNavigator = () => {
  const mode = useAppStore((state) => state.mode);
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: IOS_BLUE,
        tabBarInactiveTintColor: IOS_GRAY,
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: "rgba(248, 248, 248, 0.95)",
            borderTopWidth: 0.5,
            borderTopColor: "rgba(0, 0, 0, 0.1)",
            paddingBottom: Math.max(insets.bottom - 4, 0),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8
          },
          default: {
            backgroundColor: "#F9F9F9",
            borderTopWidth: 0.5,
            borderTopColor: "rgba(0, 0, 0, 0.1)"
          }
        }),
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
          fontWeight: "500"
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: TabIconName;
          if (route.name === "Home") {
            iconName = mode === "RIDER" 
              ? (focused ? "home" : "home-outline") 
              : (focused ? "car-sport" : "car-sport-outline");
          } else if (route.name === "Trips") {
            iconName = focused ? "git-network" : "git-network-outline";
          } else if (route.name === "Wallet") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else {
            iconName = focused ? "person-circle" : "person-circle-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
      sceneContainerStyle={{
        flex: 1
      }}
    >
      <Tab.Screen
        name="Home"
        options={{ title: mode === "RIDER" ? "Rider" : "Driver" }}
        children={(props) =>
          mode === "RIDER" ? (
            <RiderHomeScreen {...props} openSearchResults={(params) => rootNavigation.navigate("SearchResults", params)} />
          ) : (
            <DriverHomeScreen
              {...props}
              openPostRide={() => rootNavigation.navigate("PostRide")}
              openManageRide={(rideId) => rootNavigation.navigate("ManageRide", { rideId })}
              openKyc={() => rootNavigation.navigate("KYCStatus")}
            />
          )
        }
      />
      <Tab.Screen
        name="Trips"
        options={{ title: "Trips" }}
        children={(props) => (
          <TripsScreen
            {...props}
            openManageRide={(rideId) => rootNavigation.navigate("ManageRide", { rideId })}
            openBookingConfirmation={(bookingId) => rootNavigation.navigate("BookingConfirmation", { bookingId })}
          />
        )}
      />
      <Tab.Screen
        name="Wallet"
        options={{ title: "Wallet" }}
        children={(props) => <WalletScreen {...props} openWithdraw={() => rootNavigation.navigate("WalletWithdraw")} />}
      />
      <Tab.Screen
        name="Profile"
        options={{ title: "Profile" }}
        children={(props) => (
          <ProfileScreen
            {...props}
            openModeSelection={() => rootNavigation.navigate("ModeSelectionSettings")}
            openKyc={() => rootNavigation.navigate("KYCStatus")}
          />
        )}
      />
    </Tab.Navigator>
  );
};
