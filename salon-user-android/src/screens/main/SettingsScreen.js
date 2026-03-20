import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

const NOTIF_KEY = '@userNotifPrefs';
const APP_PREFS_KEY = '@userAppPrefs';

const DEFAULT_NOTIF = {
  bookingReminders: true,
  confirmationAlerts: true,
  cancellationAlerts: true,
  promotionalOffers: false,
};

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];
const TIME_FORMATS = ['12-hour', '24-hour'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

function SectionHeader({ title }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({ icon, iconColor = '#6b7280', label, sublabel, rightEl, onPress, chevron = false }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const Inner = (
    <View style={styles.settingRow}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {rightEl}
      {chevron && <Ionicons name="chevron-forward" size={16} color={theme.subText} style={{ marginLeft: 4 }} />}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>;
  }
  return Inner;
}

function Card({ children }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return <View style={styles.divider} />;
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark, theme, toggleTheme } = useTheme();
  const styles = getStyles(theme);
  const { user, logout } = useAuth();

  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [language, setLanguage]     = useState('English');
  const [timeFormat, setTimeFormat] = useState('12-hour');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load persisted prefs on mount
  React.useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(NOTIF_KEY),
      AsyncStorage.getItem(APP_PREFS_KEY),
    ]).then(([n, a]) => {
      if (n) {
        try { setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(n) }); } catch {}
      }
      if (a) {
        try {
          const parsed = JSON.parse(a);
          if (parsed.language)   setLanguage(parsed.language);
          if (parsed.timeFormat) setTimeFormat(parsed.timeFormat);
          if (parsed.dateFormat) setDateFormat(parsed.dateFormat);
        } catch {}
      }
      setNotifLoaded(true);
    });
  }, []);

  const saveNotif = async (key, val) => {
    const next = { ...notif, [key]: val };
    setNotif(next);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    showSuccess('Saved', `${val ? 'Enabled' : 'Disabled'} successfully.`);
  };

  const saveAppPref = async (key, val) => {
    const current = await AsyncStorage.getItem(APP_PREFS_KEY).then(v => (v ? JSON.parse(v) : {})).catch(() => ({}));
    const next = { ...current, [key]: val };
    await AsyncStorage.setItem(APP_PREFS_KEY, JSON.stringify(next));
    showSuccess('Saved', `${key === 'language' ? 'Language' : key === 'timeFormat' ? 'Time format' : 'Date format'} updated.`);
  };

  const showPicker = (title, options, current, onSelect) => {
    Alert.alert(
      title,
      undefined,
      [
        ...options.map(opt => ({
          text: opt === current ? `${opt} ✓` : opt,
          onPress: () => onSelect(opt),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all bookings, and your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.delete('/customer/auth/delete-account');
              await logout();
            } catch (err) {
              showError('Error', err?.message || 'Could not delete account. Please contact support.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>Manage your preferences</Text>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.getParent('DrawerNav')?.openDrawer()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
          <View style={styles.profileAvatar}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.profileAvatarImg} />
            ) : (
              <Text style={styles.profileAvatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.profileSub}>{user?.phone || 'Tap to sign in'}</Text>
          </View>
          <View style={styles.profileChevronBox}>
            <Ionicons name="chevron-forward" size={18} color="#2563eb" />
          </View>
        </TouchableOpacity>

        {/* APPEARANCE */}
        <SectionHeader title="Appearance" />
        <Card>
          <SettingRow
            icon="moon-outline"
            iconColor="#6366f1"
            label="Dark Mode"
            sublabel={isDark ? 'Dark theme enabled' : 'Light theme enabled'}
            rightEl={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#d1d5db', true: '#818cf8' }} thumbColor={isDark ? '#6366f1' : '#fff'} />}
          />
        </Card>

        {/* NOTIFICATIONS */}
        <SectionHeader title="Notifications" />
        <Card>
          {notifLoaded ? (
            <>
              <SettingRow
                icon="alarm-outline"
                iconColor="#f59e0b"
                label="Booking Reminders"
                sublabel="Get reminded before your appointment"
                rightEl={<Switch value={notif.bookingReminders} onValueChange={v => saveNotif('bookingReminders', v)} trackColor={{ false: '#d1d5db', true: '#fcd34d' }} thumbColor={notif.bookingReminders ? '#f59e0b' : '#fff'} />}
              />
              <Divider />
              <SettingRow
                icon="checkmark-circle-outline"
                iconColor="#10b981"
                label="Booking Confirmations"
                sublabel="Alerts when a booking is confirmed"
                rightEl={<Switch value={notif.confirmationAlerts} onValueChange={v => saveNotif('confirmationAlerts', v)} trackColor={{ false: '#d1d5db', true: '#6ee7b7' }} thumbColor={notif.confirmationAlerts ? '#10b981' : '#fff'} />}
              />
              <Divider />
              <SettingRow
                icon="close-circle-outline"
                iconColor="#ef4444"
                label="Cancellation Alerts"
                sublabel="Alerts when a booking is cancelled"
                rightEl={<Switch value={notif.cancellationAlerts} onValueChange={v => saveNotif('cancellationAlerts', v)} trackColor={{ false: '#d1d5db', true: '#fca5a5' }} thumbColor={notif.cancellationAlerts ? '#ef4444' : '#fff'} />}
              />
              <Divider />
              <SettingRow
                icon="pricetag-outline"
                iconColor="#8b5cf6"
                label="Offers & Promotions"
                sublabel="Deals, discounts, and special offers"
                rightEl={<Switch value={notif.promotionalOffers} onValueChange={v => saveNotif('promotionalOffers', v)} trackColor={{ false: '#d1d5db', true: '#c4b5fd' }} thumbColor={notif.promotionalOffers ? '#8b5cf6' : '#fff'} />}
              />
            </>
          ) : (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <ActivityIndicator color="#2563eb" />
            </View>
          )}
        </Card>

        {/* APP PREFERENCES */}
        <SectionHeader title="App Preferences" />
        <Card>
          <SettingRow
            icon="language-outline"
            iconColor="#2563eb"
            label="Language"
            rightEl={<Text style={styles.valueText}>{language}</Text>}
            onPress={() => showPicker('Select Language', LANGUAGES, language, async val => {
              setLanguage(val);
              await saveAppPref('language', val);
            })}
            chevron
          />
          <Divider />
          <SettingRow
            icon="time-outline"
            iconColor="#0891b2"
            label="Time Format"
            rightEl={<Text style={styles.valueText}>{timeFormat}</Text>}
            onPress={() => showPicker('Select Time Format', TIME_FORMATS, timeFormat, async val => {
              setTimeFormat(val);
              await saveAppPref('timeFormat', val);
            })}
            chevron
          />
          <Divider />
          <SettingRow
            icon="calendar-outline"
            iconColor="#059669"
            label="Date Format"
            rightEl={<Text style={styles.valueText}>{dateFormat}</Text>}
            onPress={() => showPicker('Select Date Format', DATE_FORMATS, dateFormat, async val => {
              setDateFormat(val);
              await saveAppPref('dateFormat', val);
            })}
            chevron
          />
        </Card>

        {/* PRIVACY & SECURITY */}
        <SectionHeader title="Privacy & Security" />
        <Card>
          <View style={styles.privacyInfo}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#10b981" />
            <Text style={styles.privacyText}>Your data is stored securely and never shared with third parties without your consent.</Text>
          </View>
          <Divider />
          <View style={styles.privacyInfo}>
            <Ionicons name="lock-closed-outline" size={22} color="#6366f1" />
            <Text style={styles.privacyText}>All communication with our servers is encrypted using HTTPS.</Text>
          </View>
          <Divider />
          <SettingRow
            icon="document-text-outline"
            iconColor="#6b7280"
            label="Privacy Policy"
            sublabel="View our data usage policy"
            onPress={() => Alert.alert('Privacy Policy', 'We collect your name, phone, email, and booking data to provide our services. We do not sell your data to third parties.')}
            chevron
          />
          <Divider />
          <SettingRow
            icon="trash-outline"
            iconColor="#ef4444"
            label="Delete Account"
            sublabel="Permanently remove your account and data"
            onPress={handleDeleteAccount}
            rightEl={deletingAccount ? <ActivityIndicator size="small" color="#ef4444" /> : null}
            chevron={!deletingAccount}
          />
        </Card>

        {/* APP INFO */}
        <SectionHeader title="About" />
        <Card>
          <SettingRow
            icon="information-circle-outline"
            iconColor="#2563eb"
            label="App Version"
            rightEl={<Text style={styles.valueText}>v1.0.0</Text>}
          />
          <Divider />
          <SettingRow
            icon="phone-portrait-outline"
            iconColor="#6b7280"
            label="Platform"
            rightEl={<Text style={styles.valueText}>Android</Text>}
          />
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  decorCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 },
  decorCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  profileCard: { backgroundColor: t.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: t.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  profileAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  profileAvatarInitial: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 16, fontWeight: '700', color: t.text },
  profileSub: { fontSize: 13, color: t.subText, marginTop: 1 },
  profileChevronBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 6 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: t.subText, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 4, paddingLeft: 2 },
  card: { backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: t.text },
  rowSublabel: { fontSize: 12, color: t.subText, marginTop: 1 },
  divider: { height: 1, backgroundColor: t.border, marginLeft: 62 },
  valueText: { fontSize: 13, color: t.subText, fontWeight: '500', marginRight: 2 },
  privacyInfo: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'flex-start' },
  privacyText: { flex: 1, fontSize: 13, color: t.subText, lineHeight: 19 },
});
