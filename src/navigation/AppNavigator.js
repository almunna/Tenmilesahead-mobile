import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, Image } from "react-native";
import { useAuth } from "../components/AuthProvider";
import { COLORS, SCREENS } from "../lib/constants";

// Import Screens
import LandingScreen from "../screens/LandingScreen";
import SigninScreen from "../screens/SigninScreen";
import SignupScreen from "../screens/SignupScreen";
import HomeScreen from "../screens/HomeScreen";
import TripsScreen from "../screens/TripsScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SubscribeScreen from "../screens/SubscribeScreen";
import GlobalReviewsScreen from "../screens/GlobalReviewsScreen";
import ReviewsScreen from "../screens/ReviewsScreen";
import FAQsScreen from "../screens/FAQsScreen";
import TutorialsScreen from "../screens/TutorialsScreen";
import PrivacyScreen from "../screens/PrivacyScreen";
import TermsScreen from "../screens/TermsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon Component
function TabIcon({ focused, icon, label }) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

// Logo Tab Icon Component
function LogoTabIcon({ focused }) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.logoContainer, focused && styles.logoContainerFocused]}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoIcon}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

// Home Stack (for authenticated users - contains Home and related screens)
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: COLORS.foreground,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.TRIP_DETAIL}
        component={TripDetailScreen}
        options={{ title: "Trip Details" }}
      />
      <Stack.Screen
        name={SCREENS.SUBSCRIBE}
        component={SubscribeScreen}
        options={{ title: "Subscribe" }}
      />
      <Stack.Screen
        name={SCREENS.FAQS}
        component={FAQsScreen}
        options={{ title: "FAQs" }}
      />
      <Stack.Screen
        name={SCREENS.TUTORIALS}
        component={TutorialsScreen}
        options={{ title: "Tutorials" }}
      />
      <Stack.Screen
        name={SCREENS.PRIVACY}
        component={PrivacyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name={SCREENS.TERMS}
        component={TermsScreen}
        options={{ title: "Terms of Service" }}
      />
    </Stack.Navigator>
  );
}

// Landing Stack (for non-authenticated users)
function LandingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: COLORS.foreground,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Stack.Screen
        name="LandingMain"
        component={LandingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.SIGNIN}
        component={SigninScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.SIGNUP}
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.FAQS}
        component={FAQsScreen}
        options={{ title: "FAQs" }}
      />
      <Stack.Screen
        name={SCREENS.TUTORIALS}
        component={TutorialsScreen}
        options={{ title: "Tutorials" }}
      />
      <Stack.Screen
        name={SCREENS.PRIVACY}
        component={PrivacyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name={SCREENS.TERMS}
        component={TermsScreen}
        options={{ title: "Terms of Service" }}
      />
    </Stack.Navigator>
  );
}

// Trips Stack
function TripsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: COLORS.foreground,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Stack.Screen
        name="TripsMain"
        component={TripsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREENS.TRIP_DETAIL}
        component={TripDetailScreen}
        options={{ title: "Trip Details" }}
      />
      <Stack.Screen
        name={SCREENS.REVIEWS}
        component={ReviewsScreen}
        options={{ title: "Reviews" }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator (for authenticated users)
function AuthenticatedTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name={SCREENS.HOME}
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => <LogoTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.TRIPS}
        component={TripsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="✈️" label="Trips" />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.GLOBAL_REVIEWS}
        component={GlobalReviewsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="⭐" label="Reviews" />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.TUTORIALS}
        component={TutorialsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📚" label="Tutorials" />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.FAQS}
        component={FAQsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="❓" label="FAQs" />
          ),
        }}
      />
      <Tab.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Unauthenticated Tab Navigator (shows tab bar on landing/signin/signup)
function UnauthenticatedTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name={SCREENS.LANDING}
        component={LandingStack}
        options={{
          tabBarIcon: ({ focused }) => <LogoTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="TripsTab"
        component={LandingStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="✈️" label="Trips" />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate(SCREENS.LANDING, { screen: SCREENS.SIGNIN });
          },
        })}
      />
      <Tab.Screen
        name="ReviewsTab"
        component={LandingStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="⭐" label="Reviews" />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate(SCREENS.LANDING, { screen: SCREENS.SIGNIN });
          },
        })}
      />
      <Tab.Screen
        name="TutorialsTab"
        component={TutorialsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📚" label="Tutorials" />
          ),
        }}
      />
      <Tab.Screen
        name="FAQsTab"
        component={FAQsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="❓" label="FAQs" />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={LandingStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate(SCREENS.LANDING, { screen: SCREENS.SIGNIN });
          },
        })}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return user ? <AuthenticatedTabs /> : <UnauthenticatedTabs />;
}

// Main App Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.foreground,
    fontSize: 16,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 18,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  logoContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    opacity: 0.7,
  },
  logoContainerFocused: {
    opacity: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
});
