import { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import Purchases from "react-native-purchases";
import AuthProvider from "./src/components/AuthProvider";
import AppNavigator from "./src/navigation/AppNavigator";
import { STRIPE_PUBLISHABLE_KEY, REVENUECAT_API_KEY_IOS } from "./src/lib/constants";

export default function App() {
  useEffect(() => {
    if (Platform.OS === "ios") {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
