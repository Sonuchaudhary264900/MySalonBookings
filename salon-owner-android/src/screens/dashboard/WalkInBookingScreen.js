import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';
import { useSalon } from '../../context/SalonContext';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
  const [availableSlots, setAvailableSlots] = useState([]);
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

  // Fetch available slots whenever date or service changes
  useEffect(() => {
    if (!salon?._id || !selectedDate) return;
    const duration = selectedService?.duration || 30;
    setSlotsLoading(true);
    setSelectedTime('');
    api.get(`/public/salons/${salon._id}/booked-slots?date=${selectedDate}&duration=${duration}`)
      .then(res => {
        const d = res.data.data || {};
        const all = d.slots || [];
        const blocked = d.blockedSlots || [];
        setAvailableSlots(all.filter(s => !blocked.includes(s)));
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [salon?._id, selectedDate, selectedService]);

  const changeDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  };

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleBook = async () => {
    if (!customerName.trim()) { showError('Required', 'Please enter customer name'); return; }
    if (!selectedService) { showError('Required', 'Please select a service'); return; }
    if (!selectedTime) { showError('Required', 'Please select a time slot'); return; }

    setSaving(true);
    try {
      await api.post('/owner/bookings', {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceId: selectedService._id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        notes: notes.trim(),
      });
      setSuccess(true);
      showSuccess('Booked!', 'Walk-in booking created successfully');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to create booking');
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
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
        <Text style={[styles.successTitle, { color: theme.text }]}>Booking Created!</Text>
        <Text style={[styles.successSub, { color: theme.subText }]}>
          Walk-in booking for {customerName} has been added.
        </Text>
        <TouchableOpacity style={styles.newBtn} onPress={resetForm}>
          <Text style={styles.newBtnText}>New Walk-in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 4, marginTop: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Walk-in Booking</Text>
          </View>
          <Text style={styles.headerSub}>Add a booking for a walk-in customer</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Customer Info */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer Info</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.bg }]}
              placeholder="Customer name *"
              placeholderTextColor={theme.subText}
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.bg, marginTop: 8 }]}
              placeholder="Phone number (optional)"
              placeholderTextColor={theme.subText}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Service */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Service</Text>
            {loadingServices ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <View style={styles.serviceGrid}>
                {services.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.serviceChip, selectedService?._id === s._id && styles.serviceChipActive, { borderColor: theme.border || '#e5e7eb' }]}
                    onPress={() => setSelectedService(s)}
                  >
                    <Text style={[styles.serviceChipText, { color: selectedService?._id === s._id ? '#fff' : theme.text }]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.servicePrice, { color: selectedService?._id === s._id ? '#c7d2fe' : theme.subText }]}>
                      ₹{s.basePrice}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Date */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Date</Text>
            <View style={styles.datePicker}>
              <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
                <Ionicons name="chevron-back" size={22} color="#6366f1" />
              </TouchableOpacity>
              <Text style={[styles.dateText, { color: theme.text }]}>{formatDisplayDate(selectedDate)}</Text>
              <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
                <Ionicons name="chevron-forward" size={22} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Slot */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Slot</Text>
            {slotsLoading ? (
              <ActivityIndicator color="#6366f1" style={{ marginVertical: 8 }} />
            ) : availableSlots.length === 0 ? (
              <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>
                No available slots for this date
              </Text>
            ) : (
              <View style={styles.slotGrid}>
                {availableSlots.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.slot, selectedTime === t && styles.slotActive, { borderColor: theme.border || '#e5e7eb' }]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.slotText, { color: selectedTime === t ? '#fff' : theme.text }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { borderColor: theme.border || '#e5e7eb', color: theme.text, backgroundColor: theme.bg }]}
              placeholder="Any special requests..."
              placeholderTextColor={theme.subText}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Book Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.card, borderTopColor: theme.border || '#e5e7eb' }]}>
          {selectedService && (
            <Text style={[styles.pricePreview, { color: theme.subText }]}>
              {selectedService.name} · ₹{selectedService.basePrice} · {selectedService.duration} min
            </Text>
          )}
          <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.bookBtnText}>Create Walk-in Booking</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 2 },
  section: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 4 },
  dateArrow: { padding: 8 },
  dateText: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  notesInput: { minHeight: 80 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  serviceChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  serviceChipText: { fontSize: 13, fontWeight: '600' },
  servicePrice: { fontSize: 11, marginTop: 2 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  slotActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
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
