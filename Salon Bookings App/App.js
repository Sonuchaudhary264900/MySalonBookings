import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Dimensions, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

const navigationRef = createNavigationContainerRef();

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

import IntroScreen        from './src/screens/auth/IntroScreen';
import LoginScreen        from './src/screens/auth/LoginScreen';
import RegisterScreen     from './src/screens/auth/RegisterScreen';
import HomeScreen         from './src/screens/main/HomeScreen';
import StyleAIScreen      from './src/screens/main/StyleAIScreen';
import SalonDetailsScreen from './src/screens/main/SalonDetailsScreen';
import BookingScreen      from './src/screens/main/BookingScreen';
import BookingsScreen     from './src/screens/main/BookingsScreen';
import FavoritesScreen    from './src/screens/main/FavoritesScreen';
import ProfileScreen        from './src/screens/main/ProfileScreen';
import SettingsScreen       from './src/screens/main/SettingsScreen';
import NotificationsScreen  from './src/screens/main/NotificationsScreen';
import ReferAndEarnScreen   from './src/screens/main/ReferAndEarnScreen';
import LegalScreen          from './src/screens/legal/LegalScreen';

const RootStack   = createNativeStackNavigator();
const AuthStack   = createNativeStackNavigator();
const Tab         = createMaterialTopTabNavigator();
const HomeStack   = createNativeStackNavigator();
const BookStack   = createNativeStackNavigator();
const FavStack    = createNativeStackNavigator();
const SetgStack   = createNativeStackNavigator();
const StyleAIStack = createNativeStackNavigator();


// ── Stack navigators ─────────────────────────────────────────────
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain"       component={HomeScreen} />
      <HomeStack.Screen name="SalonDetails"   component={SalonDetailsScreen} />
      <HomeStack.Screen name="Booking"        component={BookingScreen} />
      <HomeStack.Screen name="Notifications"  component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

function BookingsStackNav() {
  return (
    <BookStack.Navigator screenOptions={{ headerShown: false }}>
      <BookStack.Screen name="MyBookings" component={BookingsScreen} />
    </BookStack.Navigator>
  );
}

function FavoritesStackNav() {
  return (
    <FavStack.Navigator screenOptions={{ headerShown: false }}>
      <FavStack.Screen name="FavMain"      component={FavoritesScreen} />
      <FavStack.Screen name="SalonDetails" component={SalonDetailsScreen} />
      <FavStack.Screen name="Booking"      component={BookingScreen} />
    </FavStack.Navigator>
  );
}

function SettingsStackNav() {
  return (
    <SetgStack.Navigator screenOptions={{ headerShown: false }}>
      <SetgStack.Screen name="SettingsMain"  component={SettingsScreen} />
      <SetgStack.Screen name="Profile"       component={ProfileScreen} />
      <SetgStack.Screen name="ReferAndEarn"  component={ReferAndEarnScreen} />
      <SetgStack.Screen name="Legal"         component={LegalScreen} />
    </SetgStack.Navigator>
  );
}

function StyleAIStackNav() {
  return (
    <StyleAIStack.Navigator screenOptions={{ headerShown: false }}>
      <StyleAIStack.Screen name="StyleAIMain" component={StyleAIScreen} />
    </StyleAIStack.Navigator>
  );
}

// ── Custom bottom tab bar (icons + labels rendered properly) ──────
const TAB_ICONS = {
  HomeTab:      ['home',         'home-outline'],
  StyleAITab:   ['sparkles',     'sparkles-outline'],
  BookingsTab:  ['calendar',     'calendar-outline'],
  FavoritesTab: ['heart',        'heart-outline'],
  SettingsTab:  ['settings',     'settings-outline'],
};

function CustomTabBar({ state, navigation }) {
  const { theme } = useTheme();
  const { t }     = useLanguage();
  const labels    = {
    HomeTab:      t('tabHome'),
    StyleAITab:   t('tabStyleAI'),
    BookingsTab:  t('tabBookings'),
    FavoritesTab: t('tabFavorites'),
    SettingsTab:  t('tabSettings'),
  };
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      height: 62,
      elevation: 8,
      shadowOpacity: 0.08,
    }}>
      {state.routes.map((route, index) => {
        const focused  = state.index === index;
        const color    = focused ? theme.accent : theme.subText;
        const [activeIcon, inactiveIcon] = TAB_ICONS[route.name] || ['ellipse', 'ellipse-outline'];
        return (
          <TouchableOpacity
            key={route.key}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            <Ionicons name={focused ? activeIcon : inactiveIcon} size={22} color={color} />
            <Text style={{ fontSize: 11, fontWeight: '600', color, marginTop: 2 }}>
              {labels[route.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Tab Navigator with swipe support ─────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        tabBarIndicatorStyle: { height: 0 },
      }}
    >
      <Tab.Screen name="HomeTab"      component={HomeStackNav} />
      <Tab.Screen name="StyleAITab"   component={StyleAIStackNav} />
      <Tab.Screen name="BookingsTab"  component={BookingsStackNav} />
      <Tab.Screen name="FavoritesTab" component={FavoritesStackNav} />
      <Tab.Screen name="SettingsTab"  component={SettingsStackNav} />
    </Tab.Navigator>
  );
}


// ── Auth navigator ────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Intro"             component={IntroScreen} />
      <AuthStack.Screen name="Login"             component={LoginScreen} />
      <AuthStack.Screen name="Register"          component={RegisterScreen} />
      <AuthStack.Screen name="GuestHome"         component={HomeScreen} />
      <AuthStack.Screen name="GuestSalonDetails" component={SalonDetailsScreen} />
    </AuthStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const prevIsAuth = useRef(false);

  // After login: if a pending booking was saved while browsing as guest,
  // navigate to BookingScreen once the Auth→Main transition animation finishes.
  useEffect(() => {
    if (!isAuthenticated || prevIsAuth.current) {
      prevIsAuth.current = isAuthenticated;
      return;
    }
    prevIsAuth.current = true;
    AsyncStorage.getItem('pendingBooking').then(raw => {
      if (!raw) return;
      AsyncStorage.removeItem('pendingBooking');
      const { salonId, serviceIds } = JSON.parse(raw);
      InteractionManager.runAfterInteractions(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Main', {
            screen: 'HomeTab',
            params: { screen: 'Booking', params: { salonId, serviceIds } },
          });
        }
      });
    }).catch(() => {});
  }, [isAuthenticated]);

  // Navigate to Bookings tab when user taps a review_prompt push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'review_prompt' && navigationRef.isReady()) {
        navigationRef.navigate('Main', { screen: 'BookingsTab' });
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <Image source={require('./assets/Icon-1024.png')} style={styles.splashLogoImg} resizeMode="contain" />
        <View style={styles.splashBottom}>
          <Text style={styles.splashTitle}>My Salon Bookings</Text>
          <Text style={styles.splashSubtitle}>Discover salons, book appointments{'\n'}and manage your beauty routine</Text>
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function ThemedApp() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <ThemedApp />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const { height: SCREEN_H } = Dimensions.get('window');
const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  splashLogoImg: { width: '100%', height: SCREEN_H * 0.40, alignSelf: 'center' },
  splashBottom: { paddingHorizontal: 28, paddingBottom: 40, gap: 8, marginTop: 16 },
  splashTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  splashSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});

