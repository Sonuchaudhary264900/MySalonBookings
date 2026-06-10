import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, TextInput, Share, Clipboard, Linking
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage, LANGUAGE_OPTIONS } from '../../context/LanguageContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

const NOTIF_KEY = '@userNotifPrefs';
const APP_PREFS_KEY = '@userAppPrefs';

const DEFAULT_NOTIF = {
  bookingReminders: true,
  confirmationAlerts: true,
  cancellationAlerts: true,
  promotionalOffers: false
};

const LANGUAGES = LANGUAGE_OPTIONS.map(o => o.name);
const TIME_FORMATS = ['12-hour', '24-hour'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

function SectionHeader({ title }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return <AppText style={styles.sectionHeader}>{title}</AppText>;
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
        <AppText style={styles.rowLabel}>{label}</AppText>
        {sublabel ? <AppText style={styles.rowSublabel}>{sublabel}</AppText> : null}
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
  const insets   = useSafeAreaInsets();
  const { theme } = useTheme();
  const { languageName, setLanguageByName, t } = useLanguage();
  const styles   = getStyles(theme);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const [expandedSection, setExpandedSection] = useState(null);
  const toggleSection = (name) => setExpandedSection(prev => prev === name ? null : name);

  // Collapse everything when leaving the screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setExpandedSection(null);
      setCpStep(1); setCpOtp(''); setCpNewPw(''); setCpConfirm('');
    });
    return unsubscribe;
  }, [navigation]);
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [timeFormat, setTimeFormat] = useState('12-hour');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Change password via OTP
  const [cpStep, setCpStep]     = useState(1);
  const [cpOtp, setCpOtp]       = useState('');
  const [cpNewPw, setCpNewPw]   = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpShowPw, setCpShowPw] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpTimer, setCpTimer]   = useState(0);

  useEffect(() => {
    if (cpTimer <= 0) return;
    const id = setInterval(() => setCpTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [cpTimer]);

  const normalizePhone = (p) => {
    const d = (p || '').replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return p || '';
  };

  const handleCpSendOtp = async () => {
    const phone = normalizePhone(user?.phone || '');
    if (!phone) { showError('Error', 'No phone number linked to your account'); return; }
    setCpLoading(true);
    try {
      await api.post('/customer/auth/forgot-password/send-otp', { phone });
      setCpStep(2); setCpTimer(60);
      showSuccess('OTP Sent', 'Enter the OTP to change your password');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to send OTP');
    } finally { setCpLoading(false); }
  };

  const handleCpReset = async () => {
    if (!cpOtp.trim()) { showError('Error', 'Please enter the OTP'); return; }
    if (!cpNewPw || cpNewPw.length < 6) { showError('Error', 'Password must be at least 6 characters'); return; }
    if (cpNewPw !== cpConfirm) { showError('Error', 'Passwords do not match'); return; }
    const phone = normalizePhone(user?.phone || '');
    setCpLoading(true);
    try {
      await api.post('/customer/auth/forgot-password/reset', { phone, otp: cpOtp, newPassword: cpNewPw });
      showSuccess('Success', 'Password changed successfully');
      setCpStep(1); setCpOtp(''); setCpNewPw(''); setCpConfirm('');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to change password');
    } finally { setCpLoading(false); }
  };

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
          onPress: () => onSelect(opt)
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const referralCode = user?.phone
    ? `MSB${user.phone.replace(/\D/g, '').slice(-6).toUpperCase()}`
    : user?._id?.slice(-6).toUpperCase() || 'MSB000';

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `Salon owners 👇\n\n` +
          `Don't miss this 🚀\n` +
          `Join MySalonBookings and start getting customers online instantly! 💼\n\n` +
          `Grow your salon, manage bookings easily, and go digital today.\n\n` +
          `❤️ Use my referral code and support me too\n\n` +
          `💸 Referral Code: ${referralCode}\n` +
          `🔗 https://owner.mysalonbookings.com`,
        title: 'Join MySalonBookings'
      });
    } catch {}
  };

  const handleCopyCode = () => {
    Clipboard.setString(referralCode);
    showSuccess('Copied!', 'Referral code copied to clipboard.');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
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
          }
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <AppText style={styles.headerTitle}>Settings</AppText>
            <AppText style={styles.headerSub}>Manage your preferences</AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'Notifications' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.subText} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <AppText style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person-circle-outline" size={38} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.profileName}>{user?.name || 'Guest User'}</AppText>
            <AppText style={styles.profileSub}>{user?.phone || 'Tap to sign in'}</AppText>
          </View>
          <View style={styles.profileChevronBox}>
            <Ionicons name="chevron-forward" size={18} color="#2563eb" />
          </View>
        </TouchableOpacity>

        {/* ── ACCOUNT ──────────────────────────────────────── */}
        <SectionHeader title="Account" />

        <View style={styles.accordionCard}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('account')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#7c3aed18' }]}>
                <Ionicons name="card-outline" size={18} color="#7c3aed" />
              </View>
              <View>
                <AppText style={styles.accordionHeaderTitle}>Account Info</AppText>
                <AppText style={[styles.rowSublabel, { marginTop: 1 }]}>ID, membership and account type</AppText>
              </View>
            </View>
            <Ionicons name={expandedSection === 'account' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
          </TouchableOpacity>
          {expandedSection === 'account' && (
            <View style={styles.accordionBody}>
              {[
                { icon: 'finger-print-outline', color: '#7c3aed', label: 'Account ID',    value: user?._id ? String(user._id).slice(-8).toUpperCase() : '—', mono: true },
                { icon: 'calendar-outline',     color: '#2563eb', label: 'Member Since',  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { icon: 'person-circle-outline',color: '#10b981', label: 'Account Type',  value: 'Customer' },
                { icon: 'call-outline',         color: '#f59e0b', label: 'Phone',         value: user?.phone || '—' },
                { icon: 'mail-outline',         color: '#6366f1', label: 'Email',         value: user?.email || '—' },
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View style={styles.settingRow}>
                    <View style={[styles.iconBox, { backgroundColor: row.color + '18' }]}>
                      <Ionicons name={row.icon} size={18} color={row.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.rowSublabel}>{row.label}</AppText>
                      <AppText style={[styles.rowLabel, row.mono && { fontFamily: 'monospace', letterSpacing: 1 }]}>{row.value}</AppText>
                    </View>
                  </View>
                  {i < arr.length - 1 && <Divider />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── PREFERENCES ──────────────────────────────────── */}
        <SectionHeader title="Preferences" />

        <View style={styles.accordionCard}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('notifications')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#f59e0b18' }]}>
                <Ionicons name="notifications-outline" size={18} color="#f59e0b" />
              </View>
              <AppText style={styles.accordionHeaderTitle}>Notifications</AppText>
            </View>
            <Ionicons name={expandedSection === 'notifications' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
          </TouchableOpacity>
          {expandedSection === 'notifications' && (
            <View style={styles.accordionBody}>
              {notifLoaded ? (
                <>
                  <SettingRow icon="alarm-outline" iconColor="#f59e0b" label="Booking Reminders" sublabel="Get reminded before your appointment" rightEl={<Switch value={notif.bookingReminders} onValueChange={v => saveNotif('bookingReminders', v)} trackColor={{ false: '#d1d5db', true: '#fcd34d' }} thumbColor={notif.bookingReminders ? '#f59e0b' : '#fff'} />} />
                  <Divider />
                  <SettingRow icon="checkmark-circle-outline" iconColor="#10b981" label="Booking Confirmations" sublabel="Alerts when a booking is confirmed" rightEl={<Switch value={notif.confirmationAlerts} onValueChange={v => saveNotif('confirmationAlerts', v)} trackColor={{ false: '#d1d5db', true: '#6ee7b7' }} thumbColor={notif.confirmationAlerts ? '#10b981' : '#fff'} />} />
                  <Divider />
                  <SettingRow icon="close-circle-outline" iconColor="#ef4444" label="Cancellation Alerts" sublabel="Alerts when a booking is cancelled" rightEl={<Switch value={notif.cancellationAlerts} onValueChange={v => saveNotif('cancellationAlerts', v)} trackColor={{ false: '#d1d5db', true: '#fca5a5' }} thumbColor={notif.cancellationAlerts ? '#ef4444' : '#fff'} />} />
                  <Divider />
                  <SettingRow icon="pricetag-outline" iconColor="#8b5cf6" label="Offers & Promotions" sublabel="Deals, discounts, and special offers" rightEl={<Switch value={notif.promotionalOffers} onValueChange={v => saveNotif('promotionalOffers', v)} trackColor={{ false: '#d1d5db', true: '#c4b5fd' }} thumbColor={notif.promotionalOffers ? '#8b5cf6' : '#fff'} />} />
                </>
              ) : (
                <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator color={theme.accent} /></View>
              )}
            </View>
          )}
        </View>

        <View style={styles.accordionCard}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('preferences')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#2563eb18' }]}>
                <Ionicons name="color-palette-outline" size={18} color="#2563eb" />
              </View>
              <AppText style={styles.accordionHeaderTitle}>{t('appPreferences')}</AppText>
            </View>
            <Ionicons name={expandedSection === 'preferences' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
          </TouchableOpacity>
          {expandedSection === 'preferences' && (
            <View style={styles.accordionBody}>
              <SettingRow icon="language-outline" iconColor="#2563eb" label={t('language')} rightEl={<AppText style={styles.valueText}>{languageName}</AppText>} onPress={() => showPicker('Select Language', LANGUAGES, languageName, async val => { await setLanguageByName(val); })} chevron />
              <Divider />
              <SettingRow icon="time-outline" iconColor="#0891b2" label={t('timeFormat')} rightEl={<AppText style={styles.valueText}>{timeFormat}</AppText>} onPress={() => showPicker('Select Time Format', TIME_FORMATS, timeFormat, async val => { setTimeFormat(val); await saveAppPref('timeFormat', val); })} chevron />
              <Divider />
              <SettingRow icon="calendar-outline" iconColor="#059669" label={t('dateFormat')} rightEl={<AppText style={styles.valueText}>{dateFormat}</AppText>} onPress={() => showPicker('Select Date Format', DATE_FORMATS, dateFormat, async val => { setDateFormat(val); await saveAppPref('dateFormat', val); })} chevron />
            </View>
          )}
        </View>

        {/* ── SECURITY ─────────────────────────────────────── */}
        <SectionHeader title="Security" />

        <View style={styles.accordionCard}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => { toggleSection('password'); setCpStep(1); setCpOtp(''); setCpNewPw(''); setCpConfirm(''); }} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#6366f118' }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#6366f1" />
              </View>
              <AppText style={styles.accordionHeaderTitle}>Change Password</AppText>
            </View>
            <Ionicons name={expandedSection === 'password' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
          </TouchableOpacity>
          {expandedSection === 'password' && (
            <View style={[styles.accordionBody, { padding: 14, gap: 10 }]}>
              {cpStep === 1 ? (
                <>
                  <AppText style={styles.rowSublabel}>An OTP will be sent to your registered phone number</AppText>
                  <TouchableOpacity style={[styles.cpBtn, cpLoading && { opacity: 0.7 }]} onPress={handleCpSendOtp} disabled={cpLoading}>
                    {cpLoading ? <ActivityIndicator color="#fff" size="small" /> : <AppText style={styles.cpBtnText}>Send OTP to Phone</AppText>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <AppText style={styles.rowSublabel}>OTP sent to {user?.phone}</AppText>
                  <View style={styles.cpInputRow}>
                    <Ionicons name="key-outline" size={16} color={theme.subText} style={{ marginRight: 8 }} />
                    <TextInput style={styles.cpInput} placeholder="Enter OTP" placeholderTextColor={theme.placeholder} keyboardType="number-pad" maxLength={6} value={cpOtp} onChangeText={setCpOtp} editable={!cpLoading} />
                  </View>
                  <View style={styles.cpInputRow}>
                    <Ionicons name="lock-closed-outline" size={16} color={theme.subText} style={{ marginRight: 8 }} />
                    <TextInput style={[styles.cpInput, { flex: 1 }]} placeholder="New password" placeholderTextColor={theme.placeholder} secureTextEntry={!cpShowPw} value={cpNewPw} onChangeText={setCpNewPw} editable={!cpLoading} />
                    <TouchableOpacity onPress={() => setCpShowPw(!cpShowPw)}>
                      <Ionicons name={cpShowPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.subText} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cpInputRow}>
                    <Ionicons name="lock-closed-outline" size={16} color={theme.subText} style={{ marginRight: 8 }} />
                    <TextInput style={styles.cpInput} placeholder="Confirm password" placeholderTextColor={theme.placeholder} secureTextEntry value={cpConfirm} onChangeText={setCpConfirm} editable={!cpLoading} />
                  </View>
                  <TouchableOpacity style={[styles.cpBtn, cpLoading && { opacity: 0.7 }]} onPress={handleCpReset} disabled={cpLoading}>
                    {cpLoading ? <ActivityIndicator color="#fff" size="small" /> : <AppText style={styles.cpBtnText}>Reset Password</AppText>}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ alignItems: 'center', opacity: cpTimer > 0 ? 0.5 : 1 }} onPress={cpTimer === 0 ? handleCpSendOtp : undefined} disabled={cpTimer > 0}>
                    <AppText style={{ fontSize: 13, color: theme.accent }}>{cpTimer > 0 ? `Resend OTP in ${cpTimer}s` : 'Resend OTP'}</AppText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.accordionCard}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('privacy')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#10b98118' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10b981" />
              </View>
              <AppText style={styles.accordionHeaderTitle}>{t('privacySecurity')}</AppText>
            </View>
            <Ionicons name={expandedSection === 'privacy' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
          </TouchableOpacity>
          {expandedSection === 'privacy' && (
            <View style={styles.accordionBody}>
              <View style={styles.privacyInfo}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#10b981" />
                <AppText style={styles.privacyText}>Your data is stored securely and never shared with third parties without your consent.</AppText>
              </View>
              <Divider />
              <View style={styles.privacyInfo}>
                <Ionicons name="lock-closed-outline" size={22} color="#6366f1" />
                <AppText style={styles.privacyText}>All communication with our servers is encrypted using HTTPS.</AppText>
              </View>
              <Divider />
              <SettingRow icon="shield-checkmark-outline" iconColor="#6b7280" label="Privacy Policy" sublabel="How we collect and use your data" onPress={() => navigation.navigate('Legal')} chevron />
              <Divider />
              <SettingRow icon="document-text-outline" iconColor="#6b7280" label="Terms & Conditions" sublabel="Rules and responsibilities for users" onPress={() => navigation.navigate('Legal')} chevron />
              <Divider />
              <SettingRow icon="trash-outline" iconColor="#ef4444" label="Delete Account" sublabel="Permanently remove your account and data" onPress={handleDeleteAccount} rightEl={deletingAccount ? <ActivityIndicator size="small" color="#ef4444" /> : null} chevron={!deletingAccount} />
            </View>
          )}
        </View>

        {/* ── EARN & SHARE ─────────────────────────────────── */}
        <SectionHeader title="Earn & Share" />

        <View style={styles.accordionCard}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('refer')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#f59e0b18' }]}>
                <Ionicons name="gift-outline" size={18} color="#f59e0b" />
              </View>
              <View>
                <AppText style={styles.accordionHeaderTitle}>Refer & Earn</AppText>
                <AppText style={[styles.rowSublabel, { marginTop: 1 }]}>Earn ₹50 per referral</AppText>
              </View>
            </View>
            <Ionicons name={expandedSection === 'refer' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
          </TouchableOpacity>
          {expandedSection === 'refer' && (
            <View style={[styles.accordionBody, { padding: 16, gap: 14 }]}>
              <View style={styles.referBanner}>
                <AppText style={styles.referBannerEmoji}>🎁</AppText>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.referBannerTitle}>Earn ₹50 for every salon you refer!</AppText>
                  <AppText style={styles.referBannerSub}>Invite salon owners to join MySalonBookings and earn rewards when they get started.</AppText>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <AppText style={[styles.rowLabel, { fontSize: 13 }]}>How it works</AppText>
                {[
                  { icon: 'share-social-outline', color: '#2563eb', step: '1', text: 'Share your referral code with a salon owner' },
                  { icon: 'storefront-outline',   color: '#10b981', step: '2', text: 'They sign up on the MySalonBookings owner app' },
                  { icon: 'cash-outline',         color: '#8b5cf6', step: '3', text: 'You earn ₹50 once they qualify!' },
                ].map(item => (
                  <View key={item.step} style={styles.referStep}>
                    <View style={[styles.referStepNum, { backgroundColor: item.color + '18' }]}>
                      <AppText style={[styles.referStepNumText, { color: item.color }]}>{item.step}</AppText>
                    </View>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                    <AppText style={styles.referStepText}>{item.text}</AppText>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Terms & Conditions', '• The referred salon owner must register using your referral code.\n\n• The salon owner must actively use the MySalonBookings owner app for a minimum of 30 consecutive days.\n\n• ₹50 will be credited to your account once the 30-day qualifying period is complete.\n\n• Each referral code can be used once per salon.\n\n• MySalonBookings reserves the right to modify or cancel the referral program at any time.')}>
                <AppText style={styles.referTermsLink}>View Terms & Conditions</AppText>
              </TouchableOpacity>
              <View style={styles.referCodeBox}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.referCodeLabel}>Your Referral Code</AppText>
                  <AppText style={styles.referCode}>{referralCode}</AppText>
                </View>
                <TouchableOpacity style={styles.referCopyBtn} onPress={handleCopyCode}>
                  <Ionicons name="copy-outline" size={16} color={theme.accent} />
                  <AppText style={styles.referCopyText}>Copy</AppText>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.referShareBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <AppText style={styles.referShareBtnText}>Share & Invite Salon Owners</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── ABOUT ────────────────────────────────────────── */}
        <SectionHeader title="About" />

        <Card>
          <SettingRow icon="code-slash-outline" iconColor="#2563eb" label="App Version" rightEl={<AppText style={styles.valueText}>v1.0.0</AppText>} />
          <Divider />
          <SettingRow icon="globe-outline" iconColor="#059669" label="Website" rightEl={<AppText style={styles.valueText}>mysalonbookings.com</AppText>} onPress={() => Linking.openURL('https://mysalonbookings.com')} chevron />
          <Divider />
          <SettingRow icon="shield-checkmark-outline" iconColor="#7c3aed" label="Legal & Privacy" sublabel="Privacy Policy · Terms & Conditions" onPress={() => navigation.navigate('Legal')} chevron />
          <Divider />
          <SettingRow icon="bug-outline" iconColor="#d97706" label="Help & Feedback" sublabel="Report a bug or share feedback" onPress={() => navigation.navigate('Feedback')} chevron />
        </Card>

        {/* ── SIGN OUT ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <AppText style={styles.logoutBtnText}>Sign Out</AppText>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: t.card, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: t.card },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: t.text },
  headerSub: { fontSize: 13, color: t.subText, marginTop: 2 },
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
  accordionCard: { backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, elevation: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accordionHeaderTitle: { fontSize: 14, fontWeight: '600', color: t.text },
  accordionBody: { borderTopWidth: 1, borderTopColor: t.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: t.text },
  rowSublabel: { fontSize: 12, color: t.subText, marginTop: 1 },
  divider: { height: 1, backgroundColor: t.border, marginLeft: 62 },
  valueText: { fontSize: 13, color: t.subText, fontWeight: '500', marginRight: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, backgroundColor: t.card, borderRadius: 14, height: 52, borderWidth: 1.5, borderColor: '#fca5a5' },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  privacyInfo: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'flex-start' },
  privacyText: { flex: 1, fontSize: 13, color: t.subText, lineHeight: 19 },
  cpBtn: { backgroundColor: '#2563eb', borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cpBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cpInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: t.card },
  cpInput: { flex: 1, fontSize: 14, color: t.text },
  referBanner: { flexDirection: 'row', gap: 12, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#fde68a' },
  referBannerEmoji: { fontSize: 28 },
  referBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  referBannerSub: { fontSize: 12, color: '#78350f', marginTop: 3, lineHeight: 17 },
  referStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  referStepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  referStepNumText: { fontSize: 11, fontWeight: '800' },
  referStepText: { fontSize: 13, color: t.text, flex: 1 },
  referCodeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: t.accent, borderStyle: 'dashed' },
  referCodeLabel: { fontSize: 11, color: t.subText, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  referCode: { fontSize: 22, fontWeight: '800', color: t.accent, letterSpacing: 2, marginTop: 2 },
  referCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: t.accent + '18' },
  referCopyText: { fontSize: 13, fontWeight: '700', color: t.accent },
  referShareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.accent, borderRadius: 12, height: 46 },
  referShareBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  referTermsLink: { fontSize: 12, color: t.subText, textAlign: 'center', textDecorationLine: 'underline' }
});
