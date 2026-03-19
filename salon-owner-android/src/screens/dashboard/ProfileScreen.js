import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSalon } from '../../context/SalonContext';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#6b7280" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Section({ title, children, action }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { salon } = useSalon();

  // Edit profile
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Change password
  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) { Alert.alert('Error', 'Current password is required'); return; }
    if (!pwForm.next || pwForm.next.length < 6) { Alert.alert('Error', 'New password must be at least 6 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { Alert.alert('Error', 'Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setChangingPw(false);
      Alert.alert('Success', 'Password changed!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.headerName}>{user?.name || 'Owner'}</Text>
        <Text style={styles.headerSub}>Member since {memberSince}</Text>
      </View>

      {/* Profile Info */}
      <Section
        title="My Profile"
        action={
          !editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.actionLink}>Edit</Text>
            </TouchableOpacity>
          )
        }
      >
        {editing ? (
          <View>
            {[
              { label: 'Full Name', key: 'name', icon: 'person-outline', keyboard: 'default' },
              { label: 'Email', key: 'email', icon: 'mail-outline', keyboard: 'email-address' },
              { label: 'Phone', key: 'phone', icon: 'call-outline', keyboard: 'phone-pad' },
            ].map((f) => (
              <View style={styles.inputField} key={f.key}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name={f.icon} size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    value={profileForm[f.key]}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, [f.key]: v }))}
                    keyboardType={f.keyboard}
                    autoCapitalize="none"
                    editable={!profileLoading}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            ))}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1, marginRight: 6 }]}
                onPress={handleSaveProfile}
                disabled={profileLoading}
              >
                {profileLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline, { flex: 1 }]}
                onPress={() => {
                  setEditing(false);
                  if (user) setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
                }}
                disabled={profileLoading}
              >
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <InfoRow icon="mail-outline" label="Email" value={user?.email} />
            <InfoRow icon="call-outline" label="Phone" value={user?.phone} />
            {salon && <InfoRow icon="business-outline" label="Salon" value={salon.name} />}
            {salon && <InfoRow icon="location-outline" label="Address" value={salon.address} />}
          </View>
        )}
      </Section>

      {/* Security */}
      <Section
        title="Security"
        action={
          !changingPw && (
            <TouchableOpacity onPress={() => setChangingPw(true)}>
              <Text style={styles.actionLink}>Change Password</Text>
            </TouchableOpacity>
          )
        }
      >
        {changingPw ? (
          <View>
            {[
              { label: 'Current Password', key: 'current' },
              { label: 'New Password', key: 'next' },
              { label: 'Confirm New Password', key: 'confirm' },
            ].map((f) => (
              <View style={styles.inputField} key={f.key}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={pwForm[f.key]}
                    onChangeText={(v) => setPwForm((p) => ({ ...p, [f.key]: v }))}
                    secureTextEntry={!showPw[f.key]}
                    editable={!pwLoading}
                    placeholderTextColor="#9ca3af"
                    placeholder="••••••••"
                  />
                  <TouchableOpacity onPress={() => setShowPw((p) => ({ ...p, [f.key]: !p[f.key] }))}>
                    <Ionicons name={showPw[f.key] ? 'eye-off-outline' : 'eye-outline'} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1, marginRight: 6 }]}
                onPress={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>Update Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline, { flex: 1 }]}
                onPress={() => { setChangingPw(false); setPwForm({ current: '', next: '', confirm: '' }); }}
                disabled={pwLoading}
              >
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <Text style={styles.infoValue}>Active & Verified</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="phone-portrait-outline" size={16} color="#6b7280" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Login Method</Text>
                <Text style={styles.infoValue}>Phone Number + Password</Text>
              </View>
            </View>
          </View>
        )}
      </Section>

      {/* Account Info */}
      <Section title="Account Information">
        {[
          { label: 'Account Type', value: 'Salon Owner' },
          { label: 'Member Since', value: memberSince },
          { label: 'User ID', value: user?._id ? `${String(user._id).substring(0, 16)}…` : '—' },
        ].map(({ label, value }) => (
          <View key={label} style={styles.accountRow}>
            <Text style={styles.accountLabel}>{label}</Text>
            <Text style={styles.accountValue}>{value}</Text>
          </View>
        ))}
        <View style={[styles.accountRow, { marginTop: 4 }]}>
          <Text style={styles.accountLabel}>Status</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active ✓</Text>
          </View>
        </View>
      </Section>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#4f46e5', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: '#fff' },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 4 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  actionLink: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10, marginTop: 4 },
  inputField: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  row: { flexDirection: 'row', marginTop: 4 },
  btn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#4f46e5' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: { borderWidth: 1.5, borderColor: '#d1d5db' },
  btnOutlineText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  accountLabel: { fontSize: 13, color: '#6b7280' },
  accountValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  activeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  activeBadgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, marginTop: 20, padding: 14, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
