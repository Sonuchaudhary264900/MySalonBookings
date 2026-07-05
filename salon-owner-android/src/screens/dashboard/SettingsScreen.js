// Settings — mirrors the owner website's Settings page (mobile view):
// same 12 sections, same order, same copy, single-open accordion.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Image, Linking,
  LayoutAnimation, Modal, FlatList, Appearance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { INDIAN_STATES, STATE_DISTRICTS } from '../../data/indianLocations';

const NOTIF_PREFS_KEY = 'notificationPrefs';
const APP_PREFS_KEY   = 'appPrefs';

// Business-type metadata — matches website SALON_TYPES
const SALON_TYPES = [
  { key: 'barbershop',    label: 'Barbershop',          icon: 'cut-outline',        color: '#3b82f6', description: 'Expert cuts, shaves & beard grooming' },
  { key: 'salon',         label: 'Salon',               icon: 'color-wand-outline', color: '#8b5cf6', description: 'Hair, beauty & grooming for everyone' },
  { key: 'spa_wellness',  label: 'Spa & Wellness',      icon: 'water-outline',      color: '#10b981', description: 'Relaxation, massage & holistic care' },
  { key: 'makeup_bridal', label: 'Makeup & Bridal',     icon: 'brush-outline',      color: '#ec4899', description: 'Bridal, party makeup & beauty services' },
  { key: 'skin_derma',    label: 'Skin & Derma Clinic', icon: 'medkit-outline',     color: '#f59e0b', description: 'Advanced skin treatments & dermatology' },
];
const BIZ_NAME = { barbershop: 'Barbershop', salon: 'Salon', spa_wellness: 'Spa', makeup_bridal: 'Studio', skin_derma: 'Clinic' };

// 24 hour options — same as web HOURS_OPTIONS
const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { label: `${h}:00 ${ampm}`, value: `${String(i).padStart(2, '0')}:00` };
});
const hourLabel = (v) => HOURS_OPTIONS.find(o => o.value === v)?.label || v;

// Direct-to-Cloudinary upload using the app's signature endpoint
async function uploadToCloudinary(uri, resourceType = 'image') {
  const sigRes = await api.get(`/owner/gallery/upload-signature?resource_type=${resourceType}`);
  const { signature, timestamp, api_key, cloud_name, folder } = sigRes.data.data;
  const formData = new FormData();
  const ext = uri.split('.').pop()?.split('?')[0] || (resourceType === 'video' ? 'mp4' : 'jpg');
  formData.append('file', { uri, type: resourceType === 'video' ? 'video/mp4' : 'image/jpeg', name: `upload.${ext}` });
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', api_key);
  formData.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

/* ─── Accordion (single-open, like web) ────────────────────────── */
function Accordion({ id, activeId, onToggle, icon, iconBg, iconColor, title, subtitle, children }) {
  const { theme, isDark } = useTheme();
  const open = activeId === id;
  return (
    <View style={[a.wrap, { backgroundColor: theme.card, borderColor: open ? (isDark ? 'rgba(99,102,241,0.5)' : '#c7d2fe') : theme.border }]}>
      <TouchableOpacity style={a.header} onPress={() => onToggle(id)} activeOpacity={0.75}>
        <View style={[a.iconBubble, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[a.title, { color: theme.text }]}>{title}</Text>
          <Text style={[a.subtitle, { color: theme.subText }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
      </TouchableOpacity>
      {open && <View style={[a.body, { borderTopColor: theme.rowBorder }]}>{children}</View>}
    </View>
  );
}
const a = StyleSheet.create({
  wrap:       { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  iconBubble: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 14, fontWeight: '700' },
  subtitle:   { fontSize: 11.5, marginTop: 2 },
  body:       { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 6, borderTopWidth: 1 },
});

/* ─── Shared bits ──────────────────────────────────────────────── */
function FieldRow({ label, value }) {
  const { theme } = useTheme();
  return (
    <View style={[sh.fieldRow, { borderBottomColor: theme.rowBorder }]}>
      <Text style={[sh.fieldLabel, { color: theme.subText }]}>{label}</Text>
      <Text style={[sh.fieldValue, { color: theme.text }]}>{value || '—'}</Text>
    </View>
  );
}

function LabelInput({ label, value, onChange, placeholder, keyboard = 'default', multiline, error, disabled }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={[sh.inpLabel, { color: theme.subText }]}>{label}</Text>
      <TextInput
        style={[sh.inp, { backgroundColor: theme.input, borderColor: error ? '#ef4444' : theme.inputBorder, color: theme.text },
          multiline && { height: 84, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.placeholder} keyboardType={keyboard}
        autoCapitalize="none" multiline={!!multiline} editable={!disabled}
      />
      {!!error && <Text style={sh.inpError}>{error}</Text>}
    </View>
  );
}

function PrimaryBtn({ label, onPress, loading, icon = 'save-outline', style }) {
  return (
    <TouchableOpacity style={[sh.primaryBtn, loading && { opacity: 0.65 }, style]} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={icon} size={16} color="#fff" />}
      <Text style={sh.primaryBtnText}>{loading ? 'Saving…' : label}</Text>
    </TouchableOpacity>
  );
}

function SaveBar({ onSave, onCancel, loading }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
      <PrimaryBtn label="Save Changes" onPress={onSave} loading={loading} style={{ flex: 1, marginTop: 0 }} />
      <TouchableOpacity style={[sh.cancelBtn, { borderColor: theme.inputBorder }]} onPress={onCancel} disabled={loading}>
        <Ionicons name="close" size={15} color={theme.subText} />
        <Text style={[sh.cancelBtnText, { color: theme.subText }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// Modal list picker (used for state, district, hours)
function PickerModal({ visible, title, options, value, onSelect, onClose }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={sh.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[sh.pickerSheet, { backgroundColor: theme.card }]}>
          <Text style={[sh.pickerTitle, { color: theme.text }]}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value ?? item)}
            style={{ maxHeight: 420 }}
            renderItem={({ item }) => {
              const val = item.value ?? item;
              const label = item.label ?? item;
              const active = value === val;
              return (
                <TouchableOpacity
                  style={[sh.pickerRow, active && { backgroundColor: 'rgba(99,102,241,0.12)' }]}
                  onPress={() => { onSelect(val); onClose(); }}
                >
                  <Text style={[sh.pickerRowText, { color: active ? '#818cf8' : theme.text }]}>{label}</Text>
                  {active && <Ionicons name="checkmark" size={16} color="#818cf8" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function SelectField({ label, value, placeholder, onPress, disabled }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 13 }}>
      {!!label && <Text style={[sh.inpLabel, { color: theme.subText }]}>{label}</Text>}
      <TouchableOpacity
        style={[sh.inp, sh.selectRow, { backgroundColor: theme.input, borderColor: theme.inputBorder }, disabled && { opacity: 0.5 }]}
        onPress={onPress} disabled={disabled} activeOpacity={0.75}
      >
        <Text style={{ fontSize: 14, color: value ? theme.text : theme.placeholder }}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={15} color={theme.subText} />
      </TouchableOpacity>
    </View>
  );
}

/* ─── 1. My Profile ────────────────────────────────────────────── */
function ProfileSection() {
  const { theme } = useTheme();
  const { user, updateProfile } = useAuth();
  const { salon, fetchSalon } = useSalon();

  const [logoUploading, setLogoUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [accOpen, setAccOpen] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  }, [user]);

  const typeDef = SALON_TYPES.find(t => t.key === salon?.businessType);
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const handleLogoChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission denied', 'Gallery access is required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    setLogoUploading(true);
    try {
      const url = await uploadToCloudinary(result.assets[0].uri, 'image');
      await api.put('/owner/salon/photos', { logo: url });
      fetchSalon();
      showSuccess('Updated', 'Profile photo updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to upload photo');
    } finally { setLogoUploading(false); }
  };

  const handleSave = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email is invalid';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await updateProfile({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      showSuccess('Saved', 'Profile updated!');
      setIsEditing(false);
    } catch (err) {
      showError('Error', err.response?.data?.message || err.message || 'Failed to update profile');
    } finally { setLoading(false); }
  };

  return (
    <View>
      {/* Avatar row */}
      <View style={[p.avatarRow, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
        <TouchableOpacity onPress={handleLogoChange} disabled={logoUploading} activeOpacity={0.8}>
          {salon?.logo ? (
            <Image source={{ uri: salon.logo }} style={p.avatarImg} />
          ) : (
            <View style={[p.avatarFallback, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Ionicons name="person" size={24} color="#818cf8" />
            </View>
          )}
          <View style={p.avatarCam}>
            {logoUploading
              ? <ActivityIndicator color="#fff" size={10} />
              : <Ionicons name="camera" size={11} color="#fff" />}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[p.avatarName, { color: theme.text }]}>{user?.name || '—'}</Text>
          <Text style={[p.avatarSub, { color: theme.subText }]}>Member since {memberSince}</Text>
          {typeDef && (
            <View style={[p.typeChip, { backgroundColor: `${typeDef.color}15`, borderColor: `${typeDef.color}33` }]}>
              <Text style={[p.typeChipText, { color: typeDef.color }]}>{typeDef.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Business type card */}
      {typeDef && (
        <View style={[p.typeCard, { borderColor: `${typeDef.color}40`, backgroundColor: `${typeDef.color}08` }]}>
          <View style={[p.typeCardIcon, { backgroundColor: `${typeDef.color}18` }]}>
            <Ionicons name={typeDef.icon} size={20} color={typeDef.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[p.typeCardKicker, { color: typeDef.color }]}>YOUR BUSINESS TYPE</Text>
            <Text style={[p.typeCardLabel, { color: theme.text }]}>{typeDef.label}</Text>
            <Text style={[p.typeCardDesc, { color: theme.subText }]}>{typeDef.description}</Text>
          </View>
        </View>
      )}

      {/* Email nudge */}
      {!user?.email && !isEditing && (
        <TouchableOpacity style={p.emailNudge} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
          <Ionicons name="mail-outline" size={16} color="#a78bfa" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={p.emailNudgeTitle}>Add your email address</Text>
            <Text style={[p.emailNudgeSub, { color: theme.subText }]}>Required for booking alerts and notifications.</Text>
          </View>
          <View style={p.emailNudgeBadge}><Text style={p.emailNudgeBadgeText}>Add Now</Text></View>
        </TouchableOpacity>
      )}

      {/* Profile fields / edit form */}
      {isEditing ? (
        <View style={[p.editCard, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
          <Text style={[p.editTitle, { color: theme.text }]}>Edit Profile</Text>
          <LabelInput label="Full Name" value={form.name} onChange={t => { setForm(f => ({ ...f, name: t })); setErrors(e => ({ ...e, name: '' })); }} placeholder="Your name" error={errors.name} disabled={loading} />
          <LabelInput label="Email Address (optional)" value={form.email} onChange={t => { setForm(f => ({ ...f, email: t })); setErrors(e => ({ ...e, email: '' })); }} placeholder="your@email.com" keyboard="email-address" error={errors.email} disabled={loading} />
          <LabelInput label="Phone Number" value={form.phone} onChange={t => { setForm(f => ({ ...f, phone: t })); setErrors(e => ({ ...e, phone: '' })); }} placeholder="98765 43210" keyboard="phone-pad" error={errors.phone} disabled={loading} />
          <SaveBar loading={loading} onSave={handleSave}
            onCancel={() => { setIsEditing(false); setErrors({}); if (user) setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' }); }} />
        </View>
      ) : (
        <View>
          <FieldRow label="Name"  value={user?.name} />
          <FieldRow label="Email" value={user?.email} />
          <FieldRow label="Phone" value={user?.phone} />
          {!!salon?.address && <FieldRow label="Address" value={salon.address} />}
          <TouchableOpacity style={[sh.outlineBtn, { borderColor: theme.inputBorder }]} onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil-outline" size={14} color={theme.text} />
            <Text style={[sh.outlineBtnText, { color: theme.text }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Security sub-section — OTP-only */}
      <View style={[p.subCard, { borderColor: theme.rowBorder }]}>
        <View style={p.subCardHeader}>
          <View style={[p.subCardIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[p.subCardTitle, { color: theme.text }]}>Security</Text>
            <Text style={[p.subCardSub, { color: theme.subText }]}>Your account is secured with phone OTP — no password needed</Text>
          </View>
        </View>
        <View style={p.badgeRow}>
          <View style={[p.secBadge, { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            <Text style={[p.secBadgeText, { color: '#10b981' }]}> Active & Verified</Text>
          </View>
          <View style={[p.secBadge, { borderColor: 'rgba(59,130,246,0.4)', backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Ionicons name="call" size={12} color="#3b82f6" />
            <Text style={[p.secBadgeText, { color: '#3b82f6' }]}> Phone OTP Auth</Text>
          </View>
        </View>
      </View>

      {/* Account Information sub-accordion */}
      <View style={[p.subCard, { borderColor: theme.rowBorder }]}>
        <TouchableOpacity style={p.subCardHeader} onPress={() => { LayoutAnimation.easeInEaseOut(); setAccOpen(o => !o); }} activeOpacity={0.75}>
          <View style={[p.subCardIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
            <Ionicons name="information-circle-outline" size={15} color="#818cf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[p.subCardTitle, { color: theme.text }]}>Account Information</Text>
            <Text style={[p.subCardSub, { color: theme.subText }]}>Account type, ID and status</Text>
          </View>
          <Ionicons name={accOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.subText} />
        </TouchableOpacity>
        {accOpen && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
            {[
              { label: 'User ID',      value: user?._id ? `${String(user._id).substring(0, 16)}…` : '—' },
              { label: 'Account Type', value: typeDef ? `${typeDef.label} Owner` : 'Salon Owner' },
              { label: 'Member Since', value: memberSince },
            ].map(({ label, value }) => (
              <View key={label} style={[p.accRow, { backgroundColor: theme.cardAlt }]}>
                <Text style={[p.accLabel, { color: theme.subText }]}>{label}</Text>
                <Text style={[p.accValue, { color: theme.text }]}>{value}</Text>
              </View>
            ))}
            <View style={[p.accRow, { backgroundColor: theme.cardAlt }]}>
              <Text style={[p.accLabel, { color: theme.subText }]}>Account Status</Text>
              <View style={p.statusBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#22c55e" />
                <Text style={p.statusBadgeText}> Active</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  avatarRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  avatarImg:      { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarCam:      { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarName:     { fontSize: 15, fontWeight: '800' },
  avatarSub:      { fontSize: 11, marginTop: 1 },
  typeChip:       { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, borderWidth: 1, marginTop: 5 },
  typeChipText:   { fontSize: 10, fontWeight: '700' },
  typeCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 2, marginBottom: 12 },
  typeCardIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeCardKicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  typeCardLabel:  { fontSize: 14, fontWeight: '800', marginTop: 1 },
  typeCardDesc:   { fontSize: 11.5, marginTop: 1 },
  emailNudge:     { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', backgroundColor: 'rgba(124,58,237,0.06)', marginBottom: 12 },
  emailNudgeTitle:{ fontSize: 13, fontWeight: '700', color: '#a78bfa' },
  emailNudgeSub:  { fontSize: 11.5, marginTop: 1 },
  emailNudgeBadge:{ alignSelf: 'center', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.15)' },
  emailNudgeBadgeText: { fontSize: 11, fontWeight: '800', color: '#a78bfa' },
  editCard:       { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  editTitle:      { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  subCard:        { borderRadius: 14, borderWidth: 1, marginTop: 12, overflow: 'hidden' },
  subCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 13 },
  subCardIcon:    { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  subCardTitle:   { fontSize: 13, fontWeight: '700' },
  subCardSub:     { fontSize: 11, marginTop: 1 },
  badgeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 13, paddingBottom: 13 },
  secBadge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  secBadgeText:   { fontSize: 11.5, fontWeight: '700' },
  accRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 11, borderRadius: 10 },
  accLabel:       { fontSize: 12.5 },
  accValue:       { fontSize: 12.5, fontWeight: '600' },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(34,197,94,0.15)' },
  statusBadgeText:{ fontSize: 11, fontWeight: '700', color: '#22c55e' },
});

/* ─── 2. Business Information ──────────────────────────────────── */
function BusinessInfoSection() {
  const { theme } = useTheme();
  const { salon, updateSalon } = useSalon();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [form, setForm] = useState({ name: '', description: '', phone: '', email: '', address: '', city: '', district: '', state: '' });
  const [videoUploading, setVideoUploading] = useState(false);
  const [pickState, setPickState]       = useState(false);
  const [pickDistrict, setPickDistrict] = useState(false);

  const typeDef = SALON_TYPES.find(t => t.key === salon?.businessType);
  const bizName = BIZ_NAME[typeDef?.key] || 'Business';

  useEffect(() => {
    if (salon) setForm({
      name: salon.name || '', description: salon.description || '',
      phone: salon.phone || '', email: salon.email || '',
      address: salon.address || '', city: salon.city || '',
      district: salon.district || '', state: salon.state || '',
    });
  }, [salon]);

  const coords = salon?.location?.coordinates;
  const [lng, lat] = coords?.length === 2 ? coords : [null, null];
  const hasCoords = lat !== null && lng !== null;

  const handleSave = async () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = `${bizName} name is required`;
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await updateSalon(form);
      showSuccess('Saved', 'Business information updated!');
      setEditing(false);
    } catch (err) {
      showError('Error', err.response?.data?.message || err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleVideoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission denied', 'Gallery access is required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) { showError('Too large', 'Video must be under 100MB'); return; }
    setVideoUploading(true);
    try {
      const url = await uploadToCloudinary(asset.uri, 'video');
      await updateSalon({ videoUrl: url });
      showSuccess('Updated', 'Business video updated!');
    } catch (err) {
      showError('Error', err.message || 'Video upload failed');
    } finally { setVideoUploading(false); }
  };

  const cover = salon?.coverPhoto || salon?.photos?.[0]?.url || salon?.photos?.[0];

  if (!editing) {
    return (
      <View>
        {!!cover && typeof cover === 'string' && (
          <Image source={{ uri: cover }} style={b.cover} />
        )}

        {/* Business tour video */}
        <View style={[b.videoBlock, { borderBottomColor: theme.rowBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="videocam-outline" size={15} color={theme.subText} />
            <Text style={{ fontSize: 13, color: theme.subText }}>Business Tour Video</Text>
          </View>
          {salon?.videoUrl ? (
            <Video source={{ uri: salon.videoUrl }} style={b.video} useNativeControls resizeMode={ResizeMode.CONTAIN} />
          ) : (
            <Text style={{ fontSize: 13, color: theme.placeholder, marginBottom: 8 }}>No video uploaded yet</Text>
          )}
          <TouchableOpacity style={[sh.outlineBtn, { borderColor: 'rgba(99,102,241,0.4)', marginTop: 8 }]} onPress={handleVideoUpload} disabled={videoUploading}>
            {videoUploading ? <ActivityIndicator size="small" color="#818cf8" /> : <Ionicons name="videocam-outline" size={14} color="#818cf8" />}
            <Text style={[sh.outlineBtnText, { color: '#818cf8' }]}>{videoUploading ? 'Uploading…' : salon?.videoUrl ? 'Replace Video' : 'Upload Video'}</Text>
          </TouchableOpacity>
        </View>

        <FieldRow label={`${bizName} Name`} value={form.name} />
        <FieldRow label="Description" value={form.description} />
        <FieldRow label="Phone"    value={form.phone} />
        <FieldRow label="Email"    value={form.email} />
        <FieldRow label="State"    value={form.state} />
        <FieldRow label="District" value={form.district} />
        <FieldRow label="City"     value={form.city} />
        <FieldRow label="Locality" value={form.address} />

        {/* Business type row */}
        <View style={[sh.fieldRow, { borderBottomColor: theme.rowBorder }]}>
          <Text style={[sh.fieldLabel, { color: theme.subText }]}>Business Type</Text>
          {typeDef ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name={typeDef.icon} size={14} color={typeDef.color} />
              <Text style={[sh.fieldValue, { color: theme.text, flex: 0 }]}>{typeDef.label}</Text>
            </View>
          ) : (
            <Text style={[sh.fieldValue, { color: theme.placeholder }]}>—</Text>
          )}
        </View>

        {/* Location */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="globe-outline" size={15} color={theme.subText} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Business Location</Text>
          </View>
          {hasCoords ? (
            <View style={[b.mapCard, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
              <Text style={[b.coords, { color: theme.subText }]}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)}>
                <Text style={b.mapsLink}>Open in Google Maps →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[b.mapEmpty, { borderColor: theme.rowBorder, backgroundColor: theme.cardAlt }]}>
              <Text style={{ fontSize: 13, color: theme.placeholder }}>No coordinates saved for this business</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={[sh.outlineBtn, { borderColor: theme.inputBorder, marginTop: 14 }]} onPress={() => setEditing(true)}>
          <Ionicons name="pencil-outline" size={14} color={theme.text} />
          <Text style={[sh.outlineBtnText, { color: theme.text }]}>Edit Business Info</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <LabelInput label={`${bizName} Name`} value={form.name} onChange={t => { setForm(f => ({ ...f, name: t })); setErrors(e => ({ ...e, name: '' })); }} placeholder={`Your ${bizName.toLowerCase()} name`} error={errors.name} disabled={loading} />
      <LabelInput label="Description" value={form.description} onChange={t => setForm(f => ({ ...f, description: t }))} placeholder="Describe your business…" multiline disabled={loading} />

      {typeDef && (
        <View style={{ marginBottom: 13 }}>
          <Text style={[sh.inpLabel, { color: theme.subText }]}>Business Type</Text>
          <View style={[sh.inp, sh.selectRow, { backgroundColor: theme.cardAlt, borderColor: theme.inputBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={typeDef.icon} size={15} color={typeDef.color} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{typeDef.label}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.placeholder }}>Set during registration</Text>
          </View>
        </View>
      )}

      <LabelInput label="Phone" value={form.phone} onChange={t => { setForm(f => ({ ...f, phone: t })); setErrors(e => ({ ...e, phone: '' })); }} placeholder="+91 98765 43210" keyboard="phone-pad" error={errors.phone} disabled={loading} />
      <LabelInput label="Email" value={form.email} onChange={t => setForm(f => ({ ...f, email: t }))} placeholder="business@email.com" keyboard="email-address" disabled={loading} />

      <SelectField label="State" value={form.state} placeholder="Select state" onPress={() => setPickState(true)} disabled={loading} />
      <SelectField label="District" value={form.district} placeholder={form.state ? 'Select district' : 'Select state first'} onPress={() => setPickDistrict(true)} disabled={loading || !form.state} />

      <LabelInput label="City" value={form.city} onChange={t => setForm(f => ({ ...f, city: t }))} placeholder="City" disabled={loading} />
      <LabelInput label="Locality" value={form.address} onChange={t => setForm(f => ({ ...f, address: t }))} placeholder="Area / Street address" disabled={loading} />

      <SaveBar loading={loading} onSave={handleSave}
        onCancel={() => {
          if (salon) setForm({ name: salon.name || '', description: salon.description || '', phone: salon.phone || '', email: salon.email || '', address: salon.address || '', city: salon.city || '', district: salon.district || '', state: salon.state || '' });
          setErrors({}); setEditing(false);
        }} />

      <PickerModal visible={pickState} title="Select State" options={INDIAN_STATES} value={form.state}
        onSelect={v => setForm(f => ({ ...f, state: v, district: '' }))} onClose={() => setPickState(false)} />
      <PickerModal visible={pickDistrict} title="Select District" options={STATE_DISTRICTS[form.state] || []} value={form.district}
        onSelect={v => setForm(f => ({ ...f, district: v }))} onClose={() => setPickDistrict(false)} />
    </View>
  );
}

const b = StyleSheet.create({
  cover:     { width: '100%', height: 150, borderRadius: 14, marginBottom: 12 },
  videoBlock:{ paddingBottom: 14, borderBottomWidth: 1, marginBottom: 4 },
  video:     { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#000' },
  mapCard:   { borderRadius: 12, borderWidth: 1, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coords:    { fontSize: 12, fontFamily: 'monospace' },
  mapsLink:  { fontSize: 12, fontWeight: '700', color: '#818cf8' },
  mapEmpty:  { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', height: 72, alignItems: 'center', justifyContent: 'center' },
});

/* ─── 3. Notifications ─────────────────────────────────────────── */
const NOTIF_ITEMS = [
  { name: 'emailNotifications',  label: 'Email Notifications',  desc: 'Receive booking updates via email' },
  { name: 'smsNotifications',    label: 'SMS Notifications',    desc: 'Receive booking updates via SMS' },
  { name: 'bookingReminders',    label: 'Booking Reminders',    desc: 'Get notified about upcoming bookings' },
  { name: 'cancelledBookings',   label: 'Cancellation Alerts',  desc: 'Notify when a booking is cancelled' },
  { name: 'reviewNotifications', label: 'New Reviews',          desc: 'Get notified when a customer leaves a review' },
];

function NotificationsSection() {
  const { theme } = useTheme();
  const [prefs, setPrefs] = useState({ emailNotifications: true, smsNotifications: true, bookingReminders: true, cancelledBookings: true, reviewNotifications: true });
  const [permission, setPermission] = useState('undetermined');

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREFS_KEY).then(v => { if (v) try { setPrefs(p => ({ ...p, ...JSON.parse(v) })); } catch {} });
    Notifications.getPermissionsAsync().then(({ status }) => setPermission(status));
  }, []);

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermission(status);
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
      showSuccess('Saved', 'Notification preferences saved!');
    } catch { showError('Error', 'Failed to save'); }
  };

  const granted = permission === 'granted';
  const denied  = permission === 'denied';

  return (
    <View>
      {/* Push status card */}
      <View style={[n.pushCard, {
        borderColor: granted ? 'rgba(34,197,94,0.4)' : denied ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)',
        backgroundColor: granted ? 'rgba(34,197,94,0.08)' : denied ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
      }]}>
        <Ionicons name={granted ? 'checkmark-circle' : 'notifications-off-outline'} size={20} color={granted ? '#22c55e' : '#f59e0b'} />
        <View style={{ flex: 1 }}>
          <Text style={[n.pushTitle, { color: theme.text }]}>
            {granted ? 'Push notifications enabled' : denied ? 'Push notifications blocked' : 'Enable push notifications'}
          </Text>
          <Text style={[n.pushSub, { color: theme.subText }]}>
            {granted ? 'You will be alerted for new bookings.' : denied ? 'Allow in system settings to receive alerts.' : 'Tap Allow to get instant booking alerts.'}
          </Text>
        </View>
        {!granted && (
          <TouchableOpacity style={n.allowBtn} onPress={denied ? () => Linking.openSettings() : requestPermission}>
            <Text style={n.allowBtnText}>{denied ? 'Settings' : 'Allow'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {NOTIF_ITEMS.map(item => (
        <View key={item.name} style={[n.row, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[n.rowLabel, { color: theme.text }]}>{item.label}</Text>
            <Text style={[n.rowDesc, { color: theme.subText }]}>{item.desc}</Text>
          </View>
          <Switch
            value={prefs[item.name]}
            onValueChange={v => setPrefs(pr => ({ ...pr, [item.name]: v }))}
            trackColor={{ false: 'rgba(128,128,160,0.3)', true: 'rgba(99,102,241,0.6)' }}
            thumbColor={prefs[item.name] ? '#6366f1' : '#9ca3af'}
          />
        </View>
      ))}

      <PrimaryBtn label="Save Preferences" onPress={handleSave} />
    </View>
  );
}

const n = StyleSheet.create({
  pushCard:    { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 14, borderWidth: 2, marginBottom: 12 },
  pushTitle:   { fontSize: 13, fontWeight: '700' },
  pushSub:     { fontSize: 11.5, marginTop: 1 },
  allowBtn:    { backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  allowBtnText:{ color: '#fff', fontSize: 12.5, fontWeight: '700' },
  row:         { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  rowLabel:    { fontSize: 13.5, fontWeight: '600' },
  rowDesc:     { fontSize: 11.5, marginTop: 1 },
});

/* ─── 4. App Preferences ───────────────────────────────────────── */
function AppPreferencesSection() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [prefs, setPrefs] = useState({ theme: isDark ? 'dark' : 'light', language: language || 'en', timeFormat: '12h', dateFormat: 'DD/MM/YYYY' });

  useEffect(() => {
    AsyncStorage.getItem(APP_PREFS_KEY).then(v => {
      if (!v) return;
      try {
        const s = JSON.parse(v);
        setPrefs(p => ({ ...p, ...s, theme: isDark ? 'dark' : 'light' }));
      } catch {}
    });
  }, []);

  const FIELDS = [
    { name: 'theme',      label: 'Theme',       options: [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto (System)']] },
    { name: 'language',   label: 'Language',    options: [['en', 'English'], ['hi', 'हिंदी']] },
    { name: 'timeFormat', label: 'Time Format', options: [['12h', '12 Hour (AM/PM)'], ['24h', '24 Hour']] },
    { name: 'dateFormat', label: 'Date Format', options: [['DD/MM/YYYY', 'DD/MM/YYYY'], ['MM/DD/YYYY', 'MM/DD/YYYY'], ['YYYY-MM-DD', 'YYYY-MM-DD']] },
  ];

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
      const wantDark = prefs.theme === 'dark' || (prefs.theme === 'auto' && Appearance.getColorScheme() === 'dark');
      if (wantDark !== isDark) toggleTheme();
      setLanguage(prefs.language);
      showSuccess('Saved', 'App preferences saved!');
    } catch { showError('Error', 'Failed to save'); }
  };

  return (
    <View>
      {FIELDS.map(({ name, label, options }) => (
        <View key={name} style={{ marginBottom: 13 }}>
          <Text style={[sh.inpLabel, { color: theme.subText }]}>{label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map(([val, text]) => {
              const active = prefs[name] === val;
              return (
                <TouchableOpacity key={val}
                  style={[ap.opt, { backgroundColor: theme.input, borderColor: theme.inputBorder }, active && ap.optActive]}
                  onPress={() => setPrefs(pr => ({ ...pr, [name]: val }))}
                >
                  {active && <Ionicons name="checkmark-circle" size={13} color="#818cf8" style={{ marginRight: 4 }} />}
                  <Text style={[ap.optText, { color: active ? '#818cf8' : theme.subText }, active && { fontWeight: '700' }]}>{text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <PrimaryBtn label="Save Preferences" onPress={handleSave} />
    </View>
  );
}

const ap = StyleSheet.create({
  opt:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  optActive: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)' },
  optText:   { fontSize: 12.5, fontWeight: '500' },
});

/* ─── Option card (booking window / mode) ──────────────────────── */
function OptionCard({ active, onPress, icon, label, desc }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[oc.card, { backgroundColor: theme.cardAlt, borderColor: theme.inputBorder }, active && oc.cardActive]}
      onPress={onPress} activeOpacity={0.8}
    >
      {!!icon && (
        <View style={[oc.icon, { backgroundColor: active ? 'rgba(99,102,241,0.18)' : theme.input }]}>
          <Ionicons name={icon} size={17} color={active ? '#818cf8' : theme.subText} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[oc.label, { color: active ? '#818cf8' : theme.text }]}>{label}</Text>
        <Text style={[oc.desc, { color: theme.subText }]}>{desc}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={19} color="#6366f1" />}
    </TouchableOpacity>
  );
}
const oc = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, borderWidth: 2, marginBottom: 8 },
  cardActive: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' },
  icon:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label:      { fontSize: 13.5, fontWeight: '700' },
  desc:       { fontSize: 11.5, marginTop: 1 },
});

/* ─── 5. Booking Window ────────────────────────────────────────── */
const WINDOW_OPTIONS = [
  { value: 0,  label: 'Today only',      desc: 'Customers can only book for the current day' },
  { value: 1,  label: 'Today + Tomorrow', desc: 'Default — customers can book up to 1 day ahead' },
  { value: 3,  label: 'Next 3 days',      desc: 'Today and 3 days in advance' },
  { value: 7,  label: 'Next 7 days',      desc: 'Today and 7 days in advance' },
  { value: 14, label: 'Next 14 days',     desc: 'Today and 2 weeks in advance' },
  { value: 30, label: 'Next 30 days',     desc: 'Today and 30 days in advance' },
];

function BookingWindowSection() {
  const { theme } = useTheme();
  const { salon, updateSalon } = useSalon();
  const [days, setDays] = useState(salon?.advanceBookingDays ?? 1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setDays(salon?.advanceBookingDays ?? 1); }, [salon?.advanceBookingDays]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSalon({ advanceBookingDays: days });
      showSuccess('Saved', 'Booking window updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <View>
      <Text style={[sh.sectionIntro, { color: theme.subText }]}>
        Control how far in advance customers can book appointments at your business.
      </Text>
      {WINDOW_OPTIONS.map(opt => (
        <OptionCard key={opt.value} active={days === opt.value} onPress={() => setDays(opt.value)} label={opt.label} desc={opt.desc} />
      ))}
      <PrimaryBtn label="Save Booking Window" onPress={handleSave} loading={loading} />
    </View>
  );
}

/* ─── 6. Booking Mode ──────────────────────────────────────────── */
function BookingModeSection() {
  const { theme } = useTheme();
  const { salon, updateSalon } = useSalon();
  const [mode, setMode] = useState(salon?.bookingMode || 'sequential');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMode(salon?.bookingMode || 'sequential'); }, [salon?.bookingMode]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSalon({ bookingMode: mode });
      showSuccess('Saved', 'Booking mode updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <View>
      <Text style={[sh.sectionIntro, { color: theme.subText }]}>
        Choose how appointment slots are assigned to customers.
      </Text>
      <OptionCard active={mode === 'flexible'} onPress={() => setMode('flexible')} icon="calendar-outline"
        label="Flexible (Customer Picks)" desc="Customer chooses any available time slot from all open slots." />
      <OptionCard active={mode === 'sequential'} onPress={() => setMode('sequential')} icon="play-forward-outline"
        label="Sequential (Next in Line)" desc="Bookings are assigned one after another. Customer gets the next open slot automatically — no gap." />
      <PrimaryBtn label="Save Booking Mode" onPress={handleSave} loading={loading} />
    </View>
  );
}

/* ─── 7. Auto-Confirm ──────────────────────────────────────────── */
function AutoConfirmSection() {
  const { theme } = useTheme();
  const { salon, updateSalon } = useSalon();
  const [enabled, setEnabled] = useState(salon?.autoConfirmBookings !== false);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && salon) {
      setEnabled(salon.autoConfirmBookings !== false);
      initialized.current = true;
    }
  }, [salon]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSalon({ autoConfirmBookings: enabled });
      showSuccess('Saved', 'Auto-confirm setting saved!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <View>
      <Text style={[sh.sectionIntro, { color: theme.subText }]}>
        When enabled, cash bookings are confirmed instantly. When disabled, each booking stays pending until you manually confirm it.
      </Text>
      <View style={[ac.card, {
        borderColor: enabled ? 'rgba(34,197,94,0.5)' : theme.inputBorder,
        backgroundColor: enabled ? 'rgba(34,197,94,0.08)' : theme.cardAlt,
      }]}>
        <View style={{ flex: 1 }}>
          <Text style={[ac.title, { color: enabled ? '#22c55e' : theme.text }]}>
            {enabled ? 'Auto-Confirm is ON' : 'Auto-Confirm is OFF'}
          </Text>
          <Text style={[ac.sub, { color: theme.subText }]}>
            {enabled ? 'New bookings are confirmed automatically.' : 'You must manually confirm each new booking.'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: 'rgba(128,128,160,0.3)', true: 'rgba(34,197,94,0.5)' }}
          thumbColor={enabled ? '#22c55e' : '#9ca3af'}
        />
      </View>
      <PrimaryBtn label="Save Setting" onPress={handleSave} loading={loading} />
    </View>
  );
}
const ac = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 14, borderWidth: 2, marginBottom: 8 },
  title: { fontSize: 13.5, fontWeight: '700' },
  sub:   { fontSize: 11.5, marginTop: 1 },
});

/* ─── 8. Salon Photos ──────────────────────────────────────────── */
function PhotosSection() {
  const { theme } = useTheme();
  const { salon, fetchSalon } = useSalon();
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const list = (salon?.photos || []).map(ph => (typeof ph === 'string' ? ph : ph?.url)).filter(Boolean);
    setPhotos(list);
  }, [salon]);

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission denied', 'Gallery access is required to upload photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const formData = new FormData();
      result.assets.forEach((asset, i) => {
        formData.append('photos', { uri: asset.uri, name: `photo_${i}.jpg`, type: 'image/jpeg' });
      });
      const res = await api.post('/owner/salon/upload-photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrls = res.data.data?.photos || res.data.data?.urls || [];
      const updated = [...photos, ...newUrls];
      await api.put('/owner/salon/photos', { photos: updated });
      setPhotos(updated);
      fetchSalon();
      showSuccess('Uploaded', `${newUrls.length} photo${newUrls.length !== 1 ? 's' : ''} added!`);
    } catch (err) {
      showError('Error', err.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDelete = (url) => {
    Alert.alert('Remove Photo', 'Remove this photo from your business?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const updated = photos.filter(u => u !== url);
            await api.put('/owner/salon/photos', { photos: updated });
            setPhotos(updated);
            fetchSalon();
            showSuccess('Removed', 'Photo removed');
          } catch (err) {
            showError('Error', err.message || 'Failed to remove photo');
          }
        },
      },
    ]);
  };

  return (
    <View>
      <Text style={[sh.sectionIntro, { color: theme.subText }]}>{photos.length} photo{photos.length !== 1 ? 's' : ''} — customers see these on your business page.</Text>
      {photos.length > 0 && (
        <View style={ph.grid}>
          {photos.map((url, i) => (
            <View key={i} style={ph.thumb}>
              <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
              <TouchableOpacity style={ph.del} onPress={() => handleDelete(url)}>
                <Ionicons name="trash" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity style={[sh.outlineBtn, { borderColor: 'rgba(99,102,241,0.4)' }]} onPress={handlePickImages} disabled={uploading}>
        {uploading ? <ActivityIndicator size="small" color="#818cf8" /> : <Ionicons name="image-outline" size={15} color="#818cf8" />}
        <Text style={[sh.outlineBtnText, { color: '#818cf8' }]}>{uploading ? 'Uploading…' : 'Add Photos'}</Text>
      </TouchableOpacity>
    </View>
  );
}
const ph = StyleSheet.create({
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  thumb: { width: 88, height: 88, borderRadius: 10, overflow: 'hidden' },
  del:   { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 },
});

/* ─── Calendar date-picker modal (tap a date, like the website) ── */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_LABELS = ['S','M','T','W','T','F','S'];

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
// YYYY-MM-DD → DD/MM/YYYY for display
function toDDMMYYYY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function CalendarModal({ visible, value, onSelect, onClose, minToday = true }) {
  const { theme } = useTheme();
  const now = new Date();
  const init = value ? new Date(value + 'T12:00:00') : now;
  const [viewYear, setViewYear]   = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  useEffect(() => {
    if (!visible) return;
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [visible]);

  const firstDow  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayISO  = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMon }, (_, i) => i + 1),
  ];

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={sh.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[cal.sheet, { backgroundColor: theme.card }]}>
          {/* Month header */}
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={[cal.headerTitle, { color: theme.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Week labels */}
          <View style={cal.weekRow}>
            {WEEK_LABELS.map((w, i) => (
              <Text key={i} style={[cal.weekLabel, { color: theme.subText }]}>{w}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={cal.cell} />;
              const iso      = toISO(viewYear, viewMonth, day);
              const disabled = minToday && iso < todayISO;
              const selected = value === iso;
              const isToday  = iso === todayISO;
              return (
                <TouchableOpacity
                  key={iso}
                  style={[cal.cell, selected && cal.cellSelected, !selected && isToday && cal.cellToday]}
                  disabled={disabled}
                  onPress={() => { onSelect(iso); onClose(); }}
                >
                  <Text style={[
                    cal.cellText,
                    { color: disabled ? theme.placeholder : selected ? '#fff' : isToday ? '#818cf8' : theme.text },
                    (selected || isToday) && { fontWeight: '800' },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
const cal = StyleSheet.create({
  sheet:        { borderRadius: 18, padding: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle:  { fontSize: 15, fontWeight: '800' },
  navBtn:       { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,160,0.12)' },
  weekRow:      { flexDirection: 'row', marginBottom: 4 },
  weekLabel:    { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 99 },
  cellSelected: { backgroundColor: '#6366f1' },
  cellToday:    { borderWidth: 1.5, borderColor: 'rgba(129,140,248,0.5)' },
  cellText:     { fontSize: 13.5 },
});

/* ─── 9. Closed Dates / Holidays ───────────────────────────────── */
function ClosedDatesSection() {
  const { theme } = useTheme();
  const [holidays, setHolidays] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showCal, setShowCal] = useState(false);

  useEffect(() => {
    api.get('/owner/salon')
      .then(res => setHolidays(res.data.data?.workingHours?.holidays || res.data.data?.holidays || []))
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!newDate) { showError('Pick a date', 'Tap the date field and choose a day from the calendar'); return; }
    setAdding(true);
    try {
      const res = await api.post('/owner/salon/holidays', { date: newDate, reason: newReason.trim() });
      setHolidays(res.data.data.holidays);
      setNewDate(''); setNewReason('');
      showSuccess('Added', 'Closed date added!');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to add closed date');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const res = await api.delete(`/owner/salon/holidays/${id}`);
      setHolidays(res.data.data.holidays);
      showSuccess('Removed', 'Closed date removed');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to remove date');
    } finally { setDeleting(null); }
  };

  return (
    <View>
      <Text style={[sh.sectionIntro, { color: theme.subText }]}>
        Mark specific dates as closed (e.g. holidays, events). Customers cannot book on these dates.
      </Text>

      <View style={[cd.addCard, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
        <Text style={[cd.addTitle, { color: theme.text }]}>Add Closed Date</Text>
        <View style={{ marginBottom: 13 }}>
          <Text style={[sh.inpLabel, { color: theme.subText }]}>Date</Text>
          <TouchableOpacity
            style={[sh.inp, sh.selectRow, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}
            onPress={() => setShowCal(true)} disabled={adding} activeOpacity={0.75}
          >
            <Text style={{ fontSize: 14, color: newDate ? theme.text : theme.placeholder }}>
              {newDate ? toDDMMYYYY(newDate) : 'DD/MM/YYYY — tap to pick'}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={theme.subText} />
          </TouchableOpacity>
        </View>
        <LabelInput label="Reason (optional)" value={newReason} onChange={setNewReason} placeholder="e.g. Diwali, Owner holiday" disabled={adding} />
        <PrimaryBtn label="Add Closed Date" icon="add" onPress={handleAdd} loading={adding} />
      </View>

      <CalendarModal visible={showCal} value={newDate} onSelect={setNewDate} onClose={() => setShowCal(false)} />

      {holidays.length === 0 ? (
        <Text style={{ fontSize: 13, color: theme.placeholder, textAlign: 'center', paddingVertical: 12 }}>No closed dates set.</Text>
      ) : (
        [...holidays].sort((x, y) => new Date(x.date) - new Date(y.date)).map(h => {
          const d = new Date(h.date);
          const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          return (
            <View key={h._id} style={cd.row}>
              <View style={{ flex: 1 }}>
                <Text style={cd.rowDate}>{dateStr}</Text>
                {!!h.reason && <Text style={cd.rowReason}>{h.reason}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(h._id)} disabled={deleting === h._id} style={{ padding: 6 }}>
                {deleting === h._id
                  ? <ActivityIndicator size="small" color="#ef4444" />
                  : <Ionicons name="trash-outline" size={17} color="#ef4444" />}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}
const cd = StyleSheet.create({
  addCard:  { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  addTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', marginBottom: 8 },
  rowDate:  { fontSize: 13.5, fontWeight: '700', color: '#f87171' },
  rowReason:{ fontSize: 11.5, color: '#fca5a5', marginTop: 1 },
});

/* ─── 10. Working Hours (per-day, like web) ────────────────────── */
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_HOURS = DAY_NAMES.map(day => ({ day, isOpen: day !== 'Sunday', openTime: '09:00', closeTime: '20:00' }));

function WorkingHoursSection() {
  const { theme } = useTheme();
  const [hours, setHours]   = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [picker, setPicker]   = useState(null); // { index, field } | null

  useEffect(() => {
    api.get('/owner/working-hours')
      .then(res => {
        const obj = res.data.data?.workingHours;
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          setHours(DAY_NAMES.map(dayName => {
            const v = obj[dayName.toLowerCase()] || {};
            return { day: dayName, isOpen: !v.isClosed, openTime: v.open || '09:00', closeTime: v.close || '20:00' };
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (index) => setHours(prev => prev.map((h, i) => i === index ? { ...h, isOpen: !h.isOpen } : h));
  const setTime   = (index, field, value) => setHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));

  const handleSave = async () => {
    setSaving(true);
    try {
      const workingHoursObj = {};
      hours.forEach(h => {
        workingHoursObj[h.day.toLowerCase()] = { open: h.openTime, close: h.closeTime, isClosed: !h.isOpen };
      });
      await api.put('/owner/working-hours', { workingHours: workingHoursObj });
      showSuccess('Saved', 'Working hours updated!');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to save working hours');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <ActivityIndicator color="#6366f1" style={{ paddingVertical: 24 }} />;
  }

  return (
    <View>
      <Text style={[sh.sectionIntro, { color: theme.subText }]}>
        Set your open and close times for each day of the week.
      </Text>
      {hours.map((item, index) => (
        <View key={item.day} style={[wh.dayCard, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
          <View style={wh.dayHeader}>
            <Text style={[wh.dayName, { color: theme.text }]}>{item.day}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[wh.dayStatus, { color: item.isOpen ? '#22c55e' : theme.placeholder }]}>
                {item.isOpen ? 'Open' : 'Closed'}
              </Text>
              <Switch
                value={item.isOpen}
                onValueChange={() => toggleDay(index)}
                trackColor={{ false: 'rgba(128,128,160,0.3)', true: 'rgba(99,102,241,0.6)' }}
                thumbColor={item.isOpen ? '#6366f1' : '#9ca3af'}
              />
            </View>
          </View>
          {item.isOpen && (
            <View style={wh.timeRow}>
              <TouchableOpacity style={[wh.timeBtn, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                onPress={() => setPicker({ index, field: 'openTime' })}>
                <Text style={[wh.timeBtnText, { color: theme.text }]}>{hourLabel(item.openTime)}</Text>
                <Ionicons name="chevron-down" size={13} color={theme.subText} />
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: theme.placeholder }}>to</Text>
              <TouchableOpacity style={[wh.timeBtn, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                onPress={() => setPicker({ index, field: 'closeTime' })}>
                <Text style={[wh.timeBtnText, { color: theme.text }]}>{hourLabel(item.closeTime)}</Text>
                <Ionicons name="chevron-down" size={13} color={theme.subText} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      <PrimaryBtn label="Save Working Hours" onPress={handleSave} loading={saving} />

      <PickerModal
        visible={!!picker}
        title={picker?.field === 'openTime' ? 'Opening Time' : 'Closing Time'}
        options={HOURS_OPTIONS}
        value={picker ? hours[picker.index][picker.field] : null}
        onSelect={v => picker && setTime(picker.index, picker.field, v)}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}
const wh = StyleSheet.create({
  dayCard:   { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  dayName:   { fontSize: 13.5, fontWeight: '700' },
  dayStatus: { fontSize: 11.5, fontWeight: '700' },
  timeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  timeBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  timeBtnText: { fontSize: 13, fontWeight: '600' },
});

/* ─── 11. Privacy & Security ───────────────────────────────────── */
const SHIELDS = [
  { icon: 'lock-closed-outline',     title: 'Data Encryption',  desc: 'All your data is encrypted end-to-end and stored securely.',      color: '#818cf8' },
  { icon: 'ban-outline',             title: 'No Data Sharing',  desc: 'We never share your information with third parties.',             color: '#f87171' },
  { icon: 'shield-checkmark-outline', title: 'Security Updates', desc: 'Regular patches and security updates are applied automatically.', color: '#34d399' },
  { icon: 'key-outline',             title: 'Token Security',   desc: 'Auth tokens expire automatically and refresh securely.',          color: '#a78bfa' },
];

function PrivacySection() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [step, setStep] = useState(1);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.post('/owner/auth/delete-account');
      showSuccess('Deleted', 'Account deleted. Goodbye!');
      logout();
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Could not delete account. Try again.');
    } finally { setDeleting(false); }
  };

  return (
    <View>
      {SHIELDS.map(({ icon, title, desc, color }) => (
        <View key={title} style={[pv.shield, { backgroundColor: theme.cardAlt, borderColor: theme.rowBorder }]}>
          <View style={[pv.shieldIcon, { backgroundColor: `${color}1f` }]}>
            <Ionicons name={icon} size={15} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[pv.shieldTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[pv.shieldDesc, { color: theme.subText }]}>{desc}</Text>
          </View>
        </View>
      ))}

      <View style={[{ borderTopWidth: 1, borderTopColor: theme.rowBorder, marginTop: 8, paddingTop: 12 }]}>
        {!showDelete ? (
          <TouchableOpacity style={pv.deleteBtn} onPress={() => { setShowDelete(true); setStep(1); }} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#f87171" />
            <View style={{ flex: 1 }}>
              <Text style={pv.deleteBtnTitle}>Delete Account</Text>
              <Text style={pv.deleteBtnSub}>Permanently remove your account and all data</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color="#f87171" />
          </TouchableOpacity>
        ) : (
          <View style={pv.deleteBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={pv.deleteBoxTitle}>Delete Account Forever</Text>
              <TouchableOpacity onPress={() => { setShowDelete(false); setStep(1); }}>
                <Ionicons name="close" size={16} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {step === 1 ? (
              <>
                <Text style={pv.deleteWarn}>This will permanently delete:</Text>
                {['Your owner account and profile', 'Your business listing and all its services', 'All customer reviews on your business', 'All booking history'].map(item => (
                  <Text key={item} style={pv.deleteItem}>•  {item}</Text>
                ))}
                <Text style={[pv.deleteWarn, { marginTop: 8, fontSize: 11.5 }]}>This action cannot be undone.</Text>
                <TouchableOpacity style={pv.deleteConfirm} onPress={() => setStep(2)}>
                  <Text style={pv.deleteConfirmText}>I understand, continue</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={pv.deleteWarn}>Are you sure? This will permanently delete your account and all its data.</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={[sh.cancelBtn, { borderColor: theme.inputBorder, flex: 1 }]} onPress={() => setStep(1)}>
                    <Text style={[sh.cancelBtnText, { color: theme.subText }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[pv.deleteConfirm, { flex: 1, marginTop: 0 }]} onPress={handleDelete} disabled={deleting}>
                    {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pv.deleteConfirmText}>Delete Forever</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
const pv = StyleSheet.create({
  shield:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 13, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  shieldIcon:  { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  shieldTitle: { fontSize: 13, fontWeight: '700' },
  shieldDesc:  { fontSize: 11.5, marginTop: 1, lineHeight: 16 },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteBtnTitle: { fontSize: 13, fontWeight: '700', color: '#f87171' },
  deleteBtnSub:   { fontSize: 11, color: '#fca5a5', marginTop: 1 },
  deleteBox:      { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)', padding: 14 },
  deleteBoxTitle: { fontSize: 13.5, fontWeight: '800', color: '#f87171' },
  deleteWarn:     { fontSize: 12.5, fontWeight: '600', color: '#f87171', marginBottom: 4 },
  deleteItem:     { fontSize: 11.5, color: '#fca5a5', marginTop: 3, marginLeft: 4 },
  deleteConfirm:  { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  deleteConfirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

/* ─── 12. About ────────────────────────────────────────────────── */
function AboutSection() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  return (
    <View>
      {[
        { label: 'App Name', value: 'GlowLoox' },
        { label: 'Version',  value: '1.0.0' },
        { label: 'Platform', value: 'Android (Owner App)' },
        { label: 'Support',  value: 'glowloox@gmail.com' },
      ].map(({ label, value }) => <FieldRow key={label} label={label} value={value} />)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Legal')}>
          <Text style={ab.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Legal')}>
          <Text style={ab.link}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:glowloox@gmail.com')}>
          <Text style={ab.link}>Help Center</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const ab = StyleSheet.create({
  link: { fontSize: 12.5, fontWeight: '700', color: '#818cf8' },
});

/* ─── Main screen ──────────────────────────────────────────────── */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { salon } = useSalon();
  const [activeId, setActiveId] = useState(null);

  useFocusEffect(useCallback(() => () => setActiveId(null), []));

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setActiveId(prev => prev === id ? null : id);
  };

  const bizName = BIZ_NAME[salon?.businessType] || 'Business';

  // Same 12 sections, same order and copy as the website
  const SECTIONS = [
    { id: 'profile',        icon: 'person-outline',           iconBg: 'rgba(99,102,241,0.15)',  iconColor: '#818cf8', title: 'My Profile',              subtitle: 'Name, email and account details',                        content: <ProfileSection /> },
    { id: 'salon',          icon: 'globe-outline',            iconBg: 'rgba(16,185,129,0.15)',  iconColor: '#10b981', title: `${bizName} Information`,  subtitle: `${bizName} name, category and contact details`,          content: <BusinessInfoSection /> },
    { id: 'notifications',  icon: 'notifications-outline',    iconBg: 'rgba(245,158,11,0.15)',  iconColor: '#f59e0b', title: 'Notifications',           subtitle: 'Email, SMS and push notification preferences',           content: <NotificationsSection /> },
    { id: 'app',            icon: 'settings-outline',         iconBg: 'rgba(139,92,246,0.15)',  iconColor: '#a78bfa', title: 'App Preferences',         subtitle: 'Theme, language and display settings',                   content: <AppPreferencesSection /> },
    { id: 'booking-window', icon: 'calendar-outline',         iconBg: 'rgba(59,130,246,0.15)',  iconColor: '#3b82f6', title: 'Booking Window',          subtitle: 'How far in advance customers can book',                  content: <BookingWindowSection /> },
    { id: 'booking-mode',   icon: 'git-branch-outline',       iconBg: 'rgba(20,184,166,0.15)',  iconColor: '#14b8a6', title: 'Booking Mode',            subtitle: 'Sequential (next-in-line) or Flexible (customer picks slot)', content: <BookingModeSection /> },
    { id: 'auto-confirm',   icon: 'checkmark-circle-outline', iconBg: 'rgba(34,197,94,0.15)',   iconColor: '#22c55e', title: 'Auto-Confirm Bookings',   subtitle: 'Confirm bookings instantly or review them manually',      content: <AutoConfirmSection /> },
    { id: 'photos',         icon: 'camera-outline',           iconBg: 'rgba(236,72,153,0.15)',  iconColor: '#ec4899', title: `${bizName} Photos`,       subtitle: `Upload photos customers will see on your ${bizName.toLowerCase()} page`, content: <PhotosSection /> },
    { id: 'closed-dates',   icon: 'calendar-clear-outline',   iconBg: 'rgba(239,68,68,0.15)',   iconColor: '#ef4444', title: 'Closed Dates / Holidays', subtitle: `Mark specific dates when your ${bizName.toLowerCase()} is closed`, content: <ClosedDatesSection /> },
    { id: 'working-hours',  icon: 'time-outline',             iconBg: 'rgba(249,115,22,0.15)',  iconColor: '#f97316', title: 'Working Hours',           subtitle: 'Set open and close times for each day of the week',      content: <WorkingHoursSection /> },
    { id: 'privacy',        icon: 'lock-closed-outline',      iconBg: 'rgba(100,116,139,0.15)', iconColor: '#94a3b8', title: 'Privacy & Security',      subtitle: 'Data protection, security and account deletion',          content: <PrivacySection /> },
    { id: 'about',          icon: 'information-circle-outline', iconBg: 'rgba(128,128,160,0.15)', iconColor: '#9ca3af', title: 'About',                 subtitle: 'App version, support and legal',                          content: <AboutSection /> },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[m.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[m.headerTitle, { color: theme.text }]}>Settings</Text>
          <Text style={[m.headerSub, { color: theme.subText }]}>Manage your account, business, and preferences</Text>
        </View>
        <DrawerMenuButton />
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(({ id, icon, iconBg, iconColor, title, subtitle, content }) => (
          <Accordion key={id} id={id} activeId={activeId} onToggle={toggle}
            icon={icon} iconBg={iconBg} iconColor={iconColor} title={title} subtitle={subtitle}>
            {content}
          </Accordion>
        ))}
      </ScrollView>
    </View>
  );
}

const m = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub:   { fontSize: 11.5, marginTop: 2 },
});

/* ─── Shared styles ────────────────────────────────────────────── */
const sh = StyleSheet.create({
  fieldRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10, borderBottomWidth: 1 },
  fieldLabel:   { width: 104, fontSize: 13, flexShrink: 0 },
  fieldValue:   { flex: 1, fontSize: 13, fontWeight: '600' },
  inpLabel:     { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
  inp:          { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 13, height: 46, fontSize: 14 },
  inpError:     { fontSize: 11, color: '#ef4444', marginTop: 3 },
  selectRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#6366f1', borderRadius: 12, height: 46, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  cancelBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderRadius: 12, height: 46, paddingHorizontal: 18, marginTop: 8 },
  cancelBtnText:{ fontSize: 13, fontWeight: '600' },
  outlineBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, marginTop: 12 },
  outlineBtnText: { fontSize: 13, fontWeight: '600' },
  sectionIntro: { fontSize: 12.5, lineHeight: 18, marginBottom: 12 },
  pickerOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 28 },
  pickerSheet:  { borderRadius: 18, padding: 16, maxHeight: 500 },
  pickerTitle:  { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  pickerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  pickerRowText:{ fontSize: 14 },
});
