import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../../context/OnboardingContext';

const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

const PRESETS = [
  { label: 'Weekdays',  days: ['monday','tuesday','wednesday','thursday','friday'] },
  { label: 'Mon–Sat',   days: ['monday','tuesday','wednesday','thursday','friday','saturday'] },
  { label: 'All 7',     days: ALL_DAYS },
];

function addMin(time, delta) {
  const [h, m] = time.split(':').map(Number);
  const total = ((h * 60 + m + delta) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

function TimePicker({ label, value, onChange }) {
  return (
    <View style={s.timeWrap}>
      <Text style={s.timeLabel}>{label}</Text>
      <View style={s.timePicker}>
        <TouchableOpacity style={s.timeBtn} onPress={() => onChange(addMin(value, -30))}>
          <Ionicons name="chevron-down" size={18} color="#c4b5fd" />
        </TouchableOpacity>
        <Text style={s.timeVal}>{value}</Text>
        <TouchableOpacity style={s.timeBtn} onPress={() => onChange(addMin(value, 30))}>
          <Ionicons name="chevron-up" size={18} color="#c4b5fd" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Step6_WorkingHours() {
  const {
    workingDays, setWorkingDays,
    openTime, setOpenTime,
    closeTime, setCloseTime,
    lunchBreak, setLunchBreak,
    lunchStart, setLunchStart,
    lunchEnd, setLunchEnd,
    nextStep,
  } = useOnboarding();

  const toggleDay = (day) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const applyPreset = (days) => setWorkingDays(days);

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Text style={s.title}>Working Hours</Text>
      <Text style={s.sub}>Set when customers can book appointments</Text>

      {/* Day presets */}
      <View style={s.presetsRow}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p.label}
            style={[s.presetChip, workingDays.length === p.days.length && workingDays.every(d => p.days.includes(d)) && s.presetChipOn]}
            onPress={() => applyPreset(p.days)}
          >
            <Text style={s.presetText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Day toggles */}
      <View style={s.daysRow}>
        {ALL_DAYS.map(day => (
          <TouchableOpacity
            key={day}
            style={[s.dayPill, workingDays.includes(day) && s.dayPillOn]}
            onPress={() => toggleDay(day)}
          >
            <Text style={[s.dayText, workingDays.includes(day) && s.dayTextOn]}>
              {DAY_LABELS[day]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {workingDays.length > 0 && (
        <Text style={s.daysSummary}>
          Open {workingDays.length} day{workingDays.length !== 1 ? 's' : ''} · {workingDays.map(d => DAY_LABELS[d]).join(', ')}
        </Text>
      )}

      {/* Open / Close times */}
      <View style={s.timeRow}>
        <TimePicker label="Opening Time" value={openTime} onChange={setOpenTime} />
        <View style={s.timeDivider}><Ionicons name="remove-outline" size={20} color="#475569" /></View>
        <TimePicker label="Closing Time" value={closeTime} onChange={setCloseTime} />
      </View>

      {/* Lunch break */}
      <View style={s.lunchCard}>
        <View style={s.lunchHeader}>
          <View>
            <Text style={s.lunchTitle}>Lunch Break</Text>
            <Text style={s.lunchSub}>Block time in the middle of the day</Text>
          </View>
          <Switch
            value={lunchBreak}
            onValueChange={setLunchBreak}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(99,102,241,0.5)' }}
            thumbColor={lunchBreak ? '#6366f1' : '#6b7280'}
          />
        </View>
        {lunchBreak && (
          <View style={[s.timeRow, { marginTop: 14, marginBottom: 0 }]}>
            <TimePicker label="Break Start" value={lunchStart} onChange={setLunchStart} />
            <View style={s.timeDivider}><Ionicons name="remove-outline" size={20} color="#475569" /></View>
            <TimePicker label="Break End" value={lunchEnd} onChange={setLunchEnd} />
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={s.summaryCard}>
        <Ionicons name="time-outline" size={16} color="#818cf8" />
        <Text style={s.summaryText}>
          {workingDays.length} working days · {openTime} – {closeTime}
          {lunchBreak ? ` (lunch ${lunchStart}–${lunchEnd})` : ''}
        </Text>
      </View>

      <TouchableOpacity style={s.btn} onPress={nextStep} activeOpacity={0.88}>
        <Text style={s.btnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:        { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:          { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  presetsRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  presetChip:   { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' },
  presetChipOn: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: '#6366f1' },
  presetText:   { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  daysRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  dayPill:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' },
  dayPillOn:    { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dayText:      { fontSize: 13, fontWeight: '600', color: '#64748b' },
  dayTextOn:    { color: '#fff' },
  daysSummary:  { fontSize: 12, color: '#818cf8', marginBottom: 20, fontStyle: 'italic' },
  timeRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  timeDivider:  { paddingTop: 20 },
  timeWrap:     { flex: 1 },
  timeLabel:    { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: '600' },
  timePicker:   { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', paddingVertical: 6 },
  timeBtn:      { padding: 8, width: '100%', alignItems: 'center' },
  timeVal:      { fontSize: 22, fontWeight: '800', color: '#f1f5f9', paddingVertical: 4 },
  lunchCard:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', marginBottom: 20 },
  lunchHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lunchTitle:   { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  lunchSub:     { fontSize: 12, color: '#475569' },
  summaryCard:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  summaryText:  { fontSize: 13, color: '#94a3b8', flex: 1 },
  btn:          { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
