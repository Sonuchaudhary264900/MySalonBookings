import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert, Image, Dimensions, Modal, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
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
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import api from './src/services/api';
import { showSuccess, showError } from './src/utils/toast';

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
import ServiceMenuScreen       from './src/screens/dashboard/ServiceMenuScreen';

const RootStack  = createNativeStackNavigator();
const AuthStack  = createNativeStackNavigator();
const Drawer     = createDrawerNavigator();
const Tab        = createMaterialTopTabNavigator();

// ── Nav items matching the website sidebar ────────────────────────
const NAV_ITEMS = [
  { name: 'Bookings',      labelKey: 'navBookings',      icon: 'calendar-outline',       iconFocused: 'calendar' },
  { name: 'Services',      labelKey: 'navServices',      icon: 'cut-outline',            iconFocused: 'cut' },
  { name: 'Customers',     labelKey: 'navCustomers',     icon: 'people-outline',         iconFocused: 'people' },
  { name: 'Calendar',      labelKey: 'navCalendar',      icon: 'calendar-clear-outline', iconFocused: 'calendar-clear' },
  { name: 'WorkingHours',  labelKey: 'navWorkingHours',  icon: 'time-outline',           iconFocused: 'time' },
  { name: 'WalkIn',        labelKey: 'navWalkIn',        icon: 'walk-outline',           iconFocused: 'walk' },
  { name: 'Gallery',       labelKey: 'navGallery',       icon: 'images-outline',         iconFocused: 'images' },
  { name: 'Coupons',       labelKey: 'navCoupons',       icon: 'pricetag-outline',       iconFocused: 'pricetag' },
  { name: 'Reviews',       labelKey: 'navReviews',       icon: 'star-outline',           iconFocused: 'star' },
  { name: 'Notifications', labelKey: 'navNotifications', icon: 'notifications-outline',  iconFocused: 'notifications' },
];

// ── Custom Drawer Content ─────────────────────────────────────────
function CustomDrawer(props) {
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const dStyles = getDStyles(theme, isDark);

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
                color={focused ? '#fff' : theme.subText}
              />
              <Text style={[dStyles.navLabel, focused && dStyles.navLabelActive]}>
                {t(item.labelKey)}
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
          <Text style={dStyles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
        <Text style={dStyles.version}>My Salon Bookings · Owner App v1.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}


const TAB_SCREENS = ['Home', 'Reports', 'Services', 'Settings'];

const TAB_ICONS = {
  Home:     { off: 'grid-outline',      on: 'grid' },
  Reports:  { off: 'bar-chart-outline', on: 'bar-chart' },
  Services: { off: 'cut-outline',       on: 'cut' },
  Settings: { off: 'settings-outline',  on: 'settings' },
};

const TAB_LABELS = {
  Home: 'Dashboard', Reports: 'Analytics', Services: 'Services', Settings: 'Settings',
};

// ── 5-tab swipeable navigator matching website bottom nav ──────────
function MainTabs() {
  const { theme, isDark } = useTheme();
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        swipeEnabled: true,
        animationEnabled: true,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 62,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: isDark ? '#ffffff' : theme.accent,
        tabBarInactiveTintColor: theme.subText,
        tabBarIndicatorStyle: {
          top: 0,
          bottom: 'auto',
          height: 2,
          backgroundColor: theme.accent,
          width: '50%',
          marginLeft: '0%',
          borderRadius: 2,
        },
        tabBarIndicatorContainerStyle: { top: 0 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'none' },
        tabBarIconStyle: { marginTop: 6 },
        tabBarShowIcon: true,
        tabBarIcon: ({ color, focused }) => {
          const ic = TAB_ICONS[route.name];
          return <Ionicons name={focused ? ic.on : ic.off} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: TAB_LABELS.Home }} />
      <Tab.Screen name="Reports"  component={ReportsScreen}  options={{ tabBarLabel: TAB_LABELS.Reports }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ tabBarLabel: TAB_LABELS.Services }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: TAB_LABELS.Settings }} />
    </Tab.Navigator>
  );
}

// ── Main drawer navigator ─────────────────────────────────────────
function MainDrawer() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        drawerStyle: { width: 260, backgroundColor: theme.card },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen name="MainTabs"      component={MainTabs} />
      <Drawer.Screen name="Bookings"      component={BookingsScreen} />
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
      <Drawer.Screen name="ServiceMenu"   component={ServiceMenuScreen} />
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

// ── Mandatory booking accept/reject modal ─────────────────────────────────────
// Shows on top of everything when owner receives a new booking and
// auto-confirm is disabled. Owner MUST accept or reject before continuing.
function BookingAlertModal() {
  const { pendingBooking, clearPendingBooking } = useNotifications();
  const [saving, setSaving] = useState(false);

  if (!pendingBooking) return null;

  const b = pendingBooking;

  const act = async (status) => {
    setSaving(true);
    try {
      await api.put(`/owner/bookings/${b._id}`, { status });
      showSuccess(
        status === 'confirmed' ? 'Booking Accepted' : 'Booking Rejected',
        status === 'confirmed'
          ? `${b.customerName}'s booking confirmed.`
          : `${b.customerName}'s booking has been rejected.`
      );
      clearPendingBooking();
    } catch {
      showError('Error', 'Could not update booking. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.sheet}>
          {/* Red top bar — grabs attention */}
          <View style={alertStyles.topBar}>
            <Ionicons name="notifications" size={22} color="#fff" />
            <Text style={alertStyles.topBarText}>New Booking Request</Text>
          </View>

          <ScrollView contentContainerStyle={alertStyles.body}>
            <View style={alertStyles.row}>
              <Ionicons name="person-circle-outline" size={40} color="#2563eb" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={alertStyles.customerName}>{b.customerName || 'Customer'}</Text>
                {b.customerPhone ? (
                  <Text style={alertStyles.phone}>{b.customerPhone}</Text>
                ) : null}
              </View>
            </View>

            <View style={alertStyles.infoGrid}>
              <InfoRow icon="cut-outline"      label="Service"  value={b.serviceName || '—'} />
              <InfoRow icon="calendar-outline" label="Date"     value={b.appointmentDate ? new Date(b.appointmentDate).toDateString() : '—'} />
              <InfoRow icon="time-outline"     label="Time"     value={b.appointmentTime || '—'} />
              <InfoRow icon="cash-outline"     label="Amount"   value={b.totalAmount != null ? `₹${b.totalAmount}` : '—'} />
            </View>

            <Text style={alertStyles.warningText}>
              ⚠️  You must accept or reject this booking before continuing.
            </Text>
          </ScrollView>

          <View style={alertStyles.actions}>
            <TouchableOpacity
              style={[alertStyles.btn, alertStyles.rejectBtn, saving && alertStyles.btnDisabled]}
              onPress={() => act('cancelled')}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={alertStyles.btnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[alertStyles.btn, alertStyles.acceptBtn, saving && alertStyles.btnDisabled]}
              onPress={() => act('confirmed')}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={alertStyles.btnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={alertStyles.infoRow}>
      <Ionicons name={icon} size={16} color="#6b7280" style={{ marginRight: 8 }} />
      <Text style={alertStyles.infoLabel}>{label}</Text>
      <Text style={alertStyles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Notification tap handler (background / killed state) ──────────────────────
function NotificationTapHandler() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      // User tapped a notification — data is available for future navigation
      // e.g. navigate to bookings screen
      const data = response.notification.request.content.data || {};
      console.log('Notification tapped:', data.type, data.bookingId);
    });
    return () => sub.remove();
  }, []);
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SalonProvider>
              <NotificationProvider>
                <StatusBar style="light" />
                <RootNavigator />
                <BookingAlertModal />
                <NotificationTapHandler />
                <Toast />
              </NotificationProvider>
            </SalonProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// ── Booking alert modal styles ─────────────────────────────────────────────────
const alertStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '80%' },
  topBar:       { backgroundColor: '#dc2626', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  topBarText:   { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 },
  body:         { padding: 20 },
  row:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  customerName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  phone:        { fontSize: 13, color: '#6b7280', marginTop: 2 },
  infoGrid:     { backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 16, gap: 10 },
  infoRow:      { flexDirection: 'row', alignItems: 'center' },
  infoLabel:    { fontSize: 13, color: '#6b7280', width: 60 },
  infoValue:    { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  warningText:  { fontSize: 13, color: '#b45309', backgroundColor: '#fef3c7', borderRadius: 8, padding: 12, textAlign: 'center' },
  actions:      { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  btn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: '#fff', fontSize: 15, fontWeight: '800' },
  rejectBtn:    { backgroundColor: '#dc2626' },
  acceptBtn:    { backgroundColor: '#16a34a' },
});

const { height: SCREEN_H } = Dimensions.get('window');
const rootStyles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  splashLogoImg: { width: '100%', height: SCREEN_H * 0.40, alignSelf: 'center' },
  splashBottom: { paddingHorizontal: 28, paddingBottom: 40, gap: 8, marginTop: 16 },
  splashTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  splashSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});

// ── Drawer styles — theme-aware ────────────────────────────────────
const getDStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.card },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  brandIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: 18, color: '#fff' },
  brandName: { fontSize: 15, fontWeight: '800', color: theme.text },
  brandSub: { fontSize: 11, color: theme.subText, marginTop: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border },
  avatarInitial: { fontSize: 17, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 14, fontWeight: '700', color: theme.text },
  salonName: { fontSize: 11, color: theme.subText, marginTop: 1 },
  divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 0 },
  nav: { paddingHorizontal: 12, paddingVertical: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: '#2563eb' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.subText },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  footer: { paddingHorizontal: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#f87171' },
  version: { fontSize: 11, color: theme.subText, paddingBottom: 4 },
});
