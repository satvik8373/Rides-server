import "react-native-gesture-handler";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InAppAlertHost } from "./src/components";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { theme } from "./src/theme";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
        <InAppAlertHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
