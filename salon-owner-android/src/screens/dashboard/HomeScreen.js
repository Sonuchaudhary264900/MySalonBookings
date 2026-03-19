import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useSalon } from '../../context/SalonContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

const today = localDate(0);

export default function HomeScreen() {
  const { salon } = useSalon();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/owner/analytics/dashboard');
      setStats(res.data.data);
    } catch { /* silent */ } finally {
      setStatsLoading(false);
    }
  };

  const fetchBookings = async (date) => {
    setBookingsLoading(true);
    try {
      const res = await api.get(`/owner/bookings?date=${date}`);
      setBookings(res.data.data || []);
    } catch { setBookings([]); } finally {
      setBookingsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchBookings(selectedDate)]);
    setRefreshing(false);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchBookings(selectedDate); }, [selectedDate]);

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const next = localDate(0);
    const shifted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (shifted <= today) setSelectedDate(shifted);
  };

  const statCards = [
    { title: 'Total Revenue', value: `₹${stats?.totalRevenue || 0}`, icon: 'cash-outline', color: '#10b981' },
    { title: 'Total Bookings', value: stats?.totalBookings || 0, icon: 'calendar-outline', color: '#3b82f6' },
    { title: 'Customers', value: stats?.activeCustomers || 0, icon: 'people-outline', color: '#8b5cf6' },
    { title: 'Growth Rate', value: `${stats?.growthRate || 0}%`, icon: 'trending-up-outline', color: '#f59e0b' },
  ];

  const isToday = selectedDate === today;
  const displayLabel = isToday ? 'Today' : formatDate(selectedDate + 'T12:00:00');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome */}
      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeTitle}>Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>
          {salon?.name ? `Welcome back, ${salon.name}!` : "Here's your salon's performance"}
        </Text>
      </View>

      {/* Stats */}
      {statsLoading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statTitle}>{s.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bookings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <Text style={styles.sectionSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} · {displayLabel}</Text>
          </View>
          <View style={styles.dateNav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftDate(-1)}>
              <Ionicons name="chevron-back" size={18} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{displayLabel}</Text>
            <TouchableOpacity style={[styles.navBtn, isToday && styles.navBtnDisabled]} onPress={() => shiftDate(1)} disabled={isToday}>
              <Ionicons name="chevron-forward" size={18} color={isToday ? '#d1d5db' : '#6b7280'} />
            </TouchableOpacity>
          </View>
        </View>

        {bookingsLoading ? (
          <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 16 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No bookings on {displayLabel}</Text>
          </View>
        ) : (
          bookings.map((b) => {
            const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
            return (
              <View key={b._id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingName}>{b.customerName || '—'}</Text>
                  <Text style={styles.bookingInfo}>{b.serviceName} · {formatTime(b.appointmentTime)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.badgeText, { color: colors.text }]}>{b.status?.replace('_', ' ')}</Text>
                  </View>
                  {b.totalAmount ? <Text style={styles.bookingAmount}>₹{b.totalAmount}</Text> : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  welcomeBox: { backgroundColor: '#4f46e5', padding: 20, paddingTop: 16, paddingBottom: 24 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  welcomeSubtitle: { fontSize: 14, color: '#c7d2fe', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statTitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 12, marginTop: 4, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sectionSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.4 },
  dateLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  bookingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  bookingName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bookingInfo: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  bookingAmount: { fontSize: 12, color: '#6b7280', marginTop: 3 },
});
