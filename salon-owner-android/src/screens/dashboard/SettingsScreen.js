import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Image, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import { localDate } from '../../utils/helpers';
import { showSuccess, showError } from '../../utils/toast';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORIES = ['barber', 'hair_salon', 'spa', 'massage', 'other'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Collapsible Section ───────────────────────────────────────────
function Section({ title, subtitle, icon, iconBg, iconColor, children, defaultOpen = false, resetKey }) {
  const [open, setOpen] = useState(defaultOpen);
  const { theme } = useTheme();
  useEffect(() => { if (resetKey) setOpen(false); }, [resetKey]);
  return (
    <View style={[sStyles.wrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity style={sStyles.header} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <View style={sStyles.headerLeft}>
          <View style={[sStyles.iconCircle, { backgroundColor: theme.bg }]}>
            <Ionicons name={icon} size={18} color={iconColor || theme.accent} />
          </View>
          <Text style={[sStyles.title, { color: theme.text }]}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.subText} />
      </TouchableOpacity>
      {open && <View style={[sStyles.body, { borderTopColor: theme.border }]}>{children}</View>}
    </View>
  );
}

function Field({ label, value, setter, placeholder, keyboard = 'default', multiline = false }) {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.subText }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        keyboardType={keyboard}
        autoCapitalize="none"
        multiline={multiline}
      />
    </View>
  );
}

function SaveButton({ onPress, loading, label = 'Save Changes' }) {
  return (
    <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ── 1. Business Information ──────────────────────────────────────────
function SalonInfoSection({ salon, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('barber');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salon) {
      setName(salon.name || ''); setDescription(salon.description || '');
      setCategory(salon.category || 'barber'); setPhone(salon.phone || '');
      setEmail(salon.email || ''); setAddress(salon.address || '');
      setCity(salon.city || ''); setStateName(salon.state || '');
      setPincode(salon.pincode || '');
    }
  }, [salon]);

  const handleSave = async () => {
    if (!name.trim()) { showError('Error', 'Salon name is required'); return; }
    setLoading(true);
    try {
      await api.put('/owner/salon', {
        name: name.trim(), description: description.trim(), category,
        phone: phone.trim(), email: email.trim() || undefined,
        address: address.trim(), city: city.trim() || undefined,
        state: stateName.trim() || undefined, pincode: pincode.trim() || undefined,
      });
      onSaved();
      showSuccess('Saved', 'Salon info updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update salon info');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Field label="Business Name *" value={name} setter={setName} placeholder="Royal Salon" />
      <Field label="Description" value={description} setter={setDescription} placeholder="About your business…" multiline />
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Field label="Phone *" value={phone} setter={setPhone} placeholder="+91 9876543210" keyboard="phone-pad" />
      <Field label="Email" value={email} setter={setEmail} placeholder="salon@example.com" keyboard="email-address" />
      <Field label="Address" value={address} setter={setAddress} placeholder="Street address" />
      <Field label="City" value={city} setter={setCity} placeholder="Mumbai" />
      <Field label="State" value={stateName} setter={setStateName} placeholder="Maharashtra" />
      <Field label="Pincode" value={pincode} setter={setPincode} placeholder="400001" keyboard="numeric" />
      <SaveButton onPress={handleSave} loading={loading} />
    </>
  );
}

// ── 2. Working Hours ──────────────────────────────────────────────
function WorkingHoursSection({ salon, onSaved }) {
  const { theme } = useTheme();
  const wh = salon?.workingHours || {};
  const [openTime, setOpenTime] = useState(wh.openTime || '09:00');
  const [closeTime, setCloseTime] = useState(wh.closeTime || '20:00');
  const [lunchStart, setLunchStart] = useState(wh.lunchStart || '');
  const [lunchEnd, setLunchEnd] = useState(wh.lunchEnd || '');
  const [workingDays, setWorkingDays] = useState(wh.workingDays || [1, 2, 3, 4, 5, 6]);
  const [loading, setLoading] = useState(false);

  const toggleDay = (d) =>
    setWorkingDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

  const handleSave = async () => {
    if (!openTime.match(/^\d{2}:\d{2}$/)) { showError('Error', 'Enter valid open time HH:MM'); return; }
    if (!closeTime.match(/^\d{2}:\d{2}$/)) { showError('Error', 'Enter valid close time HH:MM'); return; }
    setLoading(true);
    try {
      await api.put('/owner/salon', {
        workingHours: { openTime, closeTime, lunchStart: lunchStart || undefined, lunchEnd: lunchEnd || undefined, workingDays },
      });
      onSaved();
      showSuccess('Saved', 'Working hours updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update working hours');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Field label="Opening Time (HH:MM)" value={openTime} setter={setOpenTime} placeholder="09:00" keyboard="numeric" />
      <Field label="Closing Time (HH:MM)" value={closeTime} setter={setCloseTime} placeholder="20:00" keyboard="numeric" />
      <Field label="Lunch Break Start (optional)" value={lunchStart} setter={setLunchStart} placeholder="13:00" keyboard="numeric" />
      <Field label="Lunch Break End (optional)" value={lunchEnd} setter={setLunchEnd} placeholder="14:00" keyboard="numeric" />
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.subText }]}>Working Days</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d, i) => (
            <TouchableOpacity key={i} style={[styles.dayChip, { backgroundColor: theme.input, borderColor: theme.inputBorder }, workingDays.includes(i) && styles.dayChipActive]} onPress={() => toggleDay(i)}>
              <Text style={[styles.dayChipText, { color: theme.subText }, workingDays.includes(i) && styles.dayChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <SaveButton onPress={handleSave} loading={loading} />
    </>
  );
}

// ── 3. Notifications Preferences ─────────────────────────────────
const NOTIF_PREFS_KEY = '@notificationPrefs';
const NOTIF_ITEMS = [
  { key: 'emailNotifications', label: 'Email Notifications', sub: 'Receive booking updates via email' },
  { key: 'smsNotifications', label: 'SMS Notifications', sub: 'Receive booking updates via SMS' },
  { key: 'bookingReminders', label: 'Booking Reminders', sub: 'Get notified about upcoming bookings' },
  { key: 'cancellationAlerts', label: 'Cancellation Alerts', sub: 'Notify when a booking is cancelled' },
  { key: 'newReviews', label: 'New Reviews', sub: 'Get notified when a customer leaves a review' },
];
const DEFAULT_NOTIF = { emailNotifications: true, smsNotifications: true, bookingReminders: true, cancellationAlerts: true, newReviews: true };

function NotificationsSection() {
  const { theme } = useTheme();
  const [prefs, setPrefs] = useState(DEFAULT_NOTIF);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREFS_KEY).then((val) => {
      if (val) setPrefs({ ...DEFAULT_NOTIF, ...JSON.parse(val) });
    });
  }, []);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
      showSuccess('Saved', 'Notification preferences updated!');
    } catch {
      showError('Error', 'Failed to save preferences');
    } finally { setSaving(false); }
  };

  return (
    <>
      {NOTIF_ITEMS.map((item) => (
        <View key={item.key} style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.toggleSub, { color: theme.subText }]}>{item.sub}</Text>
          </View>
          <Switch
            value={prefs[item.key]}
            onValueChange={() => toggle(item.key)}
            trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
            thumbColor={prefs[item.key] ? '#6366f1' : '#9ca3af'}
          />
        </View>
      ))}
      <SaveButton onPress={handleSave} loading={saving} label="Save Preferences" />
    </>
  );
}

// ── 4. App Preferences ────────────────────────────────────────────
const APP_PREFS_KEY = '@appPrefs';

function AppPreferencesSection() {
  const { theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [timeFormat, setTimeFormat] = useState('12h');
  const [dateFormat, setDateFormat] = useState('dd/mm/yyyy');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(APP_PREFS_KEY).then((val) => {
      if (val) {
        const p = JSON.parse(val);
        if (p.timeFormat) setTimeFormat(p.timeFormat);
        if (p.dateFormat) setDateFormat(p.dateFormat);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await AsyncStorage.getItem(APP_PREFS_KEY);
      const prefs = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(APP_PREFS_KEY, JSON.stringify({ ...prefs, timeFormat, dateFormat, language }));
      showSuccess('Saved', 'App preferences updated!');
    } catch {
      showError('Error', 'Failed to save preferences');
    } finally { setSaving(false); }
  };

  const OptionPicker = ({ label, options, value, onSelect }) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.subText }]}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((o) => (
          <TouchableOpacity key={o.value} style={[styles.optionBtn, { backgroundColor: theme.input, borderColor: theme.inputBorder }, value === o.value && styles.optionBtnActive]} onPress={() => onSelect(o.value)}>
            {value === o.value && <Ionicons name="checkmark-circle" size={13} color="#6366f1" style={{ marginRight: 4 }} />}
            <Text style={[styles.optionBtnText, { color: theme.subText }, value === o.value && styles.optionBtnTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <OptionPicker label={t('language')} options={[{ label: 'English', value: 'en' }, { label: 'हिंदी', value: 'hi' }]} value={language} onSelect={setLanguage} />
      <OptionPicker label={t('timeFormat')} options={[{ label: '12 Hour (AM/PM)', value: '12h' }, { label: '24 Hour', value: '24h' }]} value={timeFormat} onSelect={setTimeFormat} />
      <OptionPicker label={t('dateFormat')} options={[{ label: 'DD/MM/YYYY', value: 'dd/mm/yyyy' }, { label: 'MM/DD/YYYY', value: 'mm/dd/yyyy' }, { label: 'YYYY-MM-DD', value: 'yyyy-mm-dd' }]} value={dateFormat} onSelect={setDateFormat} />
      <SaveButton onPress={handleSave} loading={saving} label={t('savePreferences')} />
    </>
  );
}

// ── 5. Booking Window ─────────────────────────────────────────────
const BOOKING_WINDOW_OPTIONS = [
  { days: 0, label: 'Today only', sub: 'Customers can only book for the current day' },
  { days: 1, label: 'Today + Tomorrow', sub: 'Customers can book up to 1 day ahead' },
  { days: 3, label: 'Next 3 days', sub: 'Today and 3 days in advance' },
  { days: 7, label: 'Next 7 days', sub: 'Today and 7 days in advance' },
  { days: 14, label: 'Next 14 days', sub: 'Today and 2 weeks in advance' },
  { days: 30, label: 'Next 30 days', sub: 'Today and 30 days in advance' },
];

function BookingWindowSection({ salon, onSaved }) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(salon?.advanceBookingDays ?? 1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salon?.advanceBookingDays !== undefined) setSelected(salon.advanceBookingDays);
  }, [salon]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/owner/salon', { advanceBookingDays: selected });
      onSaved();
      showSuccess('Saved', 'Booking window updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update booking window');
    } finally { setLoading(false); }
  };

  return (
    <>
      {BOOKING_WINDOW_OPTIONS.map((opt) => {
        const active = selected === opt.days;
        return (
          <TouchableOpacity key={opt.days} style={[styles.radioCard, { backgroundColor: theme.input, borderColor: theme.inputBorder }, active && styles.radioCardActive]} onPress={() => setSelected(opt.days)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.radioCardLabel, { color: theme.text }, active && styles.radioCardLabelActive]}>{opt.label}</Text>
              <Text style={[styles.radioCardSub, { color: theme.subText }]}>{opt.sub}</Text>
            </View>
            {active && <Ionicons name="checkmark-circle" size={22} color="#6366f1" />}
          </TouchableOpacity>
        );
      })}
      <SaveButton onPress={handleSave} loading={loading} label="Save Booking Window" />
    </>
  );
}

// ── 6. Booking Mode ───────────────────────────────────────────────
const BOOKING_MODES = [
  { value: 'flexible', label: 'Flexible (Customer Picks) 🗓️', sub: 'Customer chooses any available time slot from all open slots.' },
  { value: 'sequential', label: 'Sequential (Next in Line) ⏩', sub: 'Bookings assigned one after another. Customer gets the next open slot automatically.' },
];

function BookingModeSection({ salon, onSaved }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState(salon?.bookingMode || 'sequential');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salon?.bookingMode) setMode(salon.bookingMode);
  }, [salon]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/owner/salon', { bookingMode: mode });
      onSaved();
      showSuccess('Saved', 'Booking mode updated!');
    } catch (err) {
      showError('Error', err.message || 'Failed to update booking mode');
    } finally { setLoading(false); }
  };

  return (
    <>
      {BOOKING_MODES.map((m) => {
        const active = mode === m.value;
        return (
          <TouchableOpacity key={m.value} style={[styles.radioCard, { backgroundColor: theme.input, borderColor: theme.inputBorder }, active && styles.radioCardActive]} onPress={() => setMode(m.value)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.radioCardLabel, { color: theme.text }, active && styles.radioCardLabelActive]}>{m.label}</Text>
              <Text style={[styles.radioCardSub, { color: theme.subText }]}>{m.sub}</Text>
            </View>
            {active && <Ionicons name="checkmark-circle" size={22} color="#6366f1" />}
          </TouchableOpacity>
        );
      })}
      <SaveButton onPress={handleSave} loading={loading} label="Save Booking Mode" />
    </>
  );
}

// ── 7. Auto-Confirm ───────────────────────────────────────────────
function AutoConfirmSection({ salon, onSaved }) {
  const { theme } = useTheme();
  const [autoConfirm, setAutoConfirm] = useState(salon?.autoConfirmBookings ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salon?.autoConfirmBookings !== undefined) setAutoConfirm(salon.autoConfirmBookings);
  }, [salon]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/owner/salon', { autoConfirmBookings: autoConfirm });
      onSaved();
      showSuccess('Saved', `Auto-confirm ${autoConfirm ? 'enabled' : 'disabled'}!`);
    } catch (err) {
      showError('Error', err.message || 'Failed to update setting');
    } finally { setLoading(false); }
  };

  return (
    <>
      <View style={[styles.autoConfirmCard, { borderColor: autoConfirm ? '#93c5fd' : theme.inputBorder, backgroundColor: autoConfirm ? '#eef2ff' : theme.input }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.autoConfirmTitle, { color: autoConfirm ? '#6366f1' : theme.text }]}>
            {autoConfirm ? '✅ Auto-Confirm is ON' : '⏸️ Auto-Confirm is OFF'}
          </Text>
          <Text style={[styles.toggleSub, { color: theme.subText }]}>
            {autoConfirm ? 'New bookings are confirmed automatically.' : 'You must manually confirm each new booking.'}
          </Text>
        </View>
        <Switch
          value={autoConfirm}
          onValueChange={setAutoConfirm}
          trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
          thumbColor={autoConfirm ? '#6366f1' : '#9ca3af'}
        />
      </View>
      <SaveButton onPress={handleSave} loading={loading} label="Save Setting" />
    </>
  );
}

// ── 8. Salon Photos ───────────────────────────────────────────────
function SalonPhotosSection({ salon, onSaved }) {
  const [photos, setPhotos] = useState(salon?.photos || []);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (salon?.photos) setPhotos(salon.photos); }, [salon]);

  const handlePickImages = async () => {
    if (photos.length >= 10) { showError('Limit reached', 'Maximum 10 photos allowed'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission denied', 'Gallery access is required to upload photos'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const toUpload = result.assets.slice(0, 10 - photos.length);
    setUploading(true);
    try {
      const formData = new FormData();
      toUpload.forEach((asset, i) => {
        formData.append('photos', { uri: asset.uri, name: `photo_${i}.jpg`, type: 'image/jpeg' });
      });
      const res = await api.post('/owner/salon/upload-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrls = res.data.data?.photos || res.data.data?.urls || [];
      const updated = [...photos, ...newUrls].slice(0, 10);
      await api.put('/owner/salon/photos', { photos: updated });
      setPhotos(updated);
      onSaved();
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
            const updated = photos.filter((p) => p !== url);
            await api.put('/owner/salon/photos', { photos: updated });
            setPhotos(updated);
            onSaved();
            showSuccess('Removed', 'Photo removed');
          } catch (err) {
            showError('Error', err.message || 'Failed to remove photo');
          }
        },
      },
    ]);
  };

  return (
    <>
      <Text style={styles.photoCount}>{photos.length}/10 photos</Text>
      {photos.length > 0 && (
        <View style={styles.photoGrid}>
          {photos.map((url, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri: url }} style={styles.photoImg} />
              <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => handleDelete(url)}>
                <Ionicons name="trash" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {photos.length === 0 && (
        <Text style={styles.emptyText}>No photos yet. Add photos to showcase your business.</Text>
      )}
      <TouchableOpacity
        style={[styles.uploadBtn, (uploading || photos.length >= 10) && { opacity: 0.6 }]}
        onPress={handlePickImages}
        disabled={uploading || photos.length >= 10}
      >
        {uploading
          ? <ActivityIndicator color="#6366f1" size="small" />
          : <Ionicons name="image-outline" size={18} color="#6366f1" />}
        <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Add Photos'}</Text>
      </TouchableOpacity>
    </>
  );
}

// ── 9. Closed Dates / Holidays ────────────────────────────────────
function HolidaysSection() {
  const { theme } = useTheme();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await api.get('/owner/salon');
      setHolidays(res.data.data?.holidays || []);
    } catch { setHolidays([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHolidays(); }, []);

  const handleAdd = async () => {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) { showError('Error', 'Enter date as YYYY-MM-DD'); return; }
    if (newDate < localDate(0)) { showError('Error', 'Holiday date must be today or in the future'); return; }
    setSaving(true);
    try {
      const res = await api.post('/owner/salon/holidays', { date: newDate, reason: newReason.trim() || undefined });
      setHolidays(res.data?.data?.holidays || []);
      setNewDate(''); setNewReason(''); setAdding(false);
      showSuccess('Added', 'Closed date added!');
    } catch (err) {
      showError('Error', err.message || 'Failed to add closed date');
    } finally { setSaving(false); }
  };

  const handleDelete = (holiday) => {
    Alert.alert('Remove Closed Date', `Remove closed date on ${holiday.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/salon/holidays/${holiday._id}`);
            setHolidays((prev) => prev.filter((h) => h._id !== holiday._id));
            showSuccess('Removed', 'Closed date removed');
          } catch (err) {
            showError('Error', err.message || 'Failed to remove date');
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color="#6366f1" style={{ marginVertical: 16 }} />;

  return (
    <>
      {holidays.length === 0 && !adding && (
        <Text style={styles.emptyText}>No closed dates set. Add a date to block bookings.</Text>
      )}
      {holidays.map((h) => (
        <View key={h._id} style={[styles.holidayRow, { borderTopColor: theme.border }]}>
          <View style={styles.holidayIcon}>
            <Ionicons name="calendar-outline" size={16} color="#6366f1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.holidayDate, { color: theme.text }]}>{h.date}</Text>
            {h.reason && <Text style={[styles.holidayReason, { color: theme.subText }]}>{h.reason}</Text>}
          </View>
          <TouchableOpacity onPress={() => handleDelete(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addHolidayBox}>
          <Field label="Date (YYYY-MM-DD)" value={newDate} setter={setNewDate} placeholder={localDate(1)} keyboard="numeric" />
          <Field label="Reason (optional)" value={newReason} setter={setNewReason} placeholder="e.g. Public Holiday" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SaveButton onPress={handleAdd} loading={saving} label="Add Date" />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAdding(false); setNewDate(''); setNewReason(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addHolidayBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add" size={18} color="#6366f1" />
          <Text style={styles.addHolidayText}>Add Closed Date</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ── 10. Privacy & Security ────────────────────────────────────────
const PRIVACY_CARDS = [
  { icon: '🔒', title: 'Data Encryption', sub: 'All your data is encrypted and stored securely.' },
  { icon: '🚫', title: 'No Data Sharing', sub: 'We never share your information with third parties.' },
  { icon: '🛡️', title: 'Security Updates', sub: 'Regular patches and security updates are applied.' },
  { icon: '🔑', title: 'Token Security', sub: 'Auth tokens expire automatically and refresh securely.' },
];



function PrivacySection() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState(1);
  const [deleting, setDeleting] = useState(false);

  const reset = () => { setConfirming(false); setStep(1); };

  const confirmDelete = async () => {
    // OTP-only: authorized by the logged-in session, no password needed.
    setDeleting(true);
    try {
      await api.post('/owner/auth/delete-account');
      await logout();
    } catch (err) {
      showError('Error', err.message || 'Failed to delete account');
    } finally { setDeleting(false); }
  };

  return (
    <>
      {PRIVACY_CARDS.map((card) => (
        <View key={card.title} style={[styles.privacyCard, { borderBottomColor: theme.border }]}>
          <Text style={styles.privacyCardIcon}>{card.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.privacyCardTitle, { color: theme.text }]}>{card.title}</Text>
            <Text style={[styles.privacyCardSub, { color: theme.subText }]}>{card.sub}</Text>
          </View>
        </View>
      ))}
      <LegalButtons />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      {!confirming ? (
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setConfirming(true)}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
        </TouchableOpacity>
      ) : step === 1 ? (
        <View style={styles.deleteBox}>
          <Text style={styles.deleteWarningTitle}>⚠️ This action cannot be undone</Text>
          <Text style={styles.deleteWarningText}>Deleting your account will permanently remove:</Text>
          {['Owner account and profile', 'Salon listing and services', 'Customer reviews', 'Booking history'].map((item) => (
            <Text key={item} style={styles.deleteWarningItem}>• {item}</Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[styles.deleteConfirmBtn, { flex: 1 }]} onPress={() => setStep(2)}>
              <Text style={styles.deleteConfirmText}>I understand, continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.deleteBox}>
          <Text style={styles.dangerText}>Are you sure? This permanently deletes your account and all its data.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.deleteForeverBtn, deleting && { opacity: 0.7 }, { flex: 1 }]} onPress={confirmDelete} disabled={deleting}>
              {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.deleteForeverText}>Delete Forever</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={reset} disabled={deleting}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

// ── Legal Buttons (inside Privacy section) ────────────────────────
function LegalButtons() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  return (
    <View style={{ gap: 8, marginVertical: 8 }}>
      <TouchableOpacity
        style={[styles.privacyLinkBtn, { borderColor: theme.border }]}
        onPress={() => navigation.navigate('Legal')}
        activeOpacity={0.7}
      >
        <Ionicons name="shield-checkmark-outline" size={16} color="#6366f1" />
        <Text style={[styles.privacyLinkText, { color: '#6366f1' }]}>View Privacy Policy</Text>
        <Ionicons name="chevron-forward" size={14} color="#6366f1" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.privacyLinkBtn, { borderColor: theme.border }]}
        onPress={() => { navigation.navigate('Legal'); }}
        activeOpacity={0.7}
      >
        <Ionicons name="document-text-outline" size={16} color="#7c3aed" />
        <Text style={[styles.privacyLinkText, { color: '#7c3aed' }]}>View Terms & Conditions</Text>
        <Ionicons name="chevron-forward" size={14} color="#7c3aed" />
      </TouchableOpacity>
    </View>
  );
}

// ── Settings Sections (uses useLanguage hook) ─────────────────────
function SettingsSections({ salon, fetchSalon, resetKey }) {
  const { t } = useLanguage();
  return (
    <>
      <Section resetKey={resetKey} title={t('salonInformation')} subtitle={t('salonInfoSub')} icon="globe-outline" iconBg="#dcfce7" iconColor="#16a34a">
        <SalonInfoSection salon={salon} onSaved={fetchSalon} />
      </Section>

      <Section resetKey={resetKey} title={t('workingHours')} subtitle={t('workingHoursSub')} icon="time-outline" iconBg="#e0e7ff" iconColor="#6366f1">
        <WorkingHoursSection salon={salon} onSaved={fetchSalon} />
      </Section>

      <Section resetKey={resetKey} title={t('notifications')} subtitle={t('notificationsSub')} icon="notifications-outline" iconBg="#fef3c7" iconColor="#d97706">
        <NotificationsSection />
      </Section>

      <Section resetKey={resetKey} title={t('appPreferences')} subtitle={t('appPrefSub')} icon="settings-outline" iconBg="#ede9fe" iconColor="#7c3aed">
        <AppPreferencesSection />
      </Section>

      <Section resetKey={resetKey} title={t('bookingWindow')} subtitle={t('bookingWindowSub')} icon="calendar-outline" iconBg="#f3e8ff" iconColor="#9333ea">
        <BookingWindowSection salon={salon} onSaved={fetchSalon} />
      </Section>

      <Section resetKey={resetKey} title={t('bookingMode')} subtitle={t('bookingModeSub')} icon="git-branch-outline" iconBg="#ccfbf1" iconColor="#0d9488">
        <BookingModeSection salon={salon} onSaved={fetchSalon} />
      </Section>

      <Section resetKey={resetKey} title={t('autoConfirm')} subtitle={t('autoConfirmSub')} icon="checkmark-circle-outline" iconBg="#dcfce7" iconColor="#16a34a">
        <AutoConfirmSection salon={salon} onSaved={fetchSalon} />
      </Section>

      <Section resetKey={resetKey} title={t('salonPhotos')} subtitle={t('salonPhotosSub')} icon="camera-outline" iconBg="#fce7f3" iconColor="#db2777">
        <SalonPhotosSection salon={salon} onSaved={fetchSalon} />
      </Section>

      <Section resetKey={resetKey} title={t('closedDates')} subtitle={t('closedDatesSub')} icon="calendar-clear-outline" iconBg="#fee2e2" iconColor="#dc2626">
        <HolidaysSection />
      </Section>

      <Section resetKey={resetKey} title={t('privacySecurity')} subtitle={t('privacySecuritySub')} icon="lock-closed-outline" iconBg="#fee2e2" iconColor="#dc2626">
        <PrivacySection />
      </Section>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { salon, fetchSalon } = useSalon();
  const { theme } = useTheme();
  const [resetKey, setResetKey] = useState(0);

  useFocusEffect(useCallback(() => {
    return () => setResetKey((k) => k + 1);
  }, []));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <DrawerMenuButton />
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <SettingsSections salon={salon} fetchSalon={fetchSalon} resetKey={resetKey} />
      </ScrollView>
    </View>
  );
}

const sStyles = StyleSheet.create({
  wrapper: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden', elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  iconCircle: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 14, fontWeight: '600' },
  body: { padding: 16, paddingTop: 8, borderTopWidth: 1 },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#111827' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  dayChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dayChipText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  dayChipTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  toggleSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  radioCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', marginBottom: 8 },
  radioCardActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  radioCardLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  radioCardLabelActive: { color: '#6366f1' },
  radioCardSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  autoConfirmCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, borderWidth: 1.5, marginBottom: 8 },
  autoConfirmTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  optionBtnActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  optionBtnText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  optionBtnTextActive: { color: '#6366f1', fontWeight: '700' },
  photoCount: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoThumb: { width: 88, height: 88, borderRadius: 8, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoDeleteBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#93c5fd', backgroundColor: '#eef2ff' },
  uploadBtnText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  holidayIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  holidayDate: { fontSize: 14, fontWeight: '600', color: '#111827' },
  holidayReason: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addHolidayBox: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 8 },
  addHolidayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: '#93c5fd', backgroundColor: '#eef2ff' },
  addHolidayText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  cancelBtn: { flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', marginTop: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  privacyCardIcon: { fontSize: 20 },
  privacyCardTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  privacyCardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  privacyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, marginVertical: 8 },
  privacyLinkText: { fontSize: 13, fontWeight: '600', flex: 1 },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fee2e2' },
  deleteAccountBtnText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  deleteBox: { backgroundColor: '#fff5f5', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#fca5a5' },
  deleteWarningTitle: { fontSize: 14, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  deleteWarningText: { fontSize: 13, color: '#374151', marginBottom: 6 },
  deleteWarningItem: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  dangerText: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 10 },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46, marginBottom: 2 },
  deleteConfirmBtn: { height: 44, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  deleteConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteForeverBtn: { height: 44, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  deleteForeverText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  appearanceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  appearanceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  appearanceTitle: { fontSize: 14, fontWeight: '700' },
  appearanceSub: { fontSize: 11, marginTop: 1 },
});
