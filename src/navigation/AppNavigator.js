import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator, BottomTabBar } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, Image, TouchableOpacity, Modal, Linking, ScrollView, Platform, StatusBar, Animated, Pressable } from "react-native";
import { useAuth } from "../components/AuthProvider";
import { COLORS, SCREENS, scaleFontSize, scaleSpacing, isTablet } from "../lib/constants";
import DrawerMenu from "../components/DrawerMenu";

const ESIM_PROVIDERS = {
  airalo:    { name: "Airalo",      bestFor: "Lowest price",                 deepLink: "https://airalo.pxf.io/0GJkJP" },
  saily:     { name: "Saily",       bestFor: "Easiest setup",                deepLink: "https://www.awin1.com/awclick.php?gid=514710&mid=115198&awinaffid=2773070&linkid=4543016&clickref=" },
  strongEsim:{ name: "Strong eSIM", bestFor: "Hotspot use & fastest speeds", deepLink: "https://www.awin1.com/awclick.php?gid=514710&mid=115198&awinaffid=2773070&linkid=4543016&clickref=" },
};

/* ── eSIM Quiz (mirrors web EsimQuiz.tsx) ── */
function EsimQuizModal({ onClose }) {
  const [step, setStep] = useState("q1");
  const [result, setResult] = useState(null);

  function finish(key) { setResult(key); setStep("result"); }
  function reset()      { setStep("q1"); setResult(null); }

  const provider = result ? ESIM_PROVIDERS[result] : null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={bookStyles.esimOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={bookStyles.esimCard}>
          {/* Header */}
          <View style={bookStyles.esimHeader}>
            <Text style={bookStyles.esimTitle}>Find Your eSIM</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Text style={bookStyles.esimClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Result */}
          {step === "result" && provider ? (
            <View style={bookStyles.esimBody}>
              <View style={bookStyles.esimResultIcon}>
                <Text style={{ fontSize: scaleFontSize(28), color: COLORS.primary }}>✓</Text>
              </View>
              <Text style={bookStyles.esimRecommendLabel}>We recommend</Text>
              <Text style={bookStyles.esimProviderName}>{provider.name}</Text>
              <Text style={bookStyles.esimProviderBest}>Best for: {provider.bestFor}</Text>
              <TouchableOpacity style={bookStyles.esimVisitBtn} onPress={() => Linking.openURL(provider.deepLink)} activeOpacity={0.8}>
                <Text style={bookStyles.esimVisitBtnText}>Visit {provider.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={reset} style={bookStyles.esimStartOver}>
                <Text style={bookStyles.esimStartOverText}>Start over</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EsimQuizStep
              step={step}
              onQ1Answer={(ans) => ans === "Yes" ? finish("strongEsim") : setStep("q2")}
              onQ2Answer={(ans) => ans === "Heavy" ? finish("strongEsim") : setStep("q3")}
              onQ3Answer={(ans) => {
                if (ans === "Lowest price") finish("airalo");
                else if (ans === "Easiest setup") finish("saily");
                else finish("strongEsim");
              }}
              onReset={reset}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function EsimQuizStep({ step, onQ1Answer, onQ2Answer, onQ3Answer, onReset }) {
  const questions = {
    q1: { num: 1, text: "Will you need to use your phone as a hotspot?", options: ["Yes", "No", "Not sure"], onSelect: onQ1Answer },
    q2: { num: 2, text: "How much data will you use?",                   options: ["Light", "Moderate", "Heavy"],              onSelect: onQ2Answer },
    q3: { num: 3, text: "What matters most to you?",                     options: ["Lowest price", "Easiest setup", "Fastest speeds"], onSelect: onQ3Answer },
  };
  const q = questions[step];
  return (
    <View style={bookStyles.esimBody}>
      <Text style={bookStyles.esimCounter}>Question {q.num} of 3</Text>
      <Text style={bookStyles.esimQuestion}>{q.text}</Text>
      <View style={bookStyles.esimOptions}>
        {q.options.map((opt) => (
          <TouchableOpacity key={opt} style={bookStyles.esimOptionBtn} onPress={() => q.onSelect(opt)} activeOpacity={0.8}>
            <Text style={bookStyles.esimOptionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {step !== "q1" && (
        <TouchableOpacity onPress={onReset} style={bookStyles.esimStartOver}>
          <Text style={bookStyles.esimStartOverText}>Start over</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── Custom tab bar: iOS only (Android uses a manual top bar) ── */
function CustomTabBar(props) {
  if (Platform.OS === 'android') {
    return <View style={{ height: 0 }} />;
  }
  return <BottomTabBar {...props} />;
}

// Screens
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
import HelpSupportScreen from "../screens/HelpSupportScreen";
import BadgesScreen from "../screens/BadgesScreen";
import BookingsScreen from "../screens/BookingsScreen";
import TravelToolsScreen from "../screens/TravelToolsScreen";
import MoreScreen from "../screens/MoreScreen";
import BudgetScreen from "../screens/BudgetScreen";
import CurrencyExchangeScreen from "../screens/CurrencyExchangeScreen";
import PackingListScreen from "../screens/PackingListScreen";
import TimeZonesScreen from "../screens/TimeZonesScreen";
import TippingGuideScreen from "../screens/TippingGuideScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

/* ── Tab dropdown items ── */
const BOOK_ITEMS_DROPDOWN = [
  { label: "Cruises",     url: "https://www.cruisedirect.com/?utm_source=cj&utm_medium=affiliate&utm_content=101693012" },
  { label: "Flights",     url: "https://tidd.ly/4uqgGmU" },
  { label: "eSIMs",       isEsim: true },
  { label: "Rental Cars", url: "https://www.rentalcars.com/?aw_affid=2773070&source=aw" },
];

const TOOLS_ITEMS = [
  { label: "Budget",           screen: SCREENS.BUDGET },
  { label: "Currency Exchange", screen: SCREENS.CURRENCY_EXCHANGE },
  { label: "Packing List",     screen: SCREENS.PACKING_LIST },
  { label: "Time Zones",       screen: SCREENS.TIME_ZONES },
  { label: "Tipping Guide",    screen: SCREENS.TIPPING_GUIDE },
];

/* ── Bottom-sheet dropdown shown when Book / Tools tab is tapped ── */
function TabDropdownSheet({ visible, title, items, onClose, isAuthenticated, androidTop, onEsimOpen }) {
  if (!visible) return null;

  const handleItem = (item) => {
    onClose();
    if (item.isEsim) {
      onEsimOpen && onEsimOpen();
      return;
    }
    if (item.url) {
      Linking.openURL(item.url);
      return;
    }
    if (!navigationRef.isReady()) return;
    if (!isAuthenticated) {
      navigationRef.navigate("Landing", { screen: SCREENS.SIGNIN });
      return;
    }
    if (item.tab) {
      navigationRef.navigate(item.tab);
    } else {
      navigationRef.navigate("TravelTools", { screen: item.screen });
    }
  };

  const sheetContent = (
    <View style={sheetStyles.header}>
      <Text style={sheetStyles.title}>{title}</Text>
      <TouchableOpacity onPress={onClose}>
        <Text style={sheetStyles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  /* Android: render inline (no Modal) so coordinates match the onLayout root View */
  if (Platform.OS === 'android') {
    return (
      <>
        <TouchableOpacity
          style={sheetStyles.androidBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <AnimatedSheet style={[sheetStyles.sheet, { position: 'absolute', top: androidTop, bottom: undefined, right: scaleSpacing(12), zIndex: 100 }]}>
          {sheetContent}
          {items.map((item) => (
            <TouchableOpacity key={item.label} style={sheetStyles.item} onPress={() => handleItem(item)} activeOpacity={0.7}>
              <Text style={sheetStyles.itemText}>{item.label}</Text>
              <Text style={sheetStyles.itemArrow}>{item.url ? "↗" : "›"}</Text>
            </TouchableOpacity>
          ))}
        </AnimatedSheet>
      </>
    );
  }

  /* iOS: use Modal */
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <AnimatedSheet style={sheetStyles.sheet}>
          {sheetContent}
          {items.map((item) => (
            <TouchableOpacity key={item.label} style={sheetStyles.item} onPress={() => handleItem(item)} activeOpacity={0.7}>
              <Text style={sheetStyles.itemText}>{item.label}</Text>
              <Text style={sheetStyles.itemArrow}>{item.url ? "↗" : "›"}</Text>
            </TouchableOpacity>
          ))}
        </AnimatedSheet>
      </View>
    </Modal>
  );
}

/* ── Shared header style for dark theme ── */
const darkHeader = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.foreground,
  headerTitleStyle: { fontWeight: "600", fontSize: scaleFontSize(17) },
  headerBackTitleVisible: false,
  headerShadowVisible: false,
};

/* ── Animated tab item (Android custom bar) ── */
function AnimatedTabItem({ children, onPress, style }) {
  const scale     = useRef(new Animated.Value(1)).current;
  const highlight = useRef(new Animated.Value(0)).current;

  const pressIn = () => Animated.parallel([
    Animated.spring(scale,     { toValue: 0.82, useNativeDriver: true, speed: 60, bounciness: 0 }),
    Animated.timing(highlight, { toValue: 1,    useNativeDriver: true, duration: 60 }),
  ]).start();

  const pressOut = () => Animated.parallel([
    Animated.spring(scale,     { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }),
    Animated.timing(highlight, { toValue: 0, useNativeDriver: true, duration: 280 }),
  ]).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={style}>
      <Animated.View style={{ transform: [{ scale }], flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.primary, opacity: highlight, borderRadius: scaleFontSize(10), margin: 4 }]} />
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* ── Animated tab button (iOS custom tabBarButton) ── */
function AnimatedTabButton({ children, style, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 18, bounciness: 12 }).start();
  return (
    <Pressable style={style} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={{ transform: [{ scale }], flex: 1 }}>{children}</Animated.View>
    </Pressable>
  );
}

/* ── Animated dropdown panel (slide-down + fade) ── */
function AnimatedSheet({ style, children }) {
  const slideY  = useRef(new Animated.Value(-10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 180 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { transform: [{ translateY: slideY }], opacity }]}>
      {children}
    </Animated.View>
  );
}

/* ── Tab icon ── */
function TabIcon({ icon, label, focused }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>{icon}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  );
}

function LogoTabIcon({ focused }) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.logoBox, focused && tabStyles.logoBoxFocused]}>
        <Image
          source={require("../../assets/logo.png")}
          style={tabStyles.logoImg}
          resizeMode="contain"
        />
      </View>
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>Home</Text>
    </View>
  );
}

/* ════════════════════════════════════════
   STACKS (each tab gets its own stack so
   the dark header + back button works)
   ════════════════════════════════════════ */

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ ...darkHeader, animation: "slide_from_right" }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.TRIP_DETAIL} component={TripDetailScreen} options={{ title: "Trip Details" }} />
      <Stack.Screen name={SCREENS.SUBSCRIBE}   component={SubscribeScreen}  options={{ title: "Subscribe" }} />
      <Stack.Screen name={SCREENS.PRIVACY}     component={PrivacyScreen}    options={{ title: "Privacy Policy" }} />
      <Stack.Screen name={SCREENS.TERMS}       component={TermsScreen}      options={{ title: "Terms of Service" }} />
    </Stack.Navigator>
  );
}

function TripsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...darkHeader, animation: "slide_from_right" }}>
      <Stack.Screen name="TripsMain"           component={TripsScreen}      options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.TRIP_DETAIL} component={TripDetailScreen} options={{ title: "Trip Details" }} />
      <Stack.Screen name={SCREENS.REVIEWS}     component={ReviewsScreen}    options={{ title: "Reviews" }} />
      <Stack.Screen name={SCREENS.BOOKINGS}    component={BookingsScreen}   options={{ title: "Bookings" }} />
    </Stack.Navigator>
  );
}

function ReviewsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...darkHeader, animation: "slide_from_right" }}>
      <Stack.Screen name="ReviewsMain"     component={GlobalReviewsScreen} options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.REVIEWS} component={ReviewsScreen}       options={{ title: "Reviews" }} />
    </Stack.Navigator>
  );
}

function AchievementsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...darkHeader, animation: "slide_from_right" }}>
      <Stack.Screen name="AchievementsMain" component={BadgesScreen} options={{ title: "Achievements" }} />
    </Stack.Navigator>
  );
}

function TravelToolsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...darkHeader, animation: "slide_from_right" }}>
      <Stack.Screen name="TravelToolsMain"          component={TravelToolsScreen}     options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.BUDGET}            component={BudgetScreen}          options={{ title: "Budget" }} />
      <Stack.Screen name={SCREENS.CURRENCY_EXCHANGE} component={CurrencyExchangeScreen} options={{ title: "Currency Exchange" }} />
      <Stack.Screen name={SCREENS.PACKING_LIST}      component={PackingListScreen}     options={{ title: "Packing List" }} />
      <Stack.Screen name={SCREENS.TIME_ZONES}        component={TimeZonesScreen}       options={{ title: "Time Zones" }} />
      <Stack.Screen name={SCREENS.TIPPING_GUIDE}     component={TippingGuideScreen}    options={{ title: "Tipping Guide" }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ ...darkHeader, animation: "slide_from_right" }}>
      <Stack.Screen name="MoreMain"                component={MoreScreen}           options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.BADGES}          component={BadgesScreen}         options={{ title: "My Badges" }} />
      <Stack.Screen name={SCREENS.BOOKINGS}        component={BookingsScreen}       options={{ title: "Bookings" }} />
      <Stack.Screen name={SCREENS.BUDGET}          component={BudgetScreen}         options={{ title: "Budget" }} />
      <Stack.Screen name={SCREENS.CURRENCY_EXCHANGE} component={CurrencyExchangeScreen} options={{ title: "Currency Exchange" }} />
      <Stack.Screen name={SCREENS.PACKING_LIST}    component={PackingListScreen}    options={{ title: "Packing List" }} />
      <Stack.Screen name={SCREENS.TIME_ZONES}      component={TimeZonesScreen}      options={{ title: "Time Zones" }} />
      <Stack.Screen name={SCREENS.TIPPING_GUIDE}   component={TippingGuideScreen}   options={{ title: "Tipping Guide" }} />
      <Stack.Screen name={SCREENS.FAQS}            component={FAQsScreen}           options={{ title: "FAQs" }} />
      <Stack.Screen name={SCREENS.TUTORIALS}       component={TutorialsScreen}      options={{ title: "Tutorials" }} />
      <Stack.Screen name={SCREENS.HELP_SUPPORT}    component={HelpSupportScreen}    options={{ title: "Help & Support" }} />
      <Stack.Screen name={SCREENS.PRIVACY}         component={PrivacyScreen}        options={{ title: "Privacy Policy" }} />
      <Stack.Screen name={SCREENS.TERMS}           component={TermsScreen}          options={{ title: "Terms of Service" }} />
      <Stack.Screen name={SCREENS.PROFILE}         component={ProfileScreen}        options={{ title: "Profile" }} />
      <Stack.Screen name={SCREENS.SUBSCRIBE}       component={SubscribeScreen}      options={{ title: "Subscribe" }} />
    </Stack.Navigator>
  );
}

/* ── Authenticated tab navigator ── */
function AuthenticatedTabs() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [androidNavHeight, setAndroidNavHeight] = useState(80);
  const [esimOpen, setEsimOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    return navigationRef.addListener('state', () => {
      const state = navigationRef.getState();
      if (state?.index !== undefined) setActiveTabIndex(state.index);
    });
  }, []);

  const androidTabs = [
    { name: SCREENS.HOME,           icon: (f) => <LogoTabIcon focused={f} />,                        onPress: () => navigationRef.navigate(SCREENS.HOME) },
    { name: SCREENS.TRIPS,          icon: (f) => <TabIcon icon="✈️" label="Trips" focused={f} />,    onPress: () => navigationRef.navigate(SCREENS.TRIPS) },
    { name: 'Achievements',         icon: (f) => <TabIcon icon="🎫" label="Book" focused={f} />,     onPress: () => setActiveDropdown('book') },
    { name: SCREENS.GLOBAL_REVIEWS, icon: (f) => <TabIcon icon="⭐" label="Reviews" focused={f} />,  onPress: () => navigationRef.navigate(SCREENS.GLOBAL_REVIEWS) },
    { name: 'TravelTools',          icon: (f) => <TabIcon icon="🧳" label="Tools" focused={f} />,    onPress: () => setActiveDropdown('tools') },
    { name: 'More',                 icon: (f) => <TabIcon icon="☰" label="More" focused={f} />,      onPress: () => setDrawerVisible(true) },
  ];

  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'android' && (
        <View>
          <View
            style={[tabStyles.tabBar, tabStyles.androidTabBar]}
            onLayout={(e) => setAndroidNavHeight(e.nativeEvent.layout.height)}
          >
            {androidTabs.map((tab, i) => (
              <AnimatedTabItem
                key={tab.name}
                style={tabStyles.androidTabItem}
                onPress={tab.onPress}
              >
                {tab.icon(activeTabIndex === i)}
              </AnimatedTabItem>
            ))}
          </View>
        </View>
      )}

      <Tab.Navigator
        tabBar={(props) => Platform.OS === 'android'
          ? <View style={{ height: 0 }} />
          : <CustomTabBar {...props} />
        }
        screenOptions={{
          headerShown: false,
          tabBarStyle: tabStyles.tabBar,
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name={SCREENS.HOME}
          component={HomeStack}
          options={{ tabBarIcon: ({ focused }) => <LogoTabIcon focused={focused} /> }}
        />
        <Tab.Screen
          name={SCREENS.TRIPS}
          component={TripsStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon icon="✈️" label="Trips" focused={focused} /> }}
        />
        <Tab.Screen
          name="Achievements"
          component={AchievementsStack}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon="🎫" label="Book" focused={focused} />,
            tabBarButton: ({ children, style }) => (
              <AnimatedTabButton style={style} onPress={() => setActiveDropdown("book")}>
                {children}
              </AnimatedTabButton>
            ),
          }}
        />
        <Tab.Screen
          name={SCREENS.GLOBAL_REVIEWS}
          component={ReviewsStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⭐" label="Reviews" focused={focused} /> }}
        />
        <Tab.Screen
          name="TravelTools"
          component={TravelToolsStack}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon="🧳" label="Tools" focused={focused} />,
            tabBarButton: ({ children, style }) => (
              <AnimatedTabButton style={style} onPress={() => setActiveDropdown("tools")}>
                {children}
              </AnimatedTabButton>
            ),
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreStack}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon="☰" label="More" focused={focused} />,
            tabBarButton: ({ children, style }) => (
              <AnimatedTabButton style={style} onPress={() => setDrawerVisible(true)}>
                {children}
              </AnimatedTabButton>
            ),
          }}
        />
      </Tab.Navigator>

      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <TabDropdownSheet
        visible={activeDropdown === "book"}
        title="Book Your Trip"
        items={BOOK_ITEMS_DROPDOWN}
        onClose={() => setActiveDropdown(null)}
        isAuthenticated
        androidTop={androidNavHeight}
        onEsimOpen={() => setEsimOpen(true)}
      />
      <TabDropdownSheet
        visible={activeDropdown === "tools"}
        title="Travel Tools"
        items={TOOLS_ITEMS}
        onClose={() => setActiveDropdown(null)}
        isAuthenticated
        androidTop={androidNavHeight}
      />
      {esimOpen && <EsimQuizModal onClose={() => setEsimOpen(false)} />}
    </View>
  );
}

/* ── Unauthenticated landing stack (used as Home tab) ── */
function LandingStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen name="LandingMain"          component={LandingScreen}    options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.SIGNIN}       component={SigninScreen}     options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.SIGNUP}       component={SignupScreen}     options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.FAQS}         component={FAQsScreen}       options={{ title: "FAQs",             ...darkHeader }} />
      <Stack.Screen name={SCREENS.TUTORIALS}    component={TutorialsScreen}  options={{ title: "Tutorials",        ...darkHeader }} />
      <Stack.Screen name={SCREENS.PRIVACY}      component={PrivacyScreen}    options={{ title: "Privacy Policy",   ...darkHeader }} />
      <Stack.Screen name={SCREENS.TERMS}        component={TermsScreen}      options={{ title: "Terms of Service", ...darkHeader }} />
      <Stack.Screen name={SCREENS.HELP_SUPPORT} component={HelpSupportScreen}options={{ title: "Help & Support",   ...darkHeader }} />
    </Stack.Navigator>
  );
}

/* ── Guest More stack — shows nav links without requiring login ── */
function GuestMoreStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen name="GuestMoreMain"        component={MoreScreen}       options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.SIGNIN}       component={SigninScreen}     options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.SIGNUP}       component={SignupScreen}     options={{ headerShown: false }} />
      <Stack.Screen name={SCREENS.FAQS}         component={FAQsScreen}       options={{ title: "FAQs",             ...darkHeader }} />
      <Stack.Screen name={SCREENS.TUTORIALS}    component={TutorialsScreen}  options={{ title: "Tutorials",        ...darkHeader }} />
      <Stack.Screen name={SCREENS.HELP_SUPPORT} component={HelpSupportScreen}options={{ title: "Help & Support",   ...darkHeader }} />
      <Stack.Screen name={SCREENS.PRIVACY}      component={PrivacyScreen}    options={{ title: "Privacy Policy",   ...darkHeader }} />
      <Stack.Screen name={SCREENS.TERMS}        component={TermsScreen}      options={{ title: "Terms of Service", ...darkHeader }} />
    </Stack.Navigator>
  );
}

/* ── Unauthenticated tab navigator ── */
function UnauthenticatedTabs() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [androidNavHeight, setAndroidNavHeight] = useState(80);
  const [esimOpen, setEsimOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    return navigationRef.addListener('state', () => {
      const state = navigationRef.getState();
      if (state?.index !== undefined) setActiveTabIndex(state.index);
    });
  }, []);

  const redirectToSignIn = ({ navigation }) => ({
    tabPress: (e) => {
      e.preventDefault();
      navigation.navigate("Landing", { screen: SCREENS.SIGNIN });
    },
  });

  const goToSignIn = () => navigationRef.navigate("Landing", { screen: SCREENS.SIGNIN });

  const androidTabs = [
    { name: 'Landing',         icon: (f) => <LogoTabIcon focused={f} />,                        onPress: () => navigationRef.navigate('Landing', { screen: 'LandingMain' }) },
    { name: 'TripsTab',        icon: (f) => <TabIcon icon="✈️" label="Trips" focused={f} />,    onPress: goToSignIn },
    { name: 'AchievementsTab', icon: (f) => <TabIcon icon="🎫" label="Book" focused={f} />,     onPress: () => setActiveDropdown('book') },
    { name: 'ReviewsTab',      icon: (f) => <TabIcon icon="⭐" label="Reviews" focused={f} />,  onPress: goToSignIn },
    { name: 'ToolsTab',        icon: (f) => <TabIcon icon="🧳" label="Tools" focused={f} />,    onPress: () => setActiveDropdown('tools') },
    { name: 'MoreTab',         icon: (f) => <TabIcon icon="☰" label="More" focused={f} />,      onPress: () => setDrawerVisible(true) },
  ];

  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'android' && (
        <View>
          <View
            style={[tabStyles.tabBar, tabStyles.androidTabBar]}
            onLayout={(e) => setAndroidNavHeight(e.nativeEvent.layout.height)}
          >
            {androidTabs.map((tab, i) => (
              <AnimatedTabItem
                key={tab.name}
                style={tabStyles.androidTabItem}
                onPress={tab.onPress}
              >
                {tab.icon(activeTabIndex === i)}
              </AnimatedTabItem>
            ))}
          </View>
        </View>
      )}

      <Tab.Navigator
        tabBar={(props) => Platform.OS === 'android'
          ? <View style={{ height: 0 }} />
          : <CustomTabBar {...props} />
        }
        screenOptions={{
          headerShown: false,
          tabBarStyle: tabStyles.tabBar,
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Landing"
          component={LandingStack}
          options={{ tabBarIcon: ({ focused }) => <LogoTabIcon focused={focused} /> }}
        />
        <Tab.Screen
          name="TripsTab"
          component={LandingStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon icon="✈️" label="Trips" focused={focused} /> }}
          listeners={redirectToSignIn}
        />
        <Tab.Screen
          name="AchievementsTab"
          component={LandingStack}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon="🎫" label="Book" focused={focused} />,
            tabBarButton: ({ children, style }) => (
              <AnimatedTabButton style={style} onPress={() => setActiveDropdown("book")}>
                {children}
              </AnimatedTabButton>
            ),
          }}
        />
        <Tab.Screen
          name="ReviewsTab"
          component={LandingStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⭐" label="Reviews" focused={focused} /> }}
          listeners={redirectToSignIn}
        />
        <Tab.Screen
          name="ToolsTab"
          component={LandingStack}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon="🧳" label="Tools" focused={focused} />,
            tabBarButton: ({ children, style }) => (
              <AnimatedTabButton style={style} onPress={() => setActiveDropdown("tools")}>
                {children}
              </AnimatedTabButton>
            ),
          }}
        />
        <Tab.Screen
          name="MoreTab"
          component={GuestMoreStack}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon="☰" label="More" focused={focused} />,
            tabBarButton: ({ children, style }) => (
              <AnimatedTabButton style={style} onPress={() => setDrawerVisible(true)}>
                {children}
              </AnimatedTabButton>
            ),
          }}
        />
      </Tab.Navigator>

      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <TabDropdownSheet
        visible={activeDropdown === "book"}
        title="Book Your Trip"
        items={BOOK_ITEMS_DROPDOWN}
        onClose={() => setActiveDropdown(null)}
        isAuthenticated={false}
        androidTop={androidNavHeight}
        onEsimOpen={() => setEsimOpen(true)}
      />
      <TabDropdownSheet
        visible={activeDropdown === "tools"}
        title="Travel Tools"
        items={TOOLS_ITEMS}
        onClose={() => setActiveDropdown(null)}
        isAuthenticated={false}
        androidTop={androidNavHeight}
      />
      {esimOpen && <EsimQuizModal onClose={() => setEsimOpen(false)} />}
    </View>
  );
}

/* ── Root ── */
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return user ? <AuthenticatedTabs /> : <UnauthenticatedTabs />;
}

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}

/* ── Tab bar styles ── */
const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: isTablet ? 110 : 80,
    paddingBottom: isTablet ? 36 : 18,
    paddingTop: isTablet ? 10 : 8,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: isTablet ? 70 : 54,
  },
  icon: {
    fontSize: isTablet ? 26 : 21,
    opacity: 0.8,
    color: COLORS.foreground,
  },
  iconFocused: {
    opacity: 1,
  },
  label: {
    fontSize: isTablet ? 13 : 9,
    color: COLORS.muted,
    marginTop: isTablet ? 4 : 2,
    textAlign: "center",
  },
  labelFocused: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  logoBox: {
    backgroundColor: "#fff",
    borderRadius: isTablet ? 10 : 6,
    padding: isTablet ? 5 : 3,
    opacity: 0.55,
  },
  logoBoxFocused: {
    opacity: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logoImg: {
    width: isTablet ? 30 : 22,
    height: isTablet ? 30 : 22,
  },
  androidTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: isTablet ? 28 : 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  androidTabBar: {
    flexDirection: 'row',
    paddingTop: StatusBar.currentHeight || 24,
    paddingBottom: 0,
  },
});

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
  },
});

/* ── Book Your Trip bar styles ── */
const bookStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1d2d3a",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(12),
    paddingVertical: scaleSpacing(7),
    gap: scaleSpacing(8),
  },
  label: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(4), paddingRight: scaleSpacing(4) },
  flash: { fontSize: scaleFontSize(12) },
  labelText: { fontSize: scaleFontSize(10), fontWeight: "800", color: COLORS.primary, letterSpacing: 0.7 },
  sep: { width: 1, height: scaleFontSize(18), backgroundColor: COLORS.border, marginRight: scaleSpacing(4) },
  btn: {
    flexDirection: "row", alignItems: "center", gap: scaleSpacing(5),
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: `${COLORS.primary}50`,
    paddingHorizontal: scaleSpacing(10), paddingVertical: scaleSpacing(5), borderRadius: scaleFontSize(20),
  },
  btnIcon: { fontSize: scaleFontSize(12) },
  btnText: { fontSize: scaleFontSize(12), fontWeight: "600", color: COLORS.foreground },
  closeBtn: { paddingHorizontal: scaleSpacing(10), paddingVertical: scaleSpacing(8) },
  closeText: { fontSize: scaleFontSize(13), color: COLORS.muted },
  disclaimer: {
    fontSize: scaleFontSize(10), color: COLORS.muted,
    backgroundColor: "#1d2d3a",
    paddingHorizontal: scaleSpacing(12), paddingBottom: scaleSpacing(5),
  },
  collapsedStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleSpacing(5),
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: scaleSpacing(5),
  },
  collapsedStripAndroid: {
    borderTopWidth: 0,
  },
  collapsedChevron: {
    fontSize: scaleFontSize(10),
    color: COLORS.muted,
  },
  collapsedText: {
    fontSize: scaleFontSize(11),
    color: COLORS.muted,
    fontWeight: "500",
  },
  /* eSIM Quiz */
  esimOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: scaleSpacing(16) },
  esimCard: { width: "100%", maxWidth: 400, backgroundColor: COLORS.background, borderRadius: scaleFontSize(20), borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  esimHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scaleSpacing(16), paddingVertical: scaleSpacing(14), borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  esimTitle: { fontSize: scaleFontSize(16), fontWeight: "700", color: COLORS.foreground },
  esimClose: { fontSize: scaleFontSize(14), color: COLORS.muted },
  esimBody: { alignItems: "center", paddingHorizontal: scaleSpacing(20), paddingVertical: scaleSpacing(28), gap: scaleSpacing(14) },
  esimCounter: { fontSize: scaleFontSize(11), fontWeight: "700", color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.8 },
  esimQuestion: { fontSize: scaleFontSize(17), fontWeight: "600", color: COLORS.foreground, textAlign: "center", lineHeight: scaleFontSize(24) },
  esimOptions: { width: "100%", gap: scaleSpacing(10), marginTop: scaleSpacing(4) },
  esimOptionBtn: { backgroundColor: COLORS.primary, borderRadius: scaleFontSize(12), paddingVertical: scaleSpacing(13), alignItems: "center" },
  esimOptionText: { fontSize: scaleFontSize(15), fontWeight: "600", color: "#fff" },
  esimStartOver: { paddingVertical: scaleSpacing(4) },
  esimStartOverText: { fontSize: scaleFontSize(13), color: COLORS.primary },
  esimResultIcon: { width: scaleFontSize(64), height: scaleFontSize(64), borderRadius: scaleFontSize(32), backgroundColor: `${COLORS.primary}22`, alignItems: "center", justifyContent: "center" },
  esimRecommendLabel: { fontSize: scaleFontSize(13), color: COLORS.muted },
  esimProviderName: { fontSize: scaleFontSize(24), fontWeight: "700", color: COLORS.foreground },
  esimProviderBest: { fontSize: scaleFontSize(13), color: COLORS.muted },
  esimVisitBtn: { backgroundColor: COLORS.primary, borderRadius: scaleFontSize(12), paddingVertical: scaleSpacing(13), paddingHorizontal: scaleSpacing(28), marginTop: scaleSpacing(4) },
  esimVisitBtnText: { fontSize: scaleFontSize(16), fontWeight: "700", color: "#fff" },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  androidBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  sheet: {
    position: "absolute",
    bottom: isTablet ? 110 : 80,
    right: scaleSpacing(12),
    width: scaleSpacing(220),
    backgroundColor: COLORS.background,
    borderRadius: scaleFontSize(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(14),
    paddingVertical: scaleSpacing(11),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: scaleFontSize(13),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  closeIcon: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(14),
    paddingVertical: scaleSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}88`,
  },
  itemText: {
    fontSize: scaleFontSize(13),
    color: COLORS.foreground,
    fontWeight: "500",
  },
  itemArrow: {
    fontSize: scaleFontSize(15),
    color: COLORS.muted,
  },
});
