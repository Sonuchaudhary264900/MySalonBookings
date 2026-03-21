import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert, Image, Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigationState } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SalonProvider, useSalon } from './src/context/SalonContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { ThemeProvider } from './src/context/ThemeContext';

import IntroScreen             from './src/screens/auth/IntroScreen';
import LoginScreen             from './src/screens/auth/LoginScreen';
import RegisterScreen          from './src/screens/auth/RegisterScreen';
import SalonRegistrationScreen from './src/screens/salon/SalonRegistrationScreen';
import ApprovalWaitingScreen   from './src/screens/salon/ApprovalWaitingScreen';
import HomeScreen              from './src/screens/dashboard/HomeScreen';
import BookingsScreen          from './src/screens/dashboard/BookingsScreen';
import ServicesScreen          from './src/screens/dashboard/ServicesScreen';
import ReportsScreen           from './src/screens/dashboard/ReportsScreen';
import ReviewsScreen           from './src/screens/dashboard/ReviewsScreen';
import NotificationsScreen     from './src/screens/dashboard/NotificationsScreen';
import ProfileScreen           from './src/screens/dashboard/ProfileScreen';
import SettingsScreen          from './src/screens/dashboard/SettingsScreen';
import WorkingHoursScreen      from './src/screens/dashboard/WorkingHoursScreen';
import CalendarScreen          from './src/screens/dashboard/CalendarScreen';
import WalkInBookingScreen     from './src/screens/dashboard/WalkInBookingScreen';
import CustomersScreen         from './src/screens/dashboard/CustomersScreen';
import CouponsScreen           from './src/screens/dashboard/CouponsScreen';
import GalleryScreen           from './src/screens/dashboard/GalleryScreen';

const RootStack  = createNativeStackNavigator();
const AuthStack  = createNativeStackNavigator();
const Drawer     = createDrawerNavigator();
const Tab        = createMaterialTopTabNavigator();

// ── Nav items matching the website sidebar ────────────────────────
const NAV_ITEMS = [
  { name: 'Home',          label: 'Dashboard',     icon: 'home-outline',           iconFocused: 'home' },
  { name: 'Reports',       label: 'Analytics',     icon: 'bar-chart-outline',      iconFocused: 'bar-chart' },
  { name: 'Reviews',       label: 'Reviews',       icon: 'star-outline',           iconFocused: 'star' },
  { name: 'Profile',       label: 'My Profile',    icon: 'person-outline',         iconFocused: 'person' },
  { name: 'Notifications', label: 'Notifications', icon: 'notifications-outline',  iconFocused: 'notifications' },
  { name: 'Calendar',      label: 'Calendar',      icon: 'calendar-clear-outline', iconFocused: 'calendar-clear' },
  { name: 'WorkingHours',  label: 'Working Hours', icon: 'time-outline',           iconFocused: 'time' },
  { name: 'WalkIn',        label: 'Walk-in',       icon: 'walk-outline',           iconFocused: 'walk' },
  { name: 'Customers',     label: 'Customers',     icon: 'people-outline',         iconFocused: 'people' },
  { name: 'Coupons',       label: 'Coupons',       icon: 'pricetag-outline',       iconFocused: 'pricetag' },
  { name: 'Gallery',       label: 'Gallery',       icon: 'images-outline',         iconFocused: 'images' },
];

// ── Custom Drawer Content — dark sidebar like website ─────────────
function CustomDrawer(props) {
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

  // Get current active screen name (tab or direct drawer screen)
  const activeTab = useNavigationState(state => {
    const activeRoute = state.routes[state.index];
    if (activeRoute.name === 'MainTabs') {
      const tabState = activeRoute.state;
      if (!tabState) return 'Home';
      return tabState.routeNames?.[tabState.index] || 'Home';
    }
    return activeRoute.name;
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}
      style={dStyles.container}
    >
      {/* Brand header */}
      <View style={dStyles.brand}>
        <View style={dStyles.brandIcon}>
          <Text style={dStyles.brandIconText}>✂</Text>
        </View>
        <View>
          <Text style={dStyles.brandName}>My Salon Bookings</Text>
          <Text style={dStyles.brandSub}>Owner Panel</Text>
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
          <Text style={dStyles.userName}>{user?.name || 'Owner'}</Text>
          <Text style={dStyles.salonName}>{salon?.name || ''}</Text>
        </View>
      </View>

      <View style={dStyles.divider} />

      {/* Nav items */}
      <View style={dStyles.nav}>
        {NAV_ITEMS.map((item) => {
          const focused = activeTab === item.name;
          const badge = item.name === 'Notifications' ? unreadCount : 0;
          return (
            <TouchableOpacity
              key={item.name}
              style={[dStyles.navItem, focused && dStyles.navItemActive]}
              onPress={() => {
                if (TAB_SCREENS.includes(item.name)) {
                  props.navigation.navigate('MainTabs', { screen: item.name });
                } else {
                  props.navigation.navigate(item.name);
                }
                props.navigation.closeDrawer();
              }}
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

      {/* Logout at bottom */}
      <View style={[dStyles.footer, { marginTop: 'auto' }]}>
        <View style={dStyles.divider} />
        <TouchableOpacity style={dStyles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#f87171" />
          <Text style={dStyles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={dStyles.version}>My Salon Bookings · Owner App v1.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}


const TAB_SCREENS = ['Home', 'Bookings', 'Services', 'Settings'];

// ── 4-tab swipeable navigator with bottom indicator ────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        swipeEnabled: true,
        animationEnabled: true,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
          height: 62,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#6b7280',
        tabBarIndicatorStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
        tabBarIconStyle: { marginTop: 4 },
        tabBarShowIcon: true,
        tabBarIcon: ({ color }) => {
          const icons = { Home: 'home-outline', Bookings: 'calendar-outline', Services: 'cut-outline', Settings: 'settings-outline' };
          const iconsFocused = { Home: 'home', Bookings: 'calendar', Services: 'cut', Settings: 'settings' };
          const isFocused = color === '#fff';
          return <Ionicons name={isFocused ? iconsFocused[route.name] : icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ tabBarLabel: 'Bookings' }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ tabBarLabel: 'Services' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

// ── Main drawer navigator ─────────────────────────────────────────
function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        drawerStyle: { width: 260, backgroundColor: '#111827' },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen name="MainTabs"      component={MainTabs} />
      <Drawer.Screen name="Reports"       component={ReportsScreen} />
      <Drawer.Screen name="Reviews"       component={ReviewsScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Profile"       component={ProfileScreen} />
      <Drawer.Screen name="Calendar"      component={CalendarScreen} />
      <Drawer.Screen name="WorkingHours"  component={WorkingHoursScreen} />
      <Drawer.Screen name="WalkIn"        component={WalkInBookingScreen} />
      <Drawer.Screen name="Customers"     component={CustomersScreen} />
      <Drawer.Screen name="Coupons"       component={CouponsScreen} />
      <Drawer.Screen name="Gallery"       component={GalleryScreen} />
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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { salon, salonFetchDone } = useSalon();
  const isLoading = authLoading || (isAuthenticated && !salonFetchDone);

  if (isLoading) {
    return (
      <View style={rootStyles.splash}>
        <Image source={require('./assets/Icon-1024.png')} style={rootStyles.splashLogoImg} resizeMode="contain" />
        <View style={rootStyles.splashBottom}>
          <Text style={rootStyles.splashTitle}>My Salon Bookings</Text>
          <Text style={rootStyles.splashSubtitle}>Manage your salon, bookings{'\n'}and grow your business</Text>
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  const isApproved = salon && (salon.isApproved || salon.status === 'approved' || salon.approvalStatus === 'approved');

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : !salon ? (
          <RootStack.Screen name="SalonRegistration" component={SalonRegistrationScreen} />
        ) : !isApproved ? (
          <RootStack.Screen name="ApprovalWaiting" component={ApprovalWaitingScreen} />
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
          <SalonProvider>
            <NotificationProvider>
              <StatusBar style="light" />
              <RootNavigator />
              <Toast />
            </NotificationProvider>
          </SalonProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const { height: SCREEN_H } = Dimensions.get('window');
const rootStyles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  splashLogoImg: { width: '100%', height: SCREEN_H * 0.40, alignSelf: 'center' },
  splashBottom: { paddingHorizontal: 28, paddingBottom: 40, gap: 8, marginTop: 16 },
  splashTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  splashSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});

// ── Drawer styles — dark theme matching website sidebar ───────────
const dStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  brandIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: 18, color: '#fff' },
  brandName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  brandSub: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#374151' },
  avatarInitial: { fontSize: 17, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 14, fontWeight: '700', color: '#f9fafb' },
  salonName: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#1f2937', marginHorizontal: 0 },
  nav: { paddingHorizontal: 12, paddingVertical: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: '#2563eb' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  footer: { paddingHorizontal: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#f87171' },
  version: { fontSize: 11, color: '#4b5563', paddingBottom: 4 },
});
