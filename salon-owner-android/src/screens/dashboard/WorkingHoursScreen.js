import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HOURS = Array.from({ length: 48 }, (_, i) => {
  const totalMin = i * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { label, value };
});

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  isOpen: day !== 'Sunday',
  openTime: '09:00',
  closeTime: '20:00',
}));

function TimePicker({ visible, selected, onSelect, onClose }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.timePickerBox, { backgroundColor: theme.card }]}>
          <Text style={[styles.timePickerTitle, { color: theme.text }]}>Select Time</Text>
          <FlatList
            data={HOURS}
            keyExtractor={(item) => item.value}
            style={{ maxHeight: 260 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.timeOption, selected === item.value && styles.timeOptionActive]}
                onPress={() => { onSelect(item.value); onClose(); }}
              >
                <Text style={[styles.timeOptionText, selected === item.value && styles.timeOptionTextActive, { color: selected === item.value ? '#fff' : theme.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function WorkingHoursScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(null); // { dayIndex, field }

  const fetchHours = useCallback(async () => {
    try {
      const res = await api.get('/owner/working-hours');
      const d = res.data.data;
      if (Array.isArray(d) && d.length > 0) setHours(d);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHours(); }, [fetchHours]);

  const toggleDay = (index) => {
    setHours((prev) => prev.map((h, i) => i === index ? { ...h, isOpen: !h.isOpen } : h));
  };

  const setTime = (index, field, value) => {
    setHours((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/owner/working-hours', { workingHours: hours });
      showSuccess('Saved', 'Working hours updated successfully');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to save working hours');
    } finally {
      setSaving(false);
    }
  };

  const selectedPickerValue = picker
    ? hours[picker.dayIndex]?.[picker.field]
    : null;

  return (
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
          <Text style={styles.headerTitle}>Working Hours</Text>
        </View>
        <Text style={styles.headerSub}>Set your salon's open and close times</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            {hours.map((item, index) => (
              <View key={item.day} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.dayRow}>
                  <Text style={[styles.dayName, { color: theme.text }]}>{item.day}</Text>
                  <View style={styles.dayToggle}>
                    <Text style={[styles.statusLabel, { color: item.isOpen ? '#10b981' : '#9ca3af' }]}>
                      {item.isOpen ? 'Open' : 'Closed'}
                    </Text>
                    <Switch
                      value={item.isOpen}
                      onValueChange={() => toggleDay(index)}
                      trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
                      thumbColor={item.isOpen ? '#6366f1' : '#9ca3af'}
                    />
                  </View>
                </View>

                {item.isOpen && (
                  <View style={styles.timeRow}>
                    <TouchableOpacity
                      style={[styles.timeBtn, { borderColor: theme.border || '#e5e7eb' }]}
                      onPress={() => setPicker({ dayIndex: index, field: 'openTime' })}
                    >
                      <Ionicons name="time-outline" size={14} color="#6366f1" />
                      <Text style={[styles.timeBtnText, { color: theme.text }]}>
                        {HOURS.find(h => h.value === item.openTime)?.label || item.openTime}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.toText, { color: theme.subText }]}>to</Text>
                    <TouchableOpacity
                      style={[styles.timeBtn, { borderColor: theme.border || '#e5e7eb' }]}
                      onPress={() => setPicker({ dayIndex: index, field: 'closeTime' })}
                    >
                      <Ionicons name="time-outline" size={14} color="#6366f1" />
                      <Text style={[styles.timeBtnText, { color: theme.text }]}>
                        {HOURS.find(h => h.value === item.closeTime)?.label || item.closeTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Save Button */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.card, borderTopColor: theme.border || '#e5e7eb' }]}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save Working Hours</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      <TimePicker
        visible={!!picker}
        selected={selectedPickerValue}
        onSelect={(val) => picker && setTime(picker.dayIndex, picker.field, val)}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 2 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 15, fontWeight: '700' },
  dayToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  timeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  timeBtnText: { fontSize: 13, fontWeight: '600' },
  toText: { fontSize: 13, fontWeight: '500' },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  timePickerBox: { width: 260, borderRadius: 14, padding: 16, elevation: 10 },
  timePickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  timeOption: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
  timeOptionActive: { backgroundColor: '#6366f1' },
  timeOptionText: { fontSize: 14, fontWeight: '500' },
  timeOptionTextActive: { color: '#fff', fontWeight: '700' },
});
