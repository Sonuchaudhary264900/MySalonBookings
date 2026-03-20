import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#6b7280" style={{ width: 26 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout, updateProfile, refreshUser } = useAuth();

  const [editing, setEditing]             = useState(false);
  const [name, setName]                   = useState(user?.name || '');
  const [email, setEmail]                 = useState(user?.email || '');
  const [saving, setSaving]               = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Change password
  const [changingPw, setChangingPw]       = useState(false);
  const [oldPassword, setOldPassword]     = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [pwLoading, setPwLoading]         = useState(false);
  const [showPw, setShowPw]               = useState(false);

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

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission Required', 'Please allow access to your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      const filename = uri.split('/').pop();
      const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
      const formData = new FormData();
      formData.append('photo', { uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      const res = await api.post('/customer/auth/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const photoUrl = res.data.data?.profilePhoto;
      if (photoUrl) {
        await updateProfile({ profilePhoto: photoUrl });
        await refreshUser();
      }
    } catch (err) {
      showError('Upload Failed', err?.message || 'Could not upload photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validatePassword = (pw) =>
    pw.length >= 8 &&
    /[A-Z]/.test(pw) && /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPw) { showError('Error', 'Please fill in all password fields.'); return; }
    if (!validatePassword(newPassword)) {
      showError('Weak Password', 'Min 8 chars with uppercase, lowercase, number & special character.');
      return;
    }
    if (newPassword !== confirmPw) { showError('Error', 'New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await api.post('/customer/auth/change-password', { oldPassword, newPassword });
      setChangingPw(false);
      setOldPassword(''); setNewPassword(''); setConfirmPw('');
      showSuccess('Success', 'Password changed successfully.');
    } catch (err) {
      showError('Error', err?.message || 'Failed to change password. Check your current password.');
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

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
        <Text style={styles.guestTitle}>Sign in to view your profile</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signUpLink} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.signUpLinkText}>New here? Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <View style={[styles.avatar, { backgroundColor: '#dbeafe' }]}>
                  <ActivityIndicator color="#2563eb" />
                </View>
              ) : user?.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>

        <View style={{ padding: 16, gap: 14 }}>

          {/* Profile Info / Edit */}
          <Section title="Profile Information">
            {!editing ? (
              <>
                <InfoRow icon="person-outline"   label="Full Name" value={user?.name} />
                <InfoRow icon="call-outline"      label="Phone"     value={user?.phone} />
                <InfoRow icon="mail-outline"      label="Email"     value={user?.email} />
                <TouchableOpacity style={styles.editBtn} onPress={() => { setName(user?.name || ''); setEmail(user?.email || ''); setEditing(true); }}>
                  <Ionicons name="create-outline" size={16} color="#2563eb" />
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="person-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#9ca3af" editable={!saving} />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="mail-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" editable={!saving} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={saving}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSaveProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Section>

          {/* Change Password */}
          <Section title="Security">
            {!changingPw ? (
              <TouchableOpacity style={styles.secRow} onPress={() => setChangingPw(true)}>
                <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                <Text style={styles.secRowText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ) : (
              <>
                {[
                  { label: 'Current Password',  val: oldPassword, setter: setOldPassword, placeholder: 'Enter current password' },
                  { label: 'New Password',       val: newPassword, setter: setNewPassword, placeholder: 'Min 8 chars, uppercase, number, symbol' },
                  { label: 'Confirm New Password', val: confirmPw, setter: setConfirmPw, placeholder: 'Re-enter new password' },
                ].map(f => (
                  <View style={styles.field} key={f.label}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="lock-closed-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                      <TextInput style={[styles.input, { flex: 1 }]} value={f.val} onChangeText={f.setter} placeholder={f.placeholder} placeholderTextColor="#9ca3af" secureTextEntry={!showPw} editable={!pwLoading} />
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.showPwBtn} onPress={() => setShowPw(v => !v)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={14} color="#6b7280" />
                  <Text style={styles.showPwText}>{showPw ? 'Hide' : 'Show'} passwords</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setChangingPw(false); setOldPassword(''); setNewPassword(''); setConfirmPw(''); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, pwLoading && { opacity: 0.5 }]} onPress={handleChangePassword} disabled={pwLoading}>
                    {pwLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Section>

          {/* App Info */}
          <Section title="About">
            {[
              { icon: 'information-circle-outline', label: 'App Version', value: 'v1.0.0' },
              { icon: 'globe-outline', label: 'Backend', value: 'mysalonbookings.onrender.com' },
            ].map(item => (
              <View key={item.label} style={styles.secRow}>
                <Ionicons name={item.icon} size={18} color="#6b7280" />
                <Text style={styles.secRowText}>{item.label}</Text>
                <Text style={styles.secRowValue}>{item.value}</Text>
              </View>
            ))}
          </Section>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 28, paddingTop: 16, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -50 },
  decorCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', top: 10, left: -50 },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: '#fff' },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  userPhone: { fontSize: 13, color: '#bfdbfe' },
  userEmail: { fontSize: 12, color: '#93c5fd', marginTop: 1 },
  section: { gap: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, paddingLeft: 2 },
  sectionBody: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, color: '#111827', marginTop: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4 },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  cancelBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveBtn: { flex: 2, height: 44, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  secRowText: { fontSize: 14, color: '#374151', flex: 1 },
  secRowValue: { fontSize: 12, color: '#9ca3af' },
  showPwBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4 },
  showPwText: { fontSize: 12, color: '#6b7280' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, height: 52, borderWidth: 1.5, borderColor: '#fca5a5', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 4 },
  signInBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 16 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signUpLink: { marginTop: 12 },
  signUpLinkText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
});
