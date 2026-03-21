import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  Linking, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { showSuccess, showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

// Filter order: Upcoming first, All last
const FILTERS = ['Upcoming', 'Completed', 'Cancelled', 'All'];

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  confirmed:   { label: 'Confirmed',   color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  completed:   { label: 'Completed',   color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeLabel(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayH = hour % 12 || 12;
  return `${displayH}:${m || '00'} ${ampm}`;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
  return (
    <View style={[badgeStyle.wrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[badgeStyle.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyle = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ── ReviewPrompt ──────────────────────────────────────────────────────────────

function ReviewPrompt({ bookingId, onReviewed, theme }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return (
    <View style={{ marginTop: 10, padding: 10, backgroundColor: '#dcfce7', borderRadius: 8, borderWidth: 1, borderColor: '#86efac' }}>
      <Text style={{ fontSize: 12, color: '#16a34a' }}>Thank you for your review!</Text>
    </View>
  );

  if (!open) return (
    <TouchableOpacity
      style={{ marginTop: 10, padding: 10, backgroundColor: '#eef2ff', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      onPress={() => setOpen(true)}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 12, color: '#4338ca' }}>How was your experience?</Text>
      <Text style={{ fontSize: 12, color: '#4338ca', fontWeight: '700' }}>Leave a Review</Text>
    </TouchableOpacity>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await api.post('/customer/reviews', { bookingId, salonRating: rating, reviewText: text.trim() || undefined });
      setDone(true);
      onReviewed?.();
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ marginTop: 10, padding: 12, backgroundColor: '#eef2ff', borderRadius: 8, gap: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4338ca' }}>Rate your experience</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={{ fontSize: 26, color: n <= rating ? '#f59e0b' : '#d1d5db' }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Share your experience (optional)"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        style={{
          borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 8, padding: 8,
          fontSize: 12, color: theme?.text || '#1e293b', textAlignVertical: 'top',
          backgroundColor: '#fff', minHeight: 52,
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!rating || submitting}
          style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#4f46e5', borderRadius: 8, opacity: !rating || submitting ? 0.5 : 1 }}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Submit</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── RescheduleModal ───────────────────────────────────────────────────────────

function RescheduleModal({ booking, onClose, onRescheduled, theme }) {
  const rs = getRescheduleStyles(theme);
  const [newDate, setNewDate] = useState(todayString());
  const [newTime, setNewTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const salonId = booking.salonId?._id || booking.salonId;
  const duration = booking.estimatedDuration || 30;

  useEffect(() => {
    if (!newDate || !salonId) return;
    setNewTime('');
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
    setSlotsLoading(true);
    api.get(`/public/salons/${salonId}/booked-slots?date=${newDate}&duration=${duration}`)
      .then(res => {
        const data = res.data.data || {};
        setClosedDay(data.closedDay || false);
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [newDate, salonId, duration]);

  const handleSave = async () => {
    if (!newDate || !newTime) { setError('Please select a date and a time slot.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`/customer/bookings/${booking._id}/reschedule`, { appointmentDate: newDate, appointmentTime: newTime });
      onRescheduled(booking._id, newDate, newTime);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reschedule. Try another slot.');
    } finally {
      setSaving(false);
    }
  };

  // Next 7 days as quick-select chips
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    return { key, label };
  });

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={rs.overlay}>
        <View style={rs.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={rs.title}>Reschedule Booking</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme?.subText || '#6b7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick date selector */}
            <Text style={rs.label}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {quickDates.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setNewDate(key)}
                    style={[rs.dateChip, newDate === key && rs.dateChipActive]}
                  >
                    <Text style={[rs.dateChipText, newDate === key && rs.dateChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Slot grid */}
            <Text style={rs.label}>Select Time Slot</Text>
            {slotsLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                <ActivityIndicator color="#4f46e5" size="small" />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Loading slots…</Text>
              </View>
            ) : closedDay ? (
              <View style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#d97706' }}>Salon is closed on this day. Choose another date.</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={{ padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>No available slots on this date.</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                  {[['#fca5a5', 'Booked'], ['#6366f1', 'Selected'], ['#e2e8f0', 'Available']].map(([c, l]) => (
                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>{l}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {slots.map(s => {
                    const blocked = blockedSlots.includes(s);
                    const selected = newTime === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { if (!blocked) setNewTime(s); }}
                        disabled={blocked}
                        style={[rs.slotChip, blocked && rs.slotBlocked, selected && rs.slotSelected]}
                      >
                        <Text style={[rs.slotText, blocked && rs.slotBlockedText, selected && rs.slotSelectedText]}>
                          {formatTimeLabel(s)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {!!error && <Text style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</Text>}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !newTime}
                style={[rs.saveBtn, (!newTime || saving) && { opacity: 0.5 }]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={rs.saveBtnText}>Confirm Reschedule</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={rs.cancelBtn}>
                <Text style={rs.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getRescheduleStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t?.card || '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  title: { fontSize: 17, fontWeight: '700', color: t?.text || '#1e293b' },
  label: { fontSize: 13, fontWeight: '600', color: t?.subText || '#6b7280', marginBottom: 8 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t?.border || '#f1f5f9', borderWidth: 1, borderColor: t?.border || '#e2e8f0' },
  dateChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  dateChipText: { fontSize: 13, color: t?.subText || '#6b7280', fontWeight: '600' },
  dateChipTextActive: { color: '#fff' },
  slotChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  slotBlocked: { backgroundColor: '#fff1f2', borderColor: '#fca5a5' },
  slotSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  slotText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  slotBlockedText: { color: '#ef4444' },
  slotSelectedText: { color: '#fff' },
  saveBtn: { flex: 2, height: 48, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: t?.border || '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: t?.subText || '#6b7280' },
});

// ── BookingCard ───────────────────────────────────────────────────────────────

function BookingCard({ booking: initialBooking, userCoords, onCancelled, theme }) {
  const cs = getCardStyles(theme);
  const [booking, setBooking] = useState(initialBooking);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const status = booking.status || 'pending';

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await api.post(`/customer/bookings/${booking._id}/cancel`);
            showSuccess('Cancelled', 'Your booking has been cancelled.');
            onCancelled(booking._id);
          } catch (err) {
            showError('Error', err?.message || 'Could not cancel. Try again.');
          }
        },
      },
    ]);
  };

  const handleRescheduled = (id, date, time) => {
    setBooking(prev => ({ ...prev, appointmentDate: date, appointmentTime: time, status: 'pending' }));
  };

  const salonDoc    = booking.salonId;
  const salonName   = booking.salonName || salonDoc?.name || 'Salon';
  const salonCity   = salonDoc?.city || salonDoc?.address || '';
  const salonPhone  = salonDoc?.phone || null;
  const serviceName = booking.serviceName ||
    (Array.isArray(booking.serviceIds) ? booking.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') ||
    'Service';

  const dur = booking.estimatedDuration;
  const durLabel = dur
    ? (dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur} min`)
    : null;

  // Distance
  let distanceLabel = null;
  if (userCoords && salonDoc?.location?.coordinates?.length === 2) {
    const [salonLng, salonLat] = salonDoc.location.coordinates;
    const km = haversineKm(userCoords.lat, userCoords.lng, salonLat, salonLng);
    distanceLabel = km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
  }

  // Maps URL
  let mapsUrl = null;
  if (salonDoc?.location?.coordinates?.length === 2) {
    const [lng, lat] = salonDoc.location.coordinates;
    mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  } else {
    const query = [salonDoc?.address || booking.salonName, salonDoc?.city].filter(Boolean).join(', ');
    if (query) mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const canCancel     = ['pending', 'confirmed'].includes(status);
  const canReschedule = ['pending', 'confirmed'].includes(status);
  const canReview     = status === 'completed' && !reviewed && !initialBooking.reviewed;

  const detailTiles = [
    { label: 'Date',    value: formatDateLabel(booking.appointmentDate) },
    { label: 'Time',    value: formatTimeLabel(booking.appointmentTime) },
    { label: 'Amount',  value: booking.totalAmount != null ? `\u20B9${booking.totalAmount}` : '\u2014', amountStyle: true },
    ...(durLabel ? [{ label: 'Duration', value: durLabel }] : []),
    { label: 'Payment', value: booking.paymentMethod ? booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1) : '\u2014' },
    ...(distanceLabel ? [{ label: 'Distance', value: distanceLabel, accent: true }] : []),
  ];

  return (
    <View style={cs.card}>
      {/* Header */}
      <View style={cs.headerRow}>
        <View style={cs.iconWrap}>
          <Text style={{ fontSize: 20, color: '#fff' }}>✂</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cs.serviceName} numberOfLines={1}>{serviceName}</Text>
          <Text style={cs.salonName} numberOfLines={1}>{salonName}</Text>
          {!!salonCity && <Text style={cs.salonCity} numberOfLines={1}>{salonCity}</Text>}
        </View>
        <StatusBadge status={status} />
      </View>

      {/* Detail grid */}
      <View style={cs.grid}>
        {detailTiles.map(tile => (
          <View key={tile.label} style={[cs.tile, tile.accent && cs.tileAccent]}>
            <Text style={[cs.tileLabel, tile.accent && cs.tileLabelAccent]}>{tile.label}</Text>
            <Text style={[cs.tileValue, tile.amountStyle && cs.tileAmountValue, tile.accent && cs.tileValueAccent]}>
              {tile.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Pending banner */}
      {status === 'pending' && (
        <View style={cs.pendingBanner}>
          <Text style={cs.pendingText}>
            Awaiting confirmation from the salon. You'll be notified once confirmed.
          </Text>
        </View>
      )}

      {/* Inline review prompt */}
      {canReview && (
        <ReviewPrompt bookingId={booking._id} onReviewed={() => setReviewed(true)} theme={theme} />
      )}
      {reviewed && (
        <View style={{ marginTop: 10, padding: 10, backgroundColor: '#dcfce7', borderRadius: 8, borderWidth: 1, borderColor: '#86efac' }}>
          <Text style={{ fontSize: 12, color: '#16a34a' }}>Thank you for your review!</Text>
        </View>
      )}

      {/* Footer */}
      <View style={cs.footer}>
        <Text style={cs.bookingId}>
          {'Booking ID: '}
          <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
            {booking.bookingId || (booking._id?.slice(-8) || '\u2014')}
          </Text>
        </Text>
        <View style={cs.footerActions}>
          {!!salonPhone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${salonPhone}`)} style={cs.footerLink}>
              <Ionicons name="call-outline" size={12} color="#4f46e5" />
              <Text style={[cs.footerLinkText, { color: '#4f46e5' }]}>{salonPhone}</Text>
            </TouchableOpacity>
          )}
          {!!mapsUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)} style={cs.footerLink}>
              <Ionicons name="navigate-outline" size={12} color="#16a34a" />
              <Text style={[cs.footerLinkText, { color: '#16a34a' }]}>Directions</Text>
            </TouchableOpacity>
          )}
          {canReschedule && (
            <TouchableOpacity onPress={() => setRescheduleOpen(true)}>
              <Text style={[cs.footerLinkText, { color: '#4f46e5' }]}>Reschedule</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity onPress={handleCancel}>
              <Text style={[cs.footerLinkText, { color: '#dc2626' }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {rescheduleOpen && (
        <RescheduleModal
          booking={booking}
          onClose={() => setRescheduleOpen(false)}
          onRescheduled={handleRescheduled}
          theme={theme}
        />
      )}
    </View>
  );
}

const getCardStyles = (t) => StyleSheet.create({
  card: { backgroundColor: t?.card || '#fff', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: t?.border || '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 15, fontWeight: '700', color: t?.text || '#1e293b' },
  salonName: { fontSize: 13, color: t?.subText || '#64748b', marginTop: 1 },
  salonCity: { fontSize: 12, color: t?.subText || '#94a3b8', marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flex: 1, minWidth: '30%', backgroundColor: t?.bg || '#f8fafc', borderRadius: 8, padding: 10 },
  tileAccent: { backgroundColor: '#eef2ff' },
  tileLabel: { fontSize: 11, color: t?.subText || '#94a3b8', marginBottom: 2 },
  tileLabelAccent: { color: '#818cf8' },
  tileValue: { fontSize: 13, fontWeight: '600', color: t?.text || '#334155' },
  tileAmountValue: { color: '#4f46e5', fontWeight: '700' },
  tileValueAccent: { color: '#4338ca' },
  pendingBanner: { padding: 10, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8 },
  pendingText: { fontSize: 12, color: '#d97706' },
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: t?.border || '#f1f5f9', gap: 6 },
  bookingId: { fontSize: 11, color: t?.subText || '#94a3b8' },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerLinkText: { fontSize: 12, fontWeight: '600' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();

  const PAGE_SIZE = 5;
  const [filter, setFilter]         = useState('Upcoming'); // default: Upcoming
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [confirmedToasts, setConfirmedToasts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const prevStatusRef = useRef({});

  // Request location once for distance tiles
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
          .then(pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
          .catch(() => {});
      }
    });
  }, []);

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) loadBookings();
    return () => { setVisibleCount(PAGE_SIZE); };
  }, [isAuthenticated]));

  const loadBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/customer/bookings');
      const fresh = res.data.data?.bookings || res.data.data || [];
      const arr = Array.isArray(fresh) ? fresh : [];

      // Detect pending → confirmed transitions
      const newlyConfirmed = arr.filter(
        b => b._id && prevStatusRef.current[b._id] === 'pending' && b.status === 'confirmed'
      );
      if (newlyConfirmed.length > 0) {
        setConfirmedToasts(prev => [...prev, ...newlyConfirmed.map(b => b._id)]);
        setFilter('Upcoming');
      }
      arr.forEach(b => { if (b._id) prevStatusRef.current[b._id] = b.status; });

      setBookings(arr);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings(true);
    setRefreshing(false);
  };

  const handleCancelled = (id) => {
    setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
  };

  const filtered = bookings.filter(b => {
    if (filter === 'All')       return true;
    if (filter === 'Upcoming')  return ['pending', 'confirmed', 'in_progress'].includes(b.status);
    if (filter === 'Completed') return b.status === 'completed';
    if (filter === 'Cancelled') return b.status === 'cancelled';
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const stats = {
    total:     bookings.length,
    upcoming:  bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="calendar-outline" size={56} color="#d1d5db" />
        <Text style={styles.guestTitle}>Sign in to view bookings</Text>
        <Text style={styles.guestText}>Track all your salon appointments in one place</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ListHeader = (
    <>
      {/* Stats row */}
      {!loading && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total',     value: stats.total,     color: theme.text },
            { label: 'Upcoming',  value: stats.upcoming,  color: '#2563eb' },
            { label: 'Completed', value: stats.completed, color: '#16a34a' },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statCard}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Confirmed toasts */}
      {confirmedToasts.map(id => {
        const b = bookings.find(x => x._id === id);
        if (!b) return null;
        return (
          <View key={id} style={styles.toast}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Text style={{ fontSize: 18 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.toastTitle}>Booking Confirmed!</Text>
                <Text style={styles.toastBody} numberOfLines={1}>
                  {b.serviceName} at {b.salonName || b.salonId?.name} — {b.appointmentTime}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setConfirmedToasts(prev => prev.filter(t => t !== id))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#16a34a" />
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Filter tabs — full width, left to right */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'Notifications' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.subText} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        data={loading ? [] : visible}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            userCoords={userCoords}
            onCancelled={handleCancelled}
            theme={theme}
          />
        )}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>📅</Text>
              <Text style={styles.emptyTitle}>
                No {filter === 'All' ? '' : filter.toLowerCase()} bookings
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'All'
                  ? 'Book your first salon appointment now!'
                  : `You have no ${filter.toLowerCase()} bookings.`}
              </Text>
              {filter === 'All' && (
                <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('HomeTab')}>
                  <Text style={styles.exploreBtnText}>Explore Salons</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setVisibleCount(c => c + PAGE_SIZE)}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
              <Ionicons name="chevron-down" size={16} color={theme.accent} />
            </TouchableOpacity>
          ) : filtered.length > PAGE_SIZE ? (
            <Text style={styles.allLoadedText}>All {filtered.length} bookings shown</Text>
          ) : null
        }
      />
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: t.card, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: t.text },
  headerSub: { fontSize: 13, color: t.subText, marginTop: 2 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: t.card },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: t.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: t.subText, marginTop: 2 },
  toast: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, marginBottom: 10, gap: 8 },
  toastTitle: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  toastBody: { fontSize: 11, color: '#16a34a', marginTop: 1 },
  // Filter tabs: full-width row, each chip gets flex: 1
  filterRow: { flexDirection: 'row', backgroundColor: t.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: t.border, marginBottom: 14 },
  filterChip: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  filterChipActive: { backgroundColor: '#4f46e5' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: t.subText },
  filterChipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', padding: 40, gap: 10, paddingTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginTop: 16 },
  guestText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  signInBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: t.accent },
  allLoadedText: { textAlign: 'center', fontSize: 12, color: t.subText, marginTop: 12, paddingBottom: 8 },
});
