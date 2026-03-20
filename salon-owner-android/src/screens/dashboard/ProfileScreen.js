import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { useSalon } from '../../context/SalonContext';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../services/api';

function InfoRow({ icon, label, value }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#6b7280" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Section({ title, children, action }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, logout, updateProfile, changePassword, refreshUser } = useAuth();
  const { salon } = useSalon();

  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const [showQR, setShowQR] = useState(false);

  useFocusEffect(useCallback(() => {
    return () => {
      setEditing(false);
      setChangingPw(false);
      setPwForm({ current: '', next: '', confirm: '' });
    };
  }, []));

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPhotoUploading(true);
    try {
      const filename = uri.split('/').pop();
      const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
      const formData = new FormData();
      formData.append('photos', { uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      const res = await api.post('/owner/salon/upload-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const photoUrl = res.data.data?.urls?.[0];
      if (!photoUrl) throw new Error('Upload failed');
      await updateProfile({ name: user.name, email: user.email, profilePhoto: photoUrl });
      await refreshUser();
      showSuccess('Updated', 'Profile photo updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { showError('Error', 'Name is required'); return; }
    setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      setEditing(false);
      showSuccess('Saved', 'Changes saved successfully!');
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) { showError('Error', 'Current password is required'); return; }
    if (!pwForm.next || pwForm.next.length < 6) { showError('Error', 'New password must be at least 6 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { showError('Error', 'Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setChangingPw(false);
      showSuccess('Saved', 'Password updated successfully!');
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
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

  const qrValue = salon?._id
    ? `https://mysalonbookings.com/salon/${salon._id}`
    : `mysalonbookings:owner:${user?._id}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: 28 + insets.top }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Avatar / Photo */}
        <TouchableOpacity onPress={handlePickPhoto} disabled={photoUploading} style={styles.avatarWrap}>
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            {photoUploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <Text style={styles.headerName}>{user?.name || 'Owner'}</Text>
        <Text style={styles.headerSub}>Member since {memberSince}</Text>

        {/* QR Code button */}
        {salon && (
          <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQR(true)}>
            <Ionicons name="qr-code-outline" size={16} color="#2563eb" />
            <Text style={styles.qrBtnText}>Show Salon QR Code</Text>
          </TouchableOpacity>
        )}
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
                    style={[styles.input, { color: theme.text }]}
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
                    style={[styles.input, { flex: 1, color: theme.text }]}
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
                <Text style={[styles.infoValue, { color: theme.text }]}>Active & Verified</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="phone-portrait-outline" size={16} color="#6b7280" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Login Method</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>Phone Number + Password</Text>
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
            <Text style={[styles.accountValue, { color: theme.text }]}>{value}</Text>
          </View>
        ))}
        <View style={[styles.accountRow, { marginTop: 4 }]}>
          <Text style={styles.accountLabel}>Status</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>
      </Section>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* ── QR Code Modal ── */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrBox}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Salon QR Code</Text>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.qrSub}>Customers scan this to book your salon</Text>

            <View style={styles.qrCodeWrap}>
              <QRCode
                value={qrValue}
                size={220}
                color="#111827"
                backgroundColor="#fff"
                logo={require('../../../assets/icon1.png')}
                logoSize={44}
                logoBackgroundColor="#fff"
                logoBorderRadius={10}
              />
            </View>

            <View style={styles.qrSalonBadge}>
              <Ionicons name="business-outline" size={14} color="#2563eb" />
              <Text style={styles.qrSalonName}>{salon?.name}</Text>
            </View>
            <Text style={styles.qrHint}>Print or display this QR code at your salon</Text>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: { backgroundColor: '#2563eb', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -60 },
  decorCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -30 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarCircle: { width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarImg: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: '#fff' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#bfdbfe' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14 },
  qrBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  // Sections
  section: { marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  actionLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10, marginTop: 4 },
  inputField: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14 },
  row: { flexDirection: 'row', marginTop: 4 },
  btn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: { borderWidth: 1.5, borderColor: '#d1d5db' },
  btnOutlineText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  accountLabel: { fontSize: 13, color: '#6b7280' },
  accountValue: { fontSize: 13, fontWeight: '600' },
  activeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  activeBadgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, marginTop: 20, padding: 14, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
  // QR Modal
  qrOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  qrBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 },
  qrTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  qrSub: { fontSize: 13, color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  qrCodeWrap: { padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 16 },
  qrSalonBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dbeafe', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginBottom: 10 },
  qrSalonName: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  qrHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});
