import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SalonProvider, useSalon } from './src/context/SalonContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';

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

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MoreMenuScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();

  const items = [
    { label: 'My Profile',    icon: 'person-outline',        screen: 'Profile',       badge: 0 },
    { label: 'Settings',      icon: 'settings-outline',      screen: 'Settings',      badge: 0 },
    { label: 'Reviews',       icon: 'star-outline',          screen: 'Reviews',       badge: 0 },
    { label: 'Notifications', icon: 'notifications-outline', screen: 'Notifications', badge: unreadCount },
  ];

  return (
    <View style={mStyles.container}>
      <View style={mStyles.userCard}>
        <View style={mStyles.avatar}>
          <Text style={mStyles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={mStyles.userName}>{user?.name || 'Owner'}</Text>
          <Text style={mStyles.salonName}>{salon?.name || 'Smart Salon'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={mStyles.menu}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={mStyles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={mStyles.menuIcon}>
              <Ionicons name={item.icon} size={20} color="#4f46e5" />
            </View>
            <Text style={mStyles.menuLabel}>{item.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.badge > 0 && (
                <View style={mStyles.badge}>
                  <Text style={mStyles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={mStyles.logoutBtn}
        onPress={() =>
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ])
        }
      >
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={mStyles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={mStyles.version}>Smart Salon · Owner App v1.0</Text>
    </View>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#4f46e5' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <MoreStack.Screen name="MoreMenu"       component={MoreMenuScreen}     options={{ title: 'More' }} />
      <MoreStack.Screen name="Profile"        component={ProfileScreen}      options={{ title: 'My Profile' }} />
      <MoreStack.Screen name="Settings"       component={SettingsScreen}     options={{ headerShown: false }} />
      <MoreStack.Screen name="Reviews"        component={ReviewsScreen}      options={{ headerShown: false }} />
      <MoreStack.Screen name="Notifications"  component={NotificationsScreen} options={{ headerShown: false }} />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:     focused ? 'home'      : 'home-outline',
            Bookings: focused ? 'calendar'  : 'calendar-outline',
            Services: focused ? 'cut'       : 'cut-outline',
            Reports:  focused ? 'bar-chart' : 'bar-chart-outline',
            More:     focused ? 'grid'      : 'grid-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Reports"  component={ReportsScreen} />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 },
        }}
      />
    </Tab.Navigator>
  );
}

// Single root navigator — no multiple NavigationContainers
function RootNavigator() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { salon, salonFetchDone } = useSalon();

  const isLoading = authLoading || (isAuthenticated && !salonFetchDone);

  const getInitialRoute = () => {
    if (!isAuthenticated) return 'Auth';
    if (!salon) return 'SalonRegistration';
    const approved = salon.isApproved || salon.status === 'approved' || salon.approvalStatus === 'approved';
    if (!approved) return 'ApprovalWaiting';
    return 'Main';
  };

  if (isLoading) {
    return (
      <View style={rootStyles.splash}>
        <Text style={rootStyles.splashLogo}>💈 Smart Salon</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={getInitialRoute()}>
        <RootStack.Screen name="Auth"               component={AuthNavigator} />
        <RootStack.Screen name="SalonRegistration"  component={SalonRegistrationScreen} />
        <RootStack.Screen name="ApprovalWaiting"    component={ApprovalWaitingScreen} />
        <RootStack.Screen name="Main"               component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SalonProvider>
          <NotificationProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </NotificationProvider>
        </SalonProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const rootStyles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  splashLogo: { fontSize: 32, fontWeight: '800', color: '#fff' },
});

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#4f46e5' },
  userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  salonName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  menu: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, marginTop: 14, padding: 14, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
  version: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
