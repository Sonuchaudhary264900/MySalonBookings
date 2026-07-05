// WeakRef polyfill for Hermes versions that don't support it (used by React Navigation)
if (typeof WeakRef === 'undefined') {
  global.WeakRef = class WeakRef {
    constructor(target) { this._target = target; }
    deref() { return this._target; }
  };
}

import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Animated, ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert, Image, Dimensions, Modal, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigationState } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import ErrorBoundary from './src/components/ErrorBoundary';
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
import OnboardingScreen        from './src/screens/onboarding/OnboardingScreen';
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
import PackagesScreen          from './src/screens/dashboard/PackagesScreen';
import GalleryScreen           from './src/screens/dashboard/GalleryScreen';
import ServiceMenuScreen       from './src/screens/dashboard/ServiceMenuScreen';
import BillingScreen           from './src/screens/dashboard/BillingScreen';
import MessagesScreen          from './src/screens/dashboard/MessagesScreen';
import GlowLooxProfileScreen   from './src/screens/dashboard/GlowLooxProfileScreen';
import LegalScreen             from './src/screens/legal/LegalScreen';
import FeedbackScreen          from './src/screens/dashboard/FeedbackScreen';
import WalletScreen             from './src/screens/dashboard/WalletScreen';
import TeamScreen               from './src/screens/dashboard/TeamScreen';
import QueueScreen              from './src/screens/dashboard/QueueScreen';
import PromotionsScreen         from './src/screens/dashboard/PromotionsScreen';
import AuditLogScreen           from './src/screens/dashboard/AuditLogScreen';
import DeveloperScreen          from './src/screens/dashboard/DeveloperScreen';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab       = createMaterialTopTabNavigator();

const DRAWER_WIDTH = 256;

// Exported so DrawerMenuButton can use it without the drawer navigator
export const DrawerContext = createContext({ openDrawer: () => {}, closeDrawer: () => {} });

// ── Nav sections matching the website sidebar ──────────────────────
// Home, Services, Analytics (Reports), Messages and Settings already live on
// the bottom tab bar — the drawer only lists screens that aren't reachable
// from there, so nothing is duplicated across the two nav surfaces.
const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { name: 'Bookings',  label: 'Bookings',        icon: 'calendar-outline',  iconFocused: 'calendar' },
      { name: 'WalkIn',    label: 'Add Walk-In',     icon: 'person-add-outline', iconFocused: 'person-add' },
      { name: 'Queue',     label: 'Live Queue',      icon: 'list-outline',      iconFocused: 'list' },
      { name: 'Calendar',  label: 'Calendar',        icon: 'today-outline',     iconFocused: 'today' },
    ],
  },
  {
    label: 'My Business',
    items: [
      { name: 'GlowLoox',  label: 'GlowLoox Profile', icon: 'storefront-outline', iconFocused: 'storefront' },
      { name: 'Customers', label: 'Customers',        icon: 'people-outline',    iconFocused: 'people' },
      { name: 'Team',      label: 'Team',             icon: 'people-circle-outline', iconFocused: 'people-circle' },
      { name: 'Gallery',   label: 'Gallery',          icon: 'images-outline',   iconFocused: 'images'   },
      { name: 'Reviews',   label: 'Reviews',          icon: 'star-outline',     iconFocused: 'star'     },
    ],
  },
  {
    label: 'Grow',
    items: [
      { name: 'Coupons',   label: 'Coupons',          icon: 'pricetag-outline', iconFocused: 'pricetag' },
      { name: 'Packages',  label: 'Packages & Plans', icon: 'gift-outline',     iconFocused: 'gift'     },
      { name: 'Feedback',  label: 'Help & Feedback',  icon: 'help-buoy-outline', iconFocused: 'help-buoy' },
      // ── Hidden for MVP (cash-only / advanced tooling) — screens still registered ──
      // { name: 'Wallet',     label: 'Wallet',          icon: 'wallet-outline',   iconFocused: 'wallet' },
      // { name: 'Promotions', label: 'Promote Salon',   icon: 'megaphone-outline', iconFocused: 'megaphone' },
      // { name: 'Billing',    label: 'Billing & Plan', icon: 'card-outline',     iconFocused: 'card' },
      // { name: 'Audit',      label: 'Audit Log',       icon: 'shield-outline',   iconFocused: 'shield' },
      // { name: 'Developer',  label: 'Developer',       icon: 'code-slash-outline', iconFocused: 'code-slash' },
    ],
  },
];

const TAB_SCREENS = ['Home', 'Reports', 'Services', 'Messages', 'Settings'];

// ── Custom animated drawer layout (no react-native-reanimated) ────
function CustomDrawerLayout({ children, drawerContent }) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [translateX, overlayOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  }, [translateX, overlayOpacity]);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {children}
        {/* Backdrop — intercepts taps to close drawer */}
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={closeDrawer} activeOpacity={1} />
        </Animated.View>
        {/* Drawer panel slides in from left */}
        <Animated.View
          pointerEvents={isOpen ? 'box-none' : 'none'}
          style={[StyleSheet.absoluteFill, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}
        >
          {drawerContent}
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
}

// ── Custom Drawer content ─────────────────────────────────────────
function CustomDrawer({ navigation }) {
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const dStyles = getDStyles(theme, isDark);
  const { closeDrawer } = useContext(DrawerContext);

  // Read which screen is active by traversing the root navigation state
  const activeTab = useNavigationState(state => {
    const mainRoute = state.routes.find(r => r.name === 'Main');
    if (!mainRoute?.state) return 'Home';
    const mainState = mainRoute.state;
    const activeRoute = mainState.routes?.[mainState.index];
    if (!activeRoute) return 'Home';
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

  const handleNavItem = (item) => {
    if (TAB_SCREENS.includes(item.name)) {
      navigation.navigate('Main', { screen: 'MainTabs', params: { screen: item.name } });
    } else {
      navigation.navigate('Main', { screen: item.name });
    }
    closeDrawer();
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 8 }}
      style={dStyles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* User card — drawer header */}
      <View style={[dStyles.userCard, { paddingTop: insets.top + 18 }]}>
        {user?.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={dStyles.avatarImg} />
        ) : (
          <View style={dStyles.avatar}>
            <Text style={dStyles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={dStyles.userName} numberOfLines={1}>{user?.name || 'Owner'}</Text>
          <Text style={dStyles.salonName} numberOfLines={1}>{salon?.name || ''}</Text>
        </View>
      </View>

      {/* Nav sections */}
      <View style={dStyles.nav}>
        {NAV_SECTIONS.map((section, idx) => (
          <View key={section.label} style={[dStyles.section, idx > 0 && dStyles.sectionDivider]}>
            <Text style={dStyles.sectionLabel}>{section.label.toUpperCase()}</Text>
            {section.items.map((item) => {
              const focused = activeTab === item.name;
              const badge = item.badge ? unreadCount : 0;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[dStyles.navItem, focused && dStyles.navItemActive]}
                  onPress={() => handleNavItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={[dStyles.navIconWrap, focused && dStyles.navIconWrapActive]}>
                    <Ionicons
                      name={focused ? item.iconFocused : item.icon}
                      size={16}
                      color={focused ? '#fff' : theme.subText}
                    />
                  </View>
                  <Text style={[dStyles.navLabel, focused && dStyles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {badge > 0 && (
                    <View style={dStyles.badge}>
                      <Text style={dStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Logout at bottom */}
      <View style={[dStyles.footer, { marginTop: 'auto' }]}>
        <TouchableOpacity style={dStyles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={17} color="#f87171" />
          <Text style={dStyles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const TAB_ICONS = {
  Home:      { off: 'grid-outline',          on: 'grid' },
  Reports:   { off: 'bar-chart-outline',     on: 'bar-chart' },
  Services:  { off: 'cut-outline',           on: 'cut' },
  Messages:  { off: 'chatbubbles-outline',   on: 'chatbubbles' },
  Settings:  { off: 'settings-outline',      on: 'settings' },
};

const TAB_LABELS = {
  Home: 'Home', Reports: 'Analytics', Services: 'Services', Messages: 'Messages', Settings: 'Settings',
};

// ── 5-tab swipeable navigator ──────────────────────────────────────
function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.subText,
        tabBarIndicatorStyle: {
          top: 0,
          bottom: 'auto',
          height: 2,
          backgroundColor: theme.accent,
          borderRadius: 2,
        },
        tabBarIndicatorContainerStyle: { top: 0 },
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: '700', marginBottom: 4, marginHorizontal: 0, textTransform: 'none', width: '100%', textAlign: 'center' },
        tabBarIconStyle: { marginTop: 6 },
        tabBarShowIcon: true,
        tabBarIcon: ({ color, focused }) => {
          const ic = TAB_ICONS[route.name];
          return <Ionicons name={focused ? ic.on : ic.off} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}           options={{ tabBarLabel: TAB_LABELS.Home }} />
      <Tab.Screen name="Reports"   component={ReportsScreen}         options={{ tabBarLabel: TAB_LABELS.Reports }} />
      <Tab.Screen name="Services"  component={ServicesScreen}        options={{ tabBarLabel: TAB_LABELS.Services }} />
      <Tab.Screen name="Messages"  component={MessagesScreen}        options={{ tabBarLabel: TAB_LABELS.Messages }} />
      <Tab.Screen name="Settings"  component={SettingsScreen}        options={{ tabBarLabel: TAB_LABELS.Settings }} />
    </Tab.Navigator>
  );
}

// ── Main navigator: stack + custom animated drawer overlay ─────────
function MainDrawer({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <CustomDrawerLayout
      drawerContent={<CustomDrawer navigation={navigation} />}
    >
      {/* Uniform bottom safe area for every stack screen; MainTabs' tab bar
          and the full-bleed GlowLoox screen handle their own insets */}
      <MainStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg, paddingBottom: insets.bottom } }}>
        <MainStack.Screen name="MainTabs"      component={MainTabs}              options={{ contentStyle: { paddingBottom: 0 } }} />
        <MainStack.Screen name="GlowLoox"      component={GlowLooxProfileScreen} options={{ contentStyle: { backgroundColor: '#0D0520', paddingBottom: 0 } }} />
        <MainStack.Screen name="Bookings"      component={BookingsScreen} />
        <MainStack.Screen name="Reviews"       component={ReviewsScreen} />
        <MainStack.Screen name="Notifications" component={NotificationsScreen} />
        <MainStack.Screen name="Profile"       component={ProfileScreen} />
        <MainStack.Screen name="Calendar"      component={CalendarScreen} />
        <MainStack.Screen name="WorkingHours"  component={WorkingHoursScreen} />
        <MainStack.Screen name="WalkIn"        component={WalkInBookingScreen} />
        <MainStack.Screen name="Customers"     component={CustomersScreen} />
        <MainStack.Screen name="Coupons"       component={CouponsScreen} />
        <MainStack.Screen name="Packages"      component={PackagesScreen} />
        <MainStack.Screen name="Billing"       component={BillingScreen} />
        <MainStack.Screen name="Gallery"       component={GalleryScreen} />
        <MainStack.Screen name="ServiceMenu"   component={ServiceMenuScreen} />
        <MainStack.Screen name="Legal"         component={LegalScreen} />
        <MainStack.Screen name="Feedback"      component={FeedbackScreen} />
        <MainStack.Screen name="Wallet"        component={WalletScreen} />
        <MainStack.Screen name="Team"          component={TeamScreen} />
        <MainStack.Screen name="Queue"         component={QueueScreen} />
        <MainStack.Screen name="Promotions"    component={PromotionsScreen} />
        <MainStack.Screen name="Audit"         component={AuditLogScreen} />
        <MainStack.Screen name="Developer"     component={DeveloperScreen} />
      </MainStack.Navigator>
    </CustomDrawerLayout>
  );
}

// ── Auth navigator ────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Intro"      component={IntroScreen} />
      <AuthStack.Screen name="Login"      component={LoginScreen} />
      <AuthStack.Screen name="Register"   component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { salon, salonFetchDone } = useSalon();
  const isStaff = user?.role === 'staff';
  const isLoading = authLoading || (isAuthenticated && !salonFetchDone);

  if (isLoading) {
    return (
      <View style={rootStyles.splash}>
        <View style={rootStyles.splashOrb1} />
        <View style={rootStyles.splashOrb2} />
        <View style={rootStyles.splashLogoCircle}>
          <Image source={require('./assets/Icon-1024.png')} style={rootStyles.splashLogoImg} resizeMode="contain" />
        </View>
        <Text style={rootStyles.splashBrand}>GlowLoox Partner</Text>
        <ActivityIndicator color="#818cf8" style={{ marginTop: 24 }} />
        <Text style={rootStyles.splashHint}>Setting things up…</Text>
      </View>
    );
  }

  const isApproved = salon && (salon.isApproved || salon.status === 'approved' || salon.approvalStatus === 'approved');

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : isStaff ? (
          // Staff skip onboarding and approval — go straight to dashboard
          <RootStack.Screen name="Main" component={MainDrawer} />
        ) : !salon ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isApproved ? (
          <RootStack.Screen name="ApprovalWaiting" component={ApprovalWaitingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainDrawer} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// ── Mandatory booking accept/reject modal ─────────────────────────
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
          <View style={alertStyles.topBar}>
            <Ionicons name="notifications" size={22} color="#fff" />
            <Text style={alertStyles.topBarText}>New Booking Request</Text>
          </View>

          <ScrollView contentContainerStyle={alertStyles.body}>
            <View style={alertStyles.row}>
              <Ionicons name="person-circle-outline" size={40} color="#6366f1" />
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

// ── Notification tap handler ──────────────────────────────────────
function NotificationTapHandler() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // Tap handling is performed elsewhere; listener kept for future routing.
    });
    return () => sub.remove();
  }, []);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
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
                  <Toast config={toastConfig} topOffset={54} />
                </NotificationProvider>
              </SalonProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// ── Styles ────────────────────────────────────────────────────────
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

const { width: SCREEN_W } = Dimensions.get('window');
const rootStyles = StyleSheet.create({
  splash:           { flex: 1, backgroundColor: '#07071a', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  splashOrb1:       { position: 'absolute', width: SCREEN_W * 0.85, height: SCREEN_W * 0.85, borderRadius: SCREEN_W * 0.425, backgroundColor: '#4f46e5', top: -SCREEN_W * 0.25, left: -SCREEN_W * 0.2, opacity: 0.35 },
  splashOrb2:       { position: 'absolute', width: SCREEN_W * 0.6, height: SCREEN_W * 0.6, borderRadius: SCREEN_W * 0.3, backgroundColor: '#7c3aed', bottom: -SCREEN_W * 0.15, right: -SCREEN_W * 0.2, opacity: 0.25 },
  splashLogoCircle: { width: SCREEN_W * 0.34, height: SCREEN_W * 0.34, borderRadius: SCREEN_W * 0.17, backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2.5, borderColor: 'rgba(56,189,248,0.5)', shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  splashLogoImg:    { width: SCREEN_W * 0.72, height: SCREEN_W * 0.72 },
  splashBrand:      { marginTop: 18, fontSize: 17, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3 },
  splashHint:       { marginTop: 10, fontSize: 12, color: '#475569' },
});

const getDStyles = (theme, isDark) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: theme.card },
  brand:          {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingBottom: 18,
  },
  brandIcon:      {
    width: 40, height: 40, borderRadius: 13, backgroundColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOpacity: isDark ? 0.5 : 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  brandName:      { fontSize: 17, fontWeight: '800', color: theme.text, letterSpacing: 0.2 },
  brandSub:       { fontSize: 11.5, color: theme.subText, marginTop: 1, fontWeight: '600' },
  userCard:       {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 14, marginBottom: 18, padding: 12, borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f8fc',
    borderWidth: 1, borderColor: theme.border,
  },
  avatar:         {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: isDark ? 'rgba(129,140,248,0.35)' : '#e0e7ff',
  },
  avatarImg:      { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: isDark ? 'rgba(129,140,248,0.35)' : '#e0e7ff' },
  avatarInitial:  { fontSize: 17, fontWeight: '800', color: '#fff' },
  userName:       { fontSize: 13.5, fontWeight: '700', color: theme.text },
  salonName:      { fontSize: 11.5, color: theme.subText, marginTop: 1 },
  nav:            { paddingHorizontal: 12 },
  section:        { marginBottom: 4 },
  sectionDivider: { marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border },
  sectionLabel:   { fontSize: 10.5, fontWeight: '800', color: theme.subText, letterSpacing: 1.4, paddingHorizontal: 6, paddingBottom: 8, opacity: 0.7 },
  navItem:        { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 12, marginBottom: 2 },
  navItemActive:  { backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : '#eef2ff' },
  navIconWrap:    { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: isDark ? '#818cf8' : '#4f46e5' },
  navLabel:       { flex: 1, fontSize: 13.5, fontWeight: '500', color: theme.subText },
  navLabelActive: { color: isDark ? '#818cf8' : '#4f46e5', fontWeight: '700' },
  badge:          { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText:      { color: '#fff', fontSize: 10, fontWeight: '700' },
  footer:         { paddingHorizontal: 14, paddingTop: 14 },
  logoutBtn:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, marginBottom: 10,
    backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#fef2f2',
  },
  logoutText:     { fontSize: 13.5, fontWeight: '700', color: '#f87171' },
  version:        { fontSize: 10, color: theme.subText, textAlign: 'center', paddingBottom: 4, opacity: 0.6 },
});