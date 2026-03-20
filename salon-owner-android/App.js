import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SalonProvider, useSalon } from './src/context/SalonContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { ThemeProvider } from './src/context/ThemeContext';

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

const RootStack  = createNativeStackNavigator();
const AuthStack  = createNativeStackNavigator();
const Drawer     = createDrawerNavigator();

// ── Nav items matching the website sidebar ────────────────────────
const NAV_ITEMS = [
  { name: 'Home',          label: 'Dashboard',     icon: 'home-outline',          iconFocused: 'home' },
  { name: 'Services',      label: 'Services',      icon: 'cut-outline',           iconFocused: 'cut' },
  { name: 'Bookings',      label: 'Bookings',      icon: 'calendar-outline',      iconFocused: 'calendar' },
  { name: 'Reports',       label: 'Analytics',     icon: 'bar-chart-outline',     iconFocused: 'bar-chart' },
  { name: 'Reviews',       label: 'Reviews',       icon: 'star-outline',          iconFocused: 'star' },
  { name: 'Profile',       label: 'My Profile',    icon: 'person-outline',        iconFocused: 'person' },
  { name: 'Notifications', label: 'Notifications', icon: 'notifications-outline', iconFocused: 'notifications' },
  { name: 'Settings',      label: 'Settings',      icon: 'settings-outline',      iconFocused: 'settings' },
];

// ── Custom Drawer Content — dark sidebar like website ─────────────
function CustomDrawer(props) {
  const { state } = props;
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[dStyles.container, { paddingTop: insets.top }]}>
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
      <DrawerContentScrollView {...props} scrollEnabled={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={dStyles.nav}>
          {NAV_ITEMS.map((item, index) => {
            const focused = activeIndex === index;
            const badge = item.name === 'Notifications' ? unreadCount : 0;
            return (
              <TouchableOpacity
                key={item.name}
                style={[dStyles.navItem, focused && dStyles.navItemActive]}
                onPress={() => props.navigation.navigate(item.name)}
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

      {/* Logout at bottom */}
      <View style={[dStyles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={dStyles.divider} />
        <TouchableOpacity style={dStyles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#f87171" />
          <Text style={dStyles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={dStyles.version}>My Salon Bookings · Owner App v1.0</Text>
      </View>
    </View>
  );
}

// ── Header with hamburger menu button ─────────────────────────────
function MenuButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ marginRight: 14, padding: 4, marginTop: 4 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

// ── Main drawer navigator ─────────────────────────────────────────
function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerRight: () => <MenuButton />,
        headerLeft: () => null,
        drawerPosition: 'right',
        drawerType: 'front',
        drawerStyle: { width: 260, backgroundColor: '#111827' },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEnabled: true,
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Home"          component={HomeScreen}          options={{ headerShown: false }} />
      <Drawer.Screen name="Services"      component={ServicesScreen}      options={{ headerShown: false }} />
      <Drawer.Screen name="Bookings"      component={BookingsScreen}      options={{ headerShown: false }} />
      <Drawer.Screen name="Reports"       component={ReportsScreen}       options={{ headerShown: false }} />
      <Drawer.Screen name="Reviews"       component={ReviewsScreen}       options={{ headerShown: false }} />
      <Drawer.Screen name="Profile"       component={ProfileScreen}       options={{ headerShown: false }} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="Settings"      component={SettingsScreen}      options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
}

// ── Auth navigator ────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
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
        <View style={rootStyles.splashLogoBox}>
          <Image source={require('./assets/icon1.png')} style={rootStyles.splashLogoImg} resizeMode="contain" />
        </View>
        <Text style={rootStyles.splashName}>My Salon Bookings</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 24 }} />
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

const rootStyles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  splashLogoBox: { width: 110, height: 110, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e3a8a', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  splashLogoImg: { width: 88, height: 88 },
  splashName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 18, letterSpacing: 0.3 },
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
