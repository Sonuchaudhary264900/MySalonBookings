import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';
import { useSalon } from '../../context/SalonContext';
import BottomNavStrip from '../../components/BottomNavStrip';

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// "14:30" → "2:30 PM" — same format the customer app shows
function fmt12(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Group slots like the customer booking sheet
function groupSlots(slots) {
  const groups = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach(t => {
    const h = parseInt(t.split(':')[0], 10);
    if (h < 12) groups.Morning.push(t);
    else if (h < 17) groups.Afternoon.push(t);
    else groups.Evening.push(t);
  });
  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

// Shimmer skeleton block
function Skeleton({ w, h, r = 8, style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: 'rgba(128,128,160,0.18)', opacity: pulse }, style]} />;
}

export default function WalkInBookingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { salon } = useSalon();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [allSlots, setAllSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/owner/services');
      const d = res.data.data;
      const list = Array.isArray(d) ? d : (d?.services || []);
      setServices(list.filter(s => s.isActive !== false));
    } catch {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // Fetch available slots for the current date + service
  const refetchSlots = useCallback((keepTime = false) => {
    if (!salon?._id || !selectedDate) return;
    const duration = selectedService?.duration || 30;
    setSlotsLoading(true);
    if (!keepTime) setSelectedTime('');
    api.get(`/public/salons/${salon._id}/booked-slots?date=${selectedDate}&duration=${duration}`)
      .then(res => {
        const d = res.data.data || {};
        setAllSlots(d.slots || []);
        setBookedSlots(d.blockedSlots || []);
      })
      .catch(() => { setAllSlots([]); setBookedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [salon?._id, selectedDate, selectedService]);

  useEffect(() => { refetchSlots(); }, [refetchSlots]);

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Hide slots that have already passed when booking for today
  const isPast = (t) => {
    if (selectedDate !== todayStr()) return false;
    const [h, m] = t.split(':').map(Number);
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };
  const visibleSlots = allSlots.filter(t => !isPast(t));

  const phoneDigits = customerPhone.replace(/\D/g, '');
  const phoneValid  = phoneDigits.length === 10;
  const canBook     = customerName.trim().length > 0 && phoneValid && !!selectedService && !!selectedTime;
  const missing =
    !customerName.trim() ? 'Enter customer name' :
    !phoneDigits         ? 'Enter phone number' :
    !phoneValid          ? 'Phone must be 10 digits' :
    !selectedService     ? 'Select a service' :
    !selectedTime        ? 'Pick a time slot' : '';

  const handleBook = async () => {
    if (!canBook || saving) return;
    setSaving(true);
    try {
      await api.post('/owner/bookings', {
        customerName: customerName.trim(),
        customerPhone: phoneDigits,
        serviceId: selectedService._id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        notes: notes.trim(),
      });
      setSuccess(true);
      showSuccess('Booked!', 'Walk-in booking created successfully');
    } catch (err) {
      const status = err.response?.status;
      showError('Could not book', err.response?.data?.message || 'Failed to create booking');
      // Slot was taken meanwhile — refresh availability so it shows blocked
      if (status === 409) refetchSlots();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCustomerName(''); setCustomerPhone(''); setSelectedService(null);
    setSelectedDate(todayStr()); setSelectedTime(''); setNotes('');
    setSuccess(false);
  };

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: insets.top + 32 }}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>Booking Created!</Text>
          <Text style={[styles.successSub, { color: theme.subText }]}>
            {selectedService?.name} for {customerName} at {fmt12(selectedTime)}, {formatDisplayDate(selectedDate)}.
          </Text>
          <TouchableOpacity style={styles.newBtn} onPress={resetForm}>
            <Text style={styles.newBtnText}>New Walk-in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 14 }} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <Text style={{ color: theme.subText, fontSize: 14, fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
        <BottomNavStrip />
      </View>
    );
  }

  // Date quick chips: Today, Tomorrow, +2 … +6
  const dateChips = Array.from({ length: 7 }).map((_, i) => {
    const value = todayStr(i);
    return {
      value,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDisplayDate(value),
    };
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerTitle}>Walk-in Booking</Text>
              <Text style={styles.headerSub}>Add a booking for a walk-in customer</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          {/* Customer Info */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.input }]}
              placeholder="Customer name *"
              placeholderTextColor={theme.placeholder}
              value={customerName}
              onChangeText={setCustomerName}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, marginTop: 8, backgroundColor: theme.input, borderColor: (phoneDigits.length > 0 && !phoneValid) ? '#ef4444' : theme.inputBorder }}>
              <Text style={{ paddingLeft: 12, paddingRight: 8, fontSize: 14, color: theme.subText, fontWeight: '600' }}>+91</Text>
              <View style={{ width: 1, height: 22, backgroundColor: theme.inputBorder }} />
              <TextInput
                style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: theme.text }}
                placeholder="Phone number *"
                placeholderTextColor={theme.placeholder}
                value={customerPhone}
                onChangeText={t => setCustomerPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {phoneDigits.length > 0 && !phoneValid && <Text style={styles.fieldError}>Enter a valid 10-digit number</Text>}
          </View>

          {/* Service */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Service</Text>
            {loadingServices ? (
              <View style={styles.serviceGrid}>
                {[90, 120, 100, 80, 110].map((w, i) => <Skeleton key={i} w={w} h={48} r={10} />)}
              </View>
            ) : services.length === 0 ? (
              <Text style={{ color: theme.subText, fontSize: 13 }}>No services yet — add them from the Services tab first.</Text>
            ) : (
              <View style={styles.serviceGrid}>
                {services.map((s) => {
                  const active = selectedService?._id === s._id;
                  return (
                    <TouchableOpacity
                      key={s._id}
                      style={[styles.serviceChip, { borderColor: theme.inputBorder, backgroundColor: theme.input }, active && styles.serviceChipActive]}
                      onPress={() => setSelectedService(active ? null : s)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.serviceChipText, { color: active ? '#fff' : theme.text }]}>
                        {s.name}
                      </Text>
                      <Text style={[styles.servicePrice, { color: active ? '#c7d2fe' : theme.subText }]}>
                        ₹{s.basePrice} · {s.duration || 30} min
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Date — quick chips like the customer app */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {dateChips.map(c => {
                const active = selectedDate === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.dateChip, { borderColor: theme.inputBorder, backgroundColor: theme.input }, active && styles.dateChipActive]}
                    onPress={() => setSelectedDate(c.value)}
                  >
                    <Text style={[styles.dateChipText, { color: active ? '#fff' : theme.text }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Time Slot — grouped Morning / Afternoon / Evening with AM/PM labels */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Slot</Text>
            {slotsLoading ? (
              <View style={styles.slotGrid}>
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} w={82} h={36} r={8} />)}
              </View>
            ) : visibleSlots.length === 0 ? (
              <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>
                {selectedDate === todayStr() ? 'No more slots today — try tomorrow' : 'No slots for this date'}
              </Text>
            ) : (
              groupSlots(visibleSlots).map(([label, slots]) => (
                <View key={label} style={{ marginBottom: 6 }}>
                  <Text style={[styles.slotGroupLabel, { color: theme.subText }]}>{label.toUpperCase()}</Text>
                  <View style={styles.slotGrid}>
                    {slots.map((t) => {
                      const booked = bookedSlots.includes(t);
                      const active = selectedTime === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          disabled={booked}
                          style={[
                            styles.slot,
                            { borderColor: theme.inputBorder, backgroundColor: theme.input },
                            active && styles.slotActive,
                            booked && styles.slotBooked,
                          ]}
                          onPress={() => setSelectedTime(active ? '' : t)}
                        >
                          <Text style={[styles.slotText, { color: booked ? '#ef4444' : active ? '#fff' : theme.text, textDecorationLine: booked ? 'line-through' : 'none' }]}>
                            {fmt12(t)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Notes */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.input }]}
              placeholder="Any special requests..."
              placeholderTextColor={theme.placeholder}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Book Button */}
        <View style={[styles.footer, { paddingBottom: 12, backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <Text style={[styles.pricePreview, { color: theme.subText }]}>
            {selectedService
              ? `${selectedService.name} · ₹${selectedService.basePrice} · ${selectedService.duration || 30} min${selectedTime ? ` · ${fmt12(selectedTime)}` : ''}`
              : missing}
          </Text>
          <TouchableOpacity
            style={[styles.bookBtn, (!canBook || saving) && { opacity: 0.5 }]}
            onPress={handleBook}
            disabled={!canBook || saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.bookBtnText}>{canBook ? 'Create Walk-in Booking' : missing}</Text>}
          </TouchableOpacity>
        </View>

        {/* App bottom navigation — jump to any tab (Home works) */}
        <BottomNavStrip />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 1 },
  section: { borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  fieldError: { color: '#ef4444', fontSize: 11, marginTop: 4 },
  notesInput: { minHeight: 80 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  serviceChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  serviceChipText: { fontSize: 13, fontWeight: '600' },
  servicePrice: { fontSize: 11, marginTop: 2 },
  dateChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  dateChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dateChipText: { fontSize: 13, fontWeight: '600' },
  slotGroupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  slot: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  slotActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  slotBooked: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)' },
  slotText: { fontSize: 13, fontWeight: '600' },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  pricePreview: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  bookBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  successSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  newBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
