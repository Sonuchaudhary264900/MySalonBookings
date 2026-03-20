import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['barber', 'hair_salon', 'spa', 'massage', 'other'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STEPS = ['Basic Info', 'Working Hours', 'Review & Submit'];

export default function SalonRegistrationScreen() {
  const { createSalon } = useSalon();
  const { user, logout } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('barber');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Step 2 — Working Hours
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [lunchStart, setLunchStart] = useState('');
  const [lunchEnd, setLunchEnd] = useState('');
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5, 6]); // Mon–Sat

  const toggleDay = (d) => {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.trim();
    return `+91${digits}`;
  };

  const validateStep1 = () => {
    if (!name.trim() || name.trim().length < 3) { Alert.alert('Error', 'Salon name must be at least 3 characters'); return false; }
    if (!phone.trim()) { Alert.alert('Error', 'Phone number is required'); return false; }
    if (!address.trim() || address.trim().length < 5) { Alert.alert('Error', 'Full address is required (min 5 characters)'); return false; }
    if (!city.trim() || city.trim().length < 2) { Alert.alert('Error', 'City is required'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!openTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('Error', 'Enter opening time as HH:MM'); return false; }
    if (!closeTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('Error', 'Enter closing time as HH:MM'); return false; }
    if (workingDays.length === 0) { Alert.alert('Error', 'Select at least one working day'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createSalon({
        name: name.trim(),
        description: description.trim(),
        category,
        phone: formatPhone(phone),
        email: email.trim() || undefined,
        address: address.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        workingHours: {
          openTime,
          closeTime,
          lunchStart: lunchStart || undefined,
          lunchEnd: lunchEnd || undefined,
          workingDays,
        },
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register salon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>💈 Smart Salon</Text>
        <Text style={styles.headerSub}>Register Your Salon</Text>
        <TouchableOpacity onPress={() => Alert.alert('Switch Account', 'Logout and go back to login?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout },
        ])} style={styles.logoutLink}>
          <Text style={styles.logoutLinkText}>Wrong account? Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <React.Fragment key={num}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={[styles.stepNum, active && { color: '#fff' }]}>{num}</Text>}
                </View>
                <Text style={[styles.stepLabel, active && { color: '#4f46e5', fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, done && { backgroundColor: '#10b981' }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            <Text style={styles.cardSub}>Tell us about your salon</Text>

            <Field label="Salon Name *" value={name} setter={setName} placeholder="e.g. Royal Barbers" />
            <Field label="Description" value={description} setter={setDescription} placeholder="Brief description of your salon" multiline />

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipsRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                      {c.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Field label="Phone Number *" value={phone} setter={setPhone} placeholder="+91 9876543210" keyboard="phone-pad" />
            <Field label="Email" value={email} setter={setEmail} placeholder="salon@example.com" keyboard="email-address" />
            <Field label="Address *" value={address} setter={setAddress} placeholder="Street address" />
            <Field label="City *" value={city} setter={setCity} placeholder="Mumbai" />
            <Field label="State" value={state} setter={setState} placeholder="Maharashtra" />
            <Field label="Pincode" value={pincode} setter={setPincode} placeholder="400001" keyboard="numeric" />
          </View>
        )}

        {/* ── Step 2: Working Hours ── */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Working Hours</Text>
            <Text style={styles.cardSub}>Set your salon's schedule</Text>

            <Field label="Opening Time * (HH:MM)" value={openTime} setter={setOpenTime} placeholder="09:00" keyboard="numeric" />
            <Field label="Closing Time * (HH:MM)" value={closeTime} setter={setCloseTime} placeholder="20:00" keyboard="numeric" />
            <Field label="Lunch Break Start (HH:MM)" value={lunchStart} setter={setLunchStart} placeholder="13:00 (optional)" keyboard="numeric" />
            <Field label="Lunch Break End (HH:MM)" value={lunchEnd} setter={setLunchEnd} placeholder="14:00 (optional)" keyboard="numeric" />

            <View style={styles.field}>
              <Text style={styles.label}>Working Days *</Text>
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
          </View>
        )}

        {/* ── Step 3: Review & Submit ── */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Review & Submit</Text>
            <Text style={styles.cardSub}>Confirm your salon details before submitting</Text>

            <SummarySection title="Salon Info">
              <SummaryRow label="Name" value={name} />
              <SummaryRow label="Category" value={category.replace('_', ' ')} />
              <SummaryRow label="Phone" value={phone} />
              {email ? <SummaryRow label="Email" value={email} /> : null}
              <SummaryRow label="Address" value={[address, city, state, pincode].filter(Boolean).join(', ')} />
              {description ? <SummaryRow label="Description" value={description} /> : null}
            </SummarySection>

            <SummarySection title="Working Hours">
              <SummaryRow label="Open" value={openTime} />
              <SummaryRow label="Close" value={closeTime} />
              {lunchStart ? <SummaryRow label="Lunch" value={`${lunchStart} – ${lunchEnd}`} /> : null}
              <SummaryRow label="Days" value={workingDays.map((d) => DAYS[d]).join(', ')} />
            </SummarySection>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#4f46e5" />
              <Text style={styles.infoText}>
                Your salon will be reviewed and approved by our team. You'll be able to manage bookings once approved.
              </Text>
            </View>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity style={[styles.navBtn, styles.navBtnBack]} onPress={() => setStep((s) => s - 1)} disabled={loading}>
              <Ionicons name="arrow-back" size={16} color="#6b7280" />
              <Text style={styles.navBtnBackText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity style={[styles.navBtn, styles.navBtnNext, step === 1 && { flex: 1 }]} onPress={handleNext}>
              <Text style={styles.navBtnNextText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { flex: 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Text style={styles.navBtnNextText}>Submit for Approval</Text><Ionicons name="checkmark" size={16} color="#fff" /></>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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

function SummarySection({ title, children }) {
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summarySectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4f46e5' },
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  logo: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#c7d2fe', marginBottom: 6 },
  logoutLink: { marginTop: 4 },
  logoutLinkText: { fontSize: 12, color: '#c7d2fe', textDecorationLine: 'underline' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDone: { backgroundColor: '#10b981' },
  stepActive: { backgroundColor: '#fff' },
  stepNum: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  stepLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 14 },
  body: { flex: 1, backgroundColor: '#f9fafb', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#111827' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  dayChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  dayChipTextActive: { color: '#fff' },
  summarySection: { marginBottom: 16 },
  summarySectionTitle: { fontSize: 13, fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 12 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#ede9fe', borderRadius: 10, padding: 12, marginTop: 8 },
  infoText: { fontSize: 13, color: '#4f46e5', flex: 1, lineHeight: 18 },
  navRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 4 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 12 },
  navBtnBack: { paddingHorizontal: 20, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff' },
  navBtnBackText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  navBtnNext: { flex: 1, backgroundColor: '#4f46e5' },
  navBtnNextText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
