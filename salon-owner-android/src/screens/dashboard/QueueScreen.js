import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSalon } from '../../context/SalonContext';
import { localDate } from '../../utils/helpers';
import { showSuccess, showError } from '../../utils/toast';

const SOCKET_URL = 'https://api.glowloox.com';
const QUEUE_STATUSES = ['pending', 'confirmed', 'in_progress'];

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#d97706' },
  confirmed:   { label: 'Confirmed',   color: '#10b981' },
  in_progress: { label: 'In Progress', color: '#7c3aed' },
};

/* ── Position badge ──────────────────────────────────────────── */
const PosBadge = ({ pos }) => {
  const bg = pos === 0 ? '#6366f1' : pos === 1 ? '#c7d2fe' : pos === 2 ? '#bae6fd' : '#e5e7eb';
  const fg = pos === 0 ? '#fff' : pos === 1 ? '#4338ca' : pos === 2 ? '#0369a1' : '#6b7280';
  return (
    <View style={[styles.posBadge, { backgroundColor: bg }]}>
      <Text style={[styles.posText, { color: fg }]}>{pos + 1}</Text>
    </View>
  );
};

/* ── Queue Card ──────────────────────────────────────────────── */
function QueueCard({ booking, pos, onAction, actioning, theme, isDark }) {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isActioning = actioning === booking._id;

  const actions = [];
  if (booking.status === 'pending') actions.push({ label: 'Confirm', status: 'confirmed', icon: 'checkmark-circle', bg: '#10b981', fg: '#fff' });
  if (booking.status === 'confirmed') actions.push({ label: 'Start', status: 'in_progress', icon: 'play-circle', bg: '#7c3aed', fg: '#fff' });
  if (['confirmed', 'in_progress'].includes(booking.status)) {
    actions.push({ label: 'Complete', status: 'completed', icon: 'checkmark-done', bg: '#2563eb', fg: '#fff' });
    actions.push({ label: 'No Show', status: 'no_show', icon: 'close-circle', bg: isDark ? '#1e293b' : '#f3f4f6', fg: theme.text });
  }
  if (booking.status === 'pending') {
    actions.push({ label: 'Cancel', status: 'cancelled', icon: 'close-circle', bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', fg: '#ef4444' });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: pos === 0 ? '#a5b4fc' : theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <PosBadge pos={pos} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[styles.custName, { color: theme.text }]} numberOfLines={1}>{booking.customerName || 'Walk-in'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {booking.serviceName ? (
              <View style={styles.metaItem}>
                <Ionicons name="cut-outline" size={12} color={theme.subText} />
                <Text style={[styles.metaText, { color: theme.subText }]}>{booking.serviceName}</Text>
              </View>
            ) : null}
            {booking.appointmentTime ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={theme.subText} />
                <Text style={[styles.metaText, { color: theme.subText }]}>{booking.appointmentTime}</Text>
              </View>
            ) : null}
            {booking.customerPhone ? (
              <TouchableOpacity style={styles.metaItem} onPress={() => Linking.openURL(`tel:${booking.customerPhone}`)}>
                <Ionicons name="call-outline" size={12} color="#6366f1" />
                <Text style={[styles.metaText, { color: '#6366f1' }]}>{booking.customerPhone}</Text>
              </TouchableOpacity>
            ) : null}
            {booking.totalAmount > 0 ? (
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>₹{booking.totalAmount}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {actions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {actions.map(a => (
            <TouchableOpacity
              key={a.status}
              onPress={() => onAction(booking._id, a.status)}
              disabled={isActioning}
              style={[styles.actionBtn, { backgroundColor: a.bg, opacity: isActioning ? 0.5 : 1 }]}
            >
              {isActioning ? <ActivityIndicator size="small" color={a.fg} /> : <Ionicons name={a.icon} size={13} color={a.fg} />}
              <Text style={[styles.actionText, { color: a.fg }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function QueueScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { salon } = useSalon();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState(null);
  const socketRef = useRef(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await api.get(`/owner/bookings?date=${localDate(0)}`);
      const data = res.data.data;
      const list = Array.isArray(data) ? data : (data?.bookings || []);
      const active = list
        .filter(b => QUEUE_STATUSES.includes(b.status))
        .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
      setQueue(active);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Real-time updates
  useEffect(() => {
    if (!salon?._id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-salon', { salonId: salon._id }));
    socket.on('booking-updated', fetchQueue);
    socket.on('new-booking', fetchQueue);
    socket.on('queue-updated', fetchQueue);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [salon?._id, fetchQueue]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQueue();
    setRefreshing(false);
  };

  const handleAction = async (bookingId, status) => {
    setActioning(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status });
      showSuccess(status === 'completed' ? 'Booking completed!' : status === 'no_show' ? 'Marked as no-show' : 'Status updated');
      fetchQueue();
    } catch {
      showError('Failed to update status');
    } finally {
      setActioning(null);
    }
  };

  const inProgress = queue.filter(b => b.status === 'in_progress');
  const upcoming = queue.filter(b => b.status !== 'in_progress');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>Live Queue</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {loading ? 'Loading…' : `${queue.length} active booking${queue.length !== 1 ? 's' : ''} today`}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* Stats strip */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'In Progress', count: inProgress.length, icon: 'timer-outline', color: '#7c3aed' },
              { label: 'Upcoming', count: upcoming.length, icon: 'list-outline', color: '#6366f1' },
              { label: 'Total Today', count: queue.length, icon: 'people-outline', color: theme.subText },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
                <View>
                  <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
                  <Text style={[styles.statLabel, { color: theme.subText }]}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {inProgress.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Ionicons name="play-circle" size={15} color="#7c3aed" />
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>In Progress</Text>
              </View>
              {inProgress.map((b, i) => (
                <QueueCard key={b._id} booking={b} pos={i} onAction={handleAction} actioning={actioning} theme={theme} isDark={isDark} />
              ))}
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Ionicons name="list" size={15} color="#6366f1" />
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>{inProgress.length > 0 ? 'Up Next' : 'Queue'}</Text>
              </View>
              {upcoming.map((b, i) => (
                <QueueCard key={b._id} booking={b} pos={i} onAction={handleAction} actioning={actioning} theme={theme} isDark={isDark} />
              ))}
            </>
          )}

          {queue.length === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
                <Ionicons name="checkmark-circle-outline" size={32} color={theme.subText} />
              </View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>Queue is clear</Text>
              <Text style={{ color: theme.subText, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                No active bookings for today. New bookings will appear here automatically.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 12 },
  statCount: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  posBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  posText: { fontSize: 13, fontWeight: '800' },
  custName: { fontSize: 14, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  statusText: { fontSize: 10, fontWeight: '700' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 40, marginTop: 20 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
});
