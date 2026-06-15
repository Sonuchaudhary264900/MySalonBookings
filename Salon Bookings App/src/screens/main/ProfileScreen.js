import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

function InfoRow({ icon, label, value, theme, styles }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.subText} style={{ width: 22 }} />
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue} numberOfLines={1}>{value || '—'}</AppText>
    </View>
  );
}

function SectionHeader({ icon, title, expanded, onPress, theme, styles }) {
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={18} color={theme.accent} />
        </View>
        <AppText style={styles.sectionHeaderTitle}>{title}</AppText>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user, isAuthenticated, logout, updateProfile, refreshUser } = useAuth();

  const [expandedSection, setExpandedSection] = useState(null); // 'profile' | 'security' | 'about'
  const toggleSection = (name) => setExpandedSection(prev => prev === name ? null : name);

  // Collapse everything when leaving the screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setExpandedSection(null);
      setEditing(false);
      setCpStep(0);
      setCpOtp(''); setCpNewPw(''); setCpConfirm('');
    });
    return unsubscribe;
  }, [navigation]);

  const [editing, setEditing]             = useState(false);
  const [name, setName]                   = useState(user?.name || '');
  const [email, setEmail]                 = useState(user?.email || '');
  const [saving, setSaving]               = useState(false);
  const [genderSaving, setGenderSaving]   = useState(false);

  // OTP-only: no password, so the "change password" flow was removed.

  const handleSaveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) { showError('Error', 'Name must be at least 2 characters'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() || undefined });
      setEditing(false);
      showSuccess('Saved', 'Profile updated successfully.');
    } catch (err) {
      showError('Error', err?.message || 'Failed to save profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenderChange = async (g) => {
    if (user?.gender === g || genderSaving) return;
    setGenderSaving(true);
    try {
      await updateProfile({ name: user.name, gender: g });
      showSuccess('Updated', 'Gender updated successfully.');
    } catch { showError('Error', 'Failed to update gender.'); }
    finally { setGenderSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
        <AppText style={styles.guestTitle}>Sign in to view your profile</AppText>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Auth')}>
          <AppText style={styles.signInBtnText}>Sign In</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signUpLink} onPress={() => navigation.navigate('Auth')}>
          <AppText style={styles.signUpLinkText}>New here? Create Account</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={20} color={theme.subText} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>My Profile</AppText>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person-circle" size={62} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.userName}>{user?.name || 'User'}</AppText>
            <AppText style={styles.userPhone}>{user?.phone || ''}</AppText>
            {user?.email ? <AppText style={styles.userEmail} numberOfLines={1}>{user.email}</AppText> : null}
          </View>
        </View>

        <View style={{ padding: 12, gap: 10 }}>

          {/* ── Profile Information (accordion) ── */}
          <View style={styles.accordionCard}>
            <SectionHeader
              icon="person-circle-outline"
              title="Profile Information"
              expanded={expandedSection === 'profile'}
              onPress={() => { toggleSection('profile'); setEditing(false); }}
              theme={theme}
              styles={styles}
            />
            {expandedSection === 'profile' && (
              <View style={styles.accordionBody}>
                {!editing ? (
                  <>
                    <InfoRow icon="person-outline" label="Full Name" value={user?.name} theme={theme} styles={styles} />
                    <InfoRow icon="call-outline"   label="Phone"     value={user?.phone} theme={theme} styles={styles} />
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={16} color={theme.subText} style={{ width: 22 }} />
                      <AppText style={styles.infoLabel}>Email</AppText>
                      <AppText style={styles.infoValue} numberOfLines={1}>{user?.email || '—'}</AppText>
                    </View>
                    {/* Gender row */}
                    <View style={[styles.infoRow, { borderBottomWidth: 0, alignItems: 'center' }]}>
                      <Ionicons name="person-circle-outline" size={16} color={theme.subText} style={{ width: 22 }} />
                      <AppText style={styles.infoLabel}>Gender</AppText>
                      <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                        {[{ key: 'male', label: '👨 Male' }, { key: 'female', label: '👩 Female' }].map(({ key, label }) => {
                          const active = user?.gender === key;
                          return (
                            <TouchableOpacity key={key} onPress={() => handleGenderChange(key)} disabled={genderSaving}
                              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: active ? '#ec4899' : (theme.border || '#e5e7eb'), backgroundColor: active ? '#ec4899' : 'transparent' }}>
                              <AppText style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : theme.subText }}>{label}</AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={() => { setName(user?.name || ''); setEmail(user?.email || ''); setEditing(true); }}>
                      <Ionicons name="create-outline" size={15} color={theme.accent} />
                      <AppText style={styles.editBtnText}>Edit Profile</AppText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ padding: 12, gap: 10 }}>
                    <View style={styles.field}>
                      <AppText style={styles.fieldLabel}>Full Name</AppText>
                      <View style={styles.inputRow}>
                        <Ionicons name="person-outline" size={15} color={theme.subText} style={{ marginRight: 8 }} />
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.placeholder} editable={!saving} />
                      </View>
                    </View>
                    <View style={styles.field}>
                      <AppText style={styles.fieldLabel}>Email Address</AppText>
                      <View style={styles.inputRow}>
                        <Ionicons name="mail-outline" size={15} color={theme.subText} style={{ marginRight: 8 }} />
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={theme.placeholder} keyboardType="email-address" autoCapitalize="none" editable={!saving} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={saving}>
                        <AppText style={styles.cancelBtnText}>Cancel</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSaveProfile} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <AppText style={styles.saveBtnText}>Save</AppText>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── About (accordion) ── */}
          <View style={styles.accordionCard}>
            <SectionHeader
              icon="information-circle-outline"
              title="About"
              expanded={expandedSection === 'about'}
              onPress={() => toggleSection('about')}
              theme={theme}
              styles={styles}
            />
            {expandedSection === 'about' && (
              <View style={styles.accordionBody}>
                {[
                  { icon: 'code-slash-outline',  label: 'App Version', value: 'v1.0.0' },
                  { icon: 'globe-outline',        label: 'Website',     value: 'mysalonbookings.com' },
                ].map((item, i, arr) => (
                  <View key={item.label} style={[styles.secRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                    <Ionicons name={item.icon} size={16} color={theme.subText} />
                    <AppText style={styles.secRowText}>{item.label}</AppText>
                    <AppText style={styles.secRowValue}>{item.value}</AppText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <AppText style={styles.logoutBtnText}>Logout</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  // Compact themed header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.card, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: t.text },
  // Compact avatar card
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.card, marginHorizontal: 12, marginTop: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border, elevation: 1 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: t.border },
  avatarInitial: { fontSize: 26, fontWeight: '800', color: '#fff' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.card },
  userName: { fontSize: 16, fontWeight: '700', color: t.text },
  userPhone: { fontSize: 13, color: t.subText, marginTop: 2 },
  userEmail: { fontSize: 12, color: t.subText, marginTop: 1 },
  // Accordion card
  accordionCard: { backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden', elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '600', color: t.text },
  accordionBody: { borderTopWidth: 1, borderTopColor: t.border },
  // Compact single-line info row
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border },
  infoLabel: { fontSize: 13, color: t.subText, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: t.text, maxWidth: '55%', textAlign: 'right' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: t.accent },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: t.subText },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, paddingHorizontal: 10, height: 42 },
  input: { flex: 1, fontSize: 13, color: t.text },
  cancelBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: t.inputBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: t.subText },
  saveBtn: { flex: 2, height: 40, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border },
  secRowText: { fontSize: 13, color: t.text, flex: 1 },
  secRowValue: { fontSize: 12, color: t.subText },
  showPwBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  showPwText: { fontSize: 12, color: t.subText },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.card, borderRadius: 12, height: 46, borderWidth: 1, borderColor: '#fca5a5', elevation: 1 },
  logoutBtnText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  guestTitle: { fontSize: 17, fontWeight: '700', color: t.text, marginTop: 14, marginBottom: 4 },
  signInBtn: { backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 14 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  signUpLink: { marginTop: 10 },
  signUpLinkText: { color: t.accent, fontWeight: '600', fontSize: 13 }
});
