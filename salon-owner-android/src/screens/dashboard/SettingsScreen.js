import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useSalon } from '../../context/SalonContext';
import { localDate } from '../../utils/helpers';

const CATEGORIES = ['barber', 'hair_salon', 'spa', 'massage', 'other'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Collapsible Section ───────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={sStyles.wrapper}>
      <TouchableOpacity style={sStyles.header} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <View style={sStyles.headerLeft}>
          <View style={sStyles.iconCircle}>
            <Ionicons name={icon} size={18} color="#4f46e5" />
          </View>
          <Text style={sStyles.title}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
      </TouchableOpacity>
      {open && <View style={sStyles.body}>{children}</View>}
    </View>
  );
}

function Field({ label, value, setter, placeholder, keyboard = 'default', multiline = false }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
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

// ── Salon Info Section ────────────────────────────────────────────
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
      setName(salon.name || '');
      setDescription(salon.description || '');
      setCategory(salon.category || 'barber');
      setPhone(salon.phone || '');
      setEmail(salon.email || '');
      setAddress(salon.address || '');
      setCity(salon.city || '');
      setStateName(salon.state || '');
      setPincode(salon.pincode || '');
    }
  }, [salon]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Salon name is required'); return; }
    setLoading(true);
    try {
      await api.put('/owner/salon', {
        name: name.trim(), description: description.trim(), category,
        phone: phone.trim(), email: email.trim() || undefined,
        address: address.trim(), city: city.trim() || undefined,
        state: stateName.trim() || undefined, pincode: pincode.trim() || undefined,
      });
      onSaved();
      Alert.alert('Success', 'Salon info updated!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update salon info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Field label="Salon Name *" value={name} setter={setName} placeholder="Royal Barbers" />
      <Field label="Description" value={description} setter={setDescription} placeholder="About your salon…" multiline />
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

// ── Working Hours Section ─────────────────────────────────────────
function WorkingHoursSection({ salon, onSaved }) {
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
    if (!openTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('Error', 'Enter valid open time HH:MM'); return; }
    if (!closeTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('Error', 'Enter valid close time HH:MM'); return; }
    setLoading(true);
    try {
      await api.put('/owner/salon', {
        workingHours: {
          openTime, closeTime,
          lunchStart: lunchStart || undefined,
          lunchEnd: lunchEnd || undefined,
          workingDays,
        },
      });
      onSaved();
      Alert.alert('Success', 'Working hours updated!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update working hours');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Field label="Opening Time (HH:MM)" value={openTime} setter={setOpenTime} placeholder="09:00" keyboard="numeric" />
      <Field label="Closing Time (HH:MM)" value={closeTime} setter={setCloseTime} placeholder="20:00" keyboard="numeric" />
      <Field label="Lunch Break Start (optional)" value={lunchStart} setter={setLunchStart} placeholder="13:00" keyboard="numeric" />
      <Field label="Lunch Break End (optional)" value={lunchEnd} setter={setLunchEnd} placeholder="14:00" keyboard="numeric" />
      <View style={styles.field}>
        <Text style={styles.label}>Working Days</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, workingDays.includes(i) && styles.dayChipActive]}
              onPress={() => toggleDay(i)}
            >
              <Text style={[styles.dayChipText, workingDays.includes(i) && styles.dayChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <SaveButton onPress={handleSave} loading={loading} />
    </>
  );
}

// ── Booking Settings Section ──────────────────────────────────────
function BookingSettingsSection({ salon, onSaved }) {
  const [advanceDays, setAdvanceDays] = useState(String(salon?.advanceBookingDays || 7));
  const [autoConfirm, setAutoConfirm] = useState(salon?.autoConfirmBookings ?? false);
  const [bookingMode, setBookingMode] = useState(salon?.bookingMode || 'manual');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const days = parseInt(advanceDays, 10);
    if (isNaN(days) || days < 1 || days > 90) { Alert.alert('Error', 'Advance booking days must be 1–90'); return; }
    setLoading(true);
    try {
      await api.put('/owner/salon', {
        advanceBookingDays: days,
        autoConfirmBookings: autoConfirm,
        bookingMode,
      });
      onSaved();
      Alert.alert('Success', 'Booking settings updated!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Field label="Advance Booking Days (1–90)" value={advanceDays} setter={setAdvanceDays} placeholder="7" keyboard="numeric" />

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.label}>Auto-Confirm Bookings</Text>
          <Text style={styles.toggleSub}>Automatically confirm new bookings</Text>
        </View>
        <Switch
          value={autoConfirm}
          onValueChange={setAutoConfirm}
          trackColor={{ false: '#d1d5db', true: '#818cf8' }}
          thumbColor={autoConfirm ? '#4f46e5' : '#9ca3af'}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Booking Mode</Text>
        <View style={styles.modeRow}>
          {['manual', 'automatic'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, bookingMode === m && styles.modeBtnActive]}
              onPress={() => setBookingMode(m)}
            >
              <Ionicons
                name={m === 'manual' ? 'hand-left-outline' : 'flash-outline'}
                size={18}
                color={bookingMode === m ? '#fff' : '#6b7280'}
              />
              <Text style={[styles.modeBtnText, bookingMode === m && styles.modeBtnTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.toggleSub}>
          {bookingMode === 'manual' ? 'You manually confirm each booking.' : 'Bookings are confirmed automatically.'}
        </Text>
      </View>

      <SaveButton onPress={handleSave} loading={loading} />
    </>
  );
}

// ── Holidays Section ──────────────────────────────────────────────
function HolidaysSection() {
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
    } catch { setHolidays([]); } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, []);

  const handleAdd = async () => {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Error', 'Enter date as YYYY-MM-DD'); return; }
    if (newDate < localDate(0)) { Alert.alert('Error', 'Holiday date must be today or in the future'); return; }
    setSaving(true);
    try {
      const res = await api.post('/owner/holidays', { date: newDate, reason: newReason.trim() || undefined });
      setHolidays((prev) => [...prev, res.data.data]);
      setNewDate(''); setNewReason(''); setAdding(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (holiday) => {
    Alert.alert('Remove Holiday', `Remove holiday on ${holiday.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/holidays/${holiday._id}`);
            setHolidays((prev) => prev.filter((h) => h._id !== holiday._id));
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to remove holiday');
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color="#4f46e5" style={{ marginVertical: 16 }} />;

  return (
    <>
      {holidays.length === 0 && !adding && (
        <Text style={styles.emptyText}>No holidays set. Add a holiday date to block bookings.</Text>
      )}

      {holidays.map((h) => (
        <View key={h._id} style={styles.holidayRow}>
          <View style={styles.holidayIcon}>
            <Ionicons name="calendar-outline" size={16} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.holidayDate}>{h.date}</Text>
            {h.reason && <Text style={styles.holidayReason}>{h.reason}</Text>}
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
            <SaveButton onPress={handleAdd} loading={saving} label="Add Holiday" />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAdding(false); setNewDate(''); setNewReason(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addHolidayBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add" size={18} color="#4f46e5" />
          <Text style={styles.addHolidayText}>Add Holiday</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ── Main Settings Screen ──────────────────────────────────────────
export default function SettingsScreen() {
  const { salon, fetchSalon } = useSalon();

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Manage your salon configuration</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <Section title="Salon Information" icon="business-outline" defaultOpen>
          <SalonInfoSection salon={salon} onSaved={fetchSalon} />
        </Section>
        <Section title="Working Hours" icon="time-outline">
          <WorkingHoursSection salon={salon} onSaved={fetchSalon} />
        </Section>
        <Section title="Booking Settings" icon="settings-outline">
          <BookingSettingsSection salon={salon} onSaved={fetchSalon} />
        </Section>
        <Section title="Holidays" icon="calendar-outline">
          <HolidaysSection />
        </Section>
      </ScrollView>
    </View>
  );
}

const sStyles = StyleSheet.create({
  wrapper: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  body: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});

const styles = StyleSheet.create({
  header: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 2 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#111827' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  dayChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  dayChipText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  dayChipTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  toggleSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  modeBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  modeBtnTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  holidayIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  holidayDate: { fontSize: 14, fontWeight: '600', color: '#111827' },
  holidayReason: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addHolidayBox: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 8 },
  addHolidayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: '#c4b5fd', backgroundColor: '#f5f3ff' },
  addHolidayText: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },
  cancelBtn: { flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', marginTop: 4 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
