import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Observe, useObserve } from "expo-observe";
import { useBank } from "../context/BankContext";
import { appVersion, useAppUpdates } from "../context/UpdatesContext";
import { colors } from "../theme";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import TransferScreen from "../screens/TransferScreen";
import TransferConfirmScreen from "../screens/TransferConfirmScreen";
import HistoryScreen from "../screens/HistoryScreen";
import TransactionDetailScreen from "../screens/TransactionDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";

const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const TransferStack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

const navigationRef = createNavigationContainerRef();

// Name of the deepest focused screen, e.g. "TransferConfirm".
function currentRouteName() {
  return navigationRef.getCurrentRoute()?.name;
}

function TransferNavigator() {
  return (
    <TransferStack.Navigator>
      <TransferStack.Screen
        name="TransferForm"
        component={TransferScreen}
        options={{ title: "Send money" }}
      />
      <TransferStack.Screen
        name="TransferConfirm"
        component={TransferConfirmScreen}
        options={{ title: "Confirm transfer" }}
      />
    </TransferStack.Navigator>
  );
}

const TAB_ICONS = { Home: "⌂", Transfer: "⇄", History: "☰", Profile: "☺" };

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tabs.Screen
        name="Transfer"
        component={TransferNavigator}
        options={{ headerShown: false }}
      />
      <Tabs.Screen name="History" component={HistoryScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export default function Navigation() {
  const { hydrated, loggedIn } = useBank();
  const { markInteractive } = useObserve();
  const { currentlyRunning } = useAppUpdates();
  const lastScreen = useRef(null);

  // The app is usable once saved data is restored and the first screen can
  // render: that moment is the app's time to interactive on the Metrics page.
  useEffect(() => {
    if (!hydrated) return;
    markInteractive();
    Observe.logEvent("app_opened", {
      attributes: {
        appVersion,
        source: currentlyRunning.isEmbeddedLaunch ? "embedded" : "ota",
      },
    });
    // Send right away instead of waiting for the library's own flush.
    Observe.dispatchEvents().catch((error) => Observe.reportError(error));
  }, [hydrated]);

  function trackScreen() {
    const name = currentRouteName();
    if (name && name !== lastScreen.current) {
      lastScreen.current = name;
      Observe.logEvent("screen_viewed", { attributes: { screen: name } });
    }
  }

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={trackScreen} onStateChange={trackScreen}>
      <RootStack.Navigator>
        {loggedIn ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <RootStack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ title: "Transaction" }}
            />
          </>
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
