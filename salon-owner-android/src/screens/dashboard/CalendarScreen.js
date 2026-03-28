import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { formatTime, STATUS_COLORS } from '../../utils/helpers';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/* ── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, iconName, accent, bg, theme }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statLabel, { color: accent }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

/* ── Week day strip ─────────────────────────────────────────── */
function WeekStrip({ weekStart, bookingsByDate, selectedDate, onDateSelect, theme, isDark }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayStr = toDateStr(new Date());

  return (
    <View style={styles.weekStrip}>
      {days.map((d, i) => {
        const key = toDateStr(d);
        const count = (bookingsByDate[key] || []).length;
        const isToday = key === todayStr;
        const isSel = key === selectedDate;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onDateSelect(key)}
            style={[
              styles.weekDay2,
              isSel && { backgroundColor: '#6366f1' },
              !isSel && isToday && { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff', borderWidth: 1, borderColor: '#6366f1' },
              !isSel && !isToday && { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' },
            ]}
          >
            <Text style={[styles.weekDayName, { color: isSel ? 'rgba(255,255,255,0.7)' : (isToday ? '#6366f1' : theme.subText) }]}>
              {WEEK_DAYS[d.getDay()]}
            </Text>
            <Text style={[styles.weekDayNum, { color: isSel ? '#fff' : (isToday ? '#6366f1' : theme.text) }]}>
              {d.getDate()}
            </Text>
            {count > 0 && (
              <Text style={[styles.weekDayCount, { color: isSel ? '#fff' : '#6366f1', backgroundColor: isSel ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff') }]}>
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── Week overview list ─────────────────────────────────────── */
function WeekOverview({ weekStart, bookingsByDate, selectedDate, onDateSelect, theme, isDark }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayStr = toDateStr(new Date());

  return (
    <View style={[styles.weekOverview, { backgroundColor: theme.card }]}>
      {days.map((d, i) => {
        const key = toDateStr(d);
        const bks = bookingsByDate[key] || [];
        const isToday = key === todayStr;
        const isSel = key === selectedDate;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onDateSelect(key)}
            style={[styles.weekRow, { borderBottomColor: theme.border, backgroundColor: isSel ? (isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff') : 'transparent' }]}
          >
            <View style={styles.weekRowDate}>
              <Text style={[styles.weekRowDayName, { color: theme.subText }]}>{WEEK_DAYS[d.getDay()]}</Text>
              <Text style={[styles.weekRowDayNum, { color: isToday ? '#6366f1' : theme.text }]}>{d.getDate()}</Text>
            </View>
            <View style={styles.weekRowBookings}>
              {bks.length === 0 ? (
                <Text style={{ color: theme.subText, fontSize: 11 }}>No bookings</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {bks.slice(0, 4).map((b) => (
                    <View key={b._id} style={[styles.weekBookingPill, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' }]}>
                      <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                        {b.appointmentTime} {b.customerName?.split(' ')[0]}
                      </Text>
                    </View>
                  ))}
                  {bks.length > 4 && (
                    <View style={[styles.weekBookingPill, { backgroundColor: isDark ? '#334155' : '#f3f4f6' }]}>
                      <Text style={{ color: theme.subText, fontSize: 10, fontWeight: '600' }}>+{bks.length - 4}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
            {bks.length > 0 && (
              <View style={[styles.weekRowCount, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' }]}>
                <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '700' }}>{bks.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const todayDate = new Date();
  const todayStr = toDateStr(todayDate);

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayDate));
  const [allBookings, setAllBookings] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoadingAll(true);
    try {
      const res = await api.get('/owner/bookings');
      const d = res.data.data;
      setAllBookings(Array.isArray(d) ? d : (d?.bookings || []));
    } catch {
      setAllBookings([]);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  /* Group bookings by date */
  const bookingsByDate = useMemo(() => {
    const map = {};
    allBookings.forEach((b) => {
      const k = b.appointmentDate?.slice(0, 10) || b.date?.slice(0, 10);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return map;
  }, [allBookings]);

  /* Day bookings for selected date */
  const dayBookings = useMemo(() => bookingsByDate[selectedDate] || [], [selectedDate, bookingsByDate]);

  /* Stats */
  const stats = useMemo(() => ({
    today: (bookingsByDate[todayStr] || []).length,
    total: allBookings.length,
    pending: allBookings.filter(b => b.status === 'pending').length,
    completed: allBookings.filter(b => b.status === 'completed').length,
  }), [allBookings, bookingsByDate, todayStr]);

  /* Month navigation */
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  /* Week navigation */
  const prevWeek = () => {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  };
  const nextWeek = () => {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  };

  /* Handle date select */
  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    const d = new Date(dateStr);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  /* Status change */
  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status: newStatus });
      setAllBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  /* Build calendar grid */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  /* Week range label */
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)} – ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].slice(0,3)} ${weekEnd.getFullYear()}`;

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
          <Text style={styles.headerTitle}>Calendar</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => loadAll()} style={styles.headerBtn}>
              <Ionicons name={loadingAll ? 'sync' : 'refresh-outline'} size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('WalkIn')} style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSub}>Manage bookings and your daily schedule</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Today"    value={stats.today}     accent="#6366f1" bg={isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff'}    theme={theme} />
          <StatCard label="Total"    value={stats.total}     accent="#7c3aed" bg={isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff'}    theme={theme} />
          <StatCard label="Pending"  value={stats.pending}   accent="#d97706" bg={isDark ? 'rgba(217,119,6,0.12)' : '#fffbeb'}     theme={theme} />
          <StatCard label="Done"     value={stats.completed} accent="#059669" bg={isDark ? 'rgba(5,150,105,0.12)' : '#ecfdf5'}     theme={theme} />
        </View>

        {/* View toggle */}
        <View style={[styles.toggleRow, { backgroundColor: theme.card }]}>
          <View style={[styles.toggleWrap, { backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => setViewMode('month')}
              style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]}
            >
              <Ionicons name="grid-outline" size={13} color={viewMode === 'month' ? '#fff' : theme.subText} />
              <Text style={[styles.toggleLabel, { color: viewMode === 'month' ? '#fff' : theme.subText }]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('week')}
              style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
            >
              <Ionicons name="list-outline" size={13} color={viewMode === 'week' ? '#fff' : theme.subText} />
              <Text style={[styles.toggleLabel, { color: viewMode === 'week' ? '#fff' : theme.subText }]}>Week</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Month view */}
        {viewMode === 'month' && (
          <>
            {/* Month navigator */}
            <View style={[styles.monthNav, { backgroundColor: theme.card }]}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color="#6366f1" />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: theme.text }]}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={[styles.weekDayRow, { backgroundColor: theme.card }]}>
              {WEEK_DAYS.map(d => (
                <Text key={d} style={[styles.weekDayHeader, { color: theme.subText }]}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={[styles.grid, { backgroundColor: theme.card }]}>
              {cells.map((day, i) => {
                if (!day) return <View key={`e-${i}`} style={styles.cell} />;
                const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const count = (bookingsByDate[dateStr] || []).length;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.cell,
                      isSelected && styles.cellSelected,
                      isToday && !isSelected && styles.cellToday,
                    ]}
                    onPress={() => handleDateSelect(dateStr)}
                  >
                    <Text style={[styles.dayNum, { color: isSelected ? '#fff' : theme.text }, isToday && !isSelected && { color: '#6366f1' }]}>
                      {day}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.dot, isSelected && { backgroundColor: '#fff' }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Week view */}
        {viewMode === 'week' && (
          <>
            {/* Week strip navigator */}
            <View style={[styles.weekNavBar, { backgroundColor: theme.card }]}>
              <TouchableOpacity onPress={prevWeek} style={styles.weekNavBtn}>
                <Ionicons name="chevron-back" size={18} color="#6366f1" />
              </TouchableOpacity>
              <Text style={[styles.weekNavLabel, { color: theme.text }]}>{weekLabel}</Text>
              <TouchableOpacity onPress={nextWeek} style={styles.weekNavBtn}>
                <Ionicons name="chevron-forward" size={18} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {/* Week day pills */}
            <View style={[{ backgroundColor: theme.card, paddingHorizontal: 10, paddingBottom: 12 }]}>
              <WeekStrip
                weekStart={weekStart}
                bookingsByDate={bookingsByDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                theme={theme}
                isDark={isDark}
              />
            </View>

            {/* Week overview list */}
            <View style={{ paddingHorizontal: 14, marginTop: 10 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Week Overview</Text>
              <WeekOverview
                weekStart={weekStart}
                bookingsByDate={bookingsByDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                theme={theme}
                isDark={isDark}
              />
            </View>
          </>
        )}

        {/* Selected day bookings */}
        <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <View style={styles.dayTitleRow}>
            <Text style={[styles.dayTitle, { color: theme.text }]}>
              {selectedDate === todayStr ? 'Today' : selectedDate} — {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('WalkIn')} style={styles.addBtn}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {loadingAll ? (
            <ActivityIndicator color="#6366f1" style={{ marginTop: 24 }} />
          ) : dayBookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No bookings for this day</Text>
            </View>
          ) : (
            dayBookings.map((b) => {
              const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
              const isUpdating = updatingId === b._id;
              return (
                <View key={b._id} style={[styles.bookingCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.bookingAccent, { backgroundColor: colors.text }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingName, { color: theme.text }]}>{b.customerName || 'Customer'}</Text>
                    <Text style={[styles.bookingMeta, { color: theme.subText }]}>
                      {b.serviceName} · {formatTime(b.appointmentTime)}
                    </Text>
                  </View>
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        const options = ['pending','confirmed','in_progress','completed','cancelled']
                          .filter(s => s !== b.status);
                        Alert.alert('Update Status', 'Select new status', [
                          ...options.map(s => ({ text: s.replace('_',' '), onPress: () => handleStatusChange(b._id, s) })),
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                      style={[styles.statusBadge, { backgroundColor: colors.bg }]}
                    >
                      <Text style={[styles.statusText, { color: colors.text }]}>{b.status}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1, marginLeft: 8 },
  headerSub: { fontSize: 13, color: '#c7d2fe', marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },

  toggleRow: { paddingHorizontal: 14, paddingVertical: 10 },
  toggleWrap: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 12, padding: 3, borderWidth: 1 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  toggleBtnActive: { backgroundColor: '#6366f1' },
  toggleLabel: { fontSize: 12, fontWeight: '700' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, marginBottom: 1 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 17, fontWeight: '700' },
  weekDayRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  weekDayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 10 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected: { backgroundColor: '#6366f1' },
  cellToday: { borderWidth: 1.5, borderColor: '#6366f1' },
  dayNum: { fontSize: 14, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#6366f1', marginTop: 2 },

  weekNavBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  weekNavBtn: { padding: 6 },
  weekNavLabel: { fontSize: 13, fontWeight: '700' },

  weekStrip: { flexDirection: 'row', gap: 4 },
  weekDay2: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  weekDayName: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  weekDayNum: { fontSize: 14, fontWeight: '800' },
  weekDayCount: { fontSize: 9, fontWeight: '700', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8, marginTop: 2, overflow: 'hidden' },

  weekOverview: { borderRadius: 14, overflow: 'hidden' },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  weekRowDate: { width: 44, alignItems: 'center' },
  weekRowDayName: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  weekRowDayNum: { fontSize: 18, fontWeight: '800' },
  weekRowBookings: { flex: 1, marginLeft: 10 },
  weekBookingPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4 },
  weekRowCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },

  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },

  dayTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dayTitle: { fontSize: 15, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 3 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  bookingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 8, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, padding: 12 },
  bookingAccent: { width: 4, height: '100%', borderRadius: 2, marginRight: 12 },
  bookingName: { fontSize: 14, fontWeight: '700' },
  bookingMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
