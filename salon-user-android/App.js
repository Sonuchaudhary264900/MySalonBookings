import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';

import IntroScreen        from './src/screens/auth/IntroScreen';
import LoginScreen        from './src/screens/auth/LoginScreen';
import RegisterScreen     from './src/screens/auth/RegisterScreen';
import HomeScreen         from './src/screens/main/HomeScreen';
import SalonDetailsScreen from './src/screens/main/SalonDetailsScreen';
import BookingScreen      from './src/screens/main/BookingScreen';
import BookingsScreen     from './src/screens/main/BookingsScreen';
import FavoritesScreen    from './src/screens/main/FavoritesScreen';
import ProfileScreen        from './src/screens/main/ProfileScreen';
import SettingsScreen       from './src/screens/main/SettingsScreen';
import NotificationsScreen  from './src/screens/main/NotificationsScreen';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const BookStack = createNativeStackNavigator();
const FavStack  = createNativeStackNavigator();
const SetgStack = createNativeStackNavigator();
const Drawer    = createDrawerNavigator();

// ── Nav items for drawer ─────────────────────────────────────────
const NAV_ITEMS = [
  { tab: 'HomeTab',          label: 'Home',           icon: 'home-outline',              iconFocused: 'home' },
  { tab: 'BookingsTab',      label: 'Bookings',       icon: 'calendar-outline',          iconFocused: 'calendar' },
  { tab: 'FavoritesTab',     label: 'Favorites',      icon: 'heart-outline',             iconFocused: 'heart' },
  { tab: 'NotificationsNav', label: 'Notifications',  icon: 'notifications-outline',     iconFocused: 'notifications', isNotif: true },
  { tab: 'SettingsTab',      label: 'Settings',       icon: 'settings-outline',          iconFocused: 'settings' },
];

// ── Custom Drawer — dark sidebar matching owner app ──────────────
function CustomDrawer({ navigation: drawerNav }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  // Find which bottom-tab is currently active
  const tabNav = drawerNav.getState()?.routes?.[0]?.state;
  const activeTabIndex = tabNav?.index ?? 0;
  const activeTabName  = tabNav?.routeNames?.[activeTabIndex] ?? 'HomeTab';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const goToTab = (item) => {
    drawerNav.closeDrawer();
    if (item.isNotif) {
      drawerNav.navigate('Tabs', { screen: 'HomeTab', params: { screen: 'Notifications' } });
    } else {
      drawerNav.navigate('Tabs', { screen: item.tab });
    }
  };

  return (
    <View style={[dStyles.container, { paddingTop: insets.top }]}>
      {/* Brand header */}
      <View style={dStyles.brand}>
        <View style={dStyles.brandIcon}>
          <Image source={require('./assets/icon1.png')} style={dStyles.brandIconImg} resizeMode="contain" />
        </View>
        <View>
          <Text style={dStyles.brandName}>My Salon Bookings</Text>
          <Text style={dStyles.brandSub}>Customer App</Text>
        </View>
      </View>

      {/* User card */}
      <View style={dStyles.userCard}>
        {user?.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={dStyles.avatarImg} />
        ) : (
          <View style={dStyles.avatar}>
            <Text style={dStyles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={dStyles.userName}>{user?.name || 'Guest'}</Text>
          <Text style={dStyles.userPhone}>{user?.phone || 'Not signed in'}</Text>
        </View>
      </View>

      <View style={dStyles.divider} />

      {/* Nav items */}
      <DrawerContentScrollView scrollEnabled={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={dStyles.nav}>
          {NAV_ITEMS.map((item) => {
            const focused = activeTabName === item.tab;
            const badge = item.isNotif ? unreadCount : 0;
            return (
              <TouchableOpacity
                key={item.tab}
                style={[dStyles.navItem, focused && dStyles.navItemActive]}
                onPress={() => goToTab(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={focused ? item.iconFocused : item.icon}
                  size={20}
                  color={focused ? '#fff' : '#9ca3af'}
                />
                <Text style={[dStyles.navLabel, focused && dStyles.navLabelActive]}>
                  {item.label}
                </Text>
                {badge > 0 && (
                  <View style={dStyles.badge}>
                    <Text style={dStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                )}
                {focused && <Ionicons name="chevron-forward" size={14} color="#fff" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Footer — logout */}
      <View style={[dStyles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={dStyles.divider} />
        <TouchableOpacity style={dStyles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#f87171" />
          <Text style={dStyles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={dStyles.version}>My Salon Bookings · User App v1.0</Text>
      </View>
    </View>
  );
}

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
      <SetgStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SetgStack.Screen name="Profile"      component={ProfileScreen} />
    </SetgStack.Navigator>
  );
}

// ── Bottom Tab Navigator ─────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            HomeTab:      focused ? 'home'      : 'home-outline',
            BookingsTab:  focused ? 'calendar'  : 'calendar-outline',
            FavoritesTab: focused ? 'heart'     : 'heart-outline',
            SettingsTab:  focused ? 'settings'  : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"      component={HomeStackNav}      options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="BookingsTab"  component={BookingsStackNav}  options={{ tabBarLabel: 'Bookings' }} />
      <Tab.Screen name="FavoritesTab" component={FavoritesStackNav} options={{ tabBarLabel: 'Favorites' }} />
      <Tab.Screen name="SettingsTab"  component={SettingsStackNav}  options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

// ── Main Drawer wrapping the tab navigator ───────────────────────
function MainDrawer() {
  return (
    <Drawer.Navigator
      id="DrawerNav"
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        drawerStyle: { width: 260, backgroundColor: '#111827' },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEnabled: true,
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}

// ── Auth navigator ────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Intro"    component={IntroScreen} />
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

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
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainDrawer} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar style="light" />
            <RootNavigator />
            <Toast />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#fff' },
  splashLogoImg: { flex: 1, width: '100%' },
  splashBottom: { paddingHorizontal: 28, paddingBottom: 40, gap: 8 },
  splashTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  splashSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});

// ── Drawer styles — dark theme matching owner app ─────────────────
const dStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  brandIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  brandIconImg: { width: 28, height: 28 },
  brandName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  brandSub: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#374151' },
  avatarInitial: { fontSize: 17, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 14, fontWeight: '700', color: '#f9fafb' },
  userPhone: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#1f2937' },
  nav: { paddingHorizontal: 12, paddingVertical: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: '#2563eb' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 'auto' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  footer: { paddingHorizontal: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#f87171' },
  version: { fontSize: 11, color: '#4b5563', paddingBottom: 4 },
});
