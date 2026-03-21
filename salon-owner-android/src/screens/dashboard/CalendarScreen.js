import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, ScrollView,
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

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [bookingDates, setBookingDates] = useState({}); // { 'YYYY-MM-DD': count }
  const [dayBookings, setDayBookings] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  // Fetch booking counts for the whole month
  const fetchMonthBookings = useCallback(async (y, m) => {
    try {
      const startDate = `${y}-${String(m + 1).padStart(2,'0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const endDate = `${y}-${String(m + 1).padStart(2,'0')}-${lastDay}`;
      const res = await api.get(`/owner/bookings?startDate=${startDate}&endDate=${endDate}`);
      const d = res.data.data;
      const list = Array.isArray(d) ? d : (d?.bookings || []);
      const counts = {};
      list.forEach((b) => {
        const dateStr = b.appointmentDate?.slice(0, 10) || b.date?.slice(0, 10);
        if (dateStr) counts[dateStr] = (counts[dateStr] || 0) + 1;
      });
      setBookingDates(counts);
    } catch {
      setBookingDates({});
    }
  }, []);

  const fetchDayBookings = useCallback(async (dateStr) => {
    setLoadingDay(true);
    try {
      const res = await api.get(`/owner/bookings?date=${dateStr}`);
      const d = res.data.data;
      setDayBookings(Array.isArray(d) ? d : (d?.bookings || []));
    } catch {
      setDayBookings([]);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => { fetchMonthBookings(year, month); }, [year, month, fetchMonthBookings]);
  useEffect(() => { fetchDayBookings(selectedDate); }, [selectedDate, fetchDayBookings]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toDateStr(today);

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
        </View>
        <Text style={styles.headerSub}>View and manage bookings by date</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Month Navigator */}
        <View style={[styles.monthNav, { backgroundColor: theme.card }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={[styles.weekRow, { backgroundColor: theme.card }]}>
          {WEEK_DAYS.map(d => (
            <Text key={d} style={[styles.weekDay, { color: theme.subText }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={[styles.grid, { backgroundColor: theme.card }]}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e-${i}`} style={styles.cell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const count = bookingDates[dateStr] || 0;
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
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text style={[styles.dayNum, { color: isSelected ? '#fff' : theme.text }, isToday && !isSelected && { color: '#2563eb' }]}>
                  {day}
                </Text>
                {count > 0 && (
                  <View style={[styles.dot, isSelected && { backgroundColor: '#fff' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day bookings */}
        <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <Text style={[styles.dayTitle, { color: theme.text }]}>
            {selectedDate === todayStr ? 'Today' : selectedDate} — {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
          </Text>

          {loadingDay ? (
            <ActivityIndicator color="#2563eb" style={{ marginTop: 24 }} />
          ) : dayBookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No bookings for this day</Text>
            </View>
          ) : (
            dayBookings.map((b) => {
              const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
              return (
                <View key={b._id} style={[styles.bookingCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.bookingAccent, { backgroundColor: colors.text }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingName, { color: theme.text }]}>{b.customerName || 'Customer'}</Text>
                    <Text style={[styles.bookingMeta, { color: theme.subText }]}>
                      {b.serviceName} · {formatTime(b.appointmentTime)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>{b.status}</Text>
                  </View>
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
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, marginBottom: 1 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 17, fontWeight: '700' },
  weekRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 10 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected: { backgroundColor: '#2563eb' },
  cellToday: { borderWidth: 1.5, borderColor: '#2563eb' },
  dayNum: { fontSize: 14, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2563eb', marginTop: 2 },
  dayTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  bookingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 8, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, padding: 12 },
  bookingAccent: { width: 4, height: '100%', borderRadius: 2, marginRight: 12 },
  bookingName: { fontSize: 14, fontWeight: '700' },
  bookingMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
