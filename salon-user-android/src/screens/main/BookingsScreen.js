import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { showSuccess, showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

const FILTERS = ['All', 'Upcoming', 'Completed', 'Cancelled'];

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  confirmed:   { label: 'Confirmed',   color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  completed:   { label: 'Completed',   color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};

function StatusBadge({ status }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function ReviewModal({ visible, onClose, onSubmit }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { showError('Rate', 'Please select a star rating.'); return; }
    setLoading(true);
    await onSubmit(rating, text.trim());
    setLoading(false);
    setRating(0);
    setText('');
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.reviewModal}>
          <Text style={styles.reviewModalTitle}>Rate Your Experience</Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(i => (
              <TouchableOpacity key={i} onPress={() => setRating(i)}>
                <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={36} color="#f59e0b" />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={300}
            value={text}
            onChangeText={setText}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.reviewCancelBtn} onPress={onClose}>
              <Text style={styles.reviewCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reviewSubmitBtn, !rating && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!rating || loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.reviewSubmitText}>Submit Review</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function BookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const [filter, setFilter]         = useState('All');
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewed, setReviewed]     = useState(new Set());

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) loadBookings();
  }, [isAuthenticated]));

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customer/bookings');
      const data = res.data.data?.bookings || res.data.data || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings().catch(() => {});
    setRefreshing(false);
  };

  const handleCancel = (bookingId) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await api.post(`/customer/bookings/${bookingId}/cancel`);
          showSuccess('Cancelled', 'Your booking has been cancelled.');
          loadBookings();
        } catch (err) {
          showError('Error', err?.message || 'Could not cancel booking. Try again.');
        }
      }},
    ]);
  };

  const handleReviewSubmit = async (rating, text) => {
    if (!reviewBooking) return;
    try {
      await api.post('/customer/reviews', {
        bookingId: reviewBooking._id,
        salonRating: rating,
        reviewText: text || undefined,
      });
      setReviewed(prev => new Set([...prev, reviewBooking._id]));
      setReviewBooking(null);
      showSuccess('Thank You!', 'Your review has been submitted.');
    } catch (err) {
      showError('Error', err?.message || 'Failed to submit review.');
    }
  };

  const filtered = bookings.filter(b => {
    if (filter === 'All') return true;
    if (filter === 'Upcoming')  return ['pending','confirmed','in_progress'].includes(b.status);
    if (filter === 'Completed') return b.status === 'completed';
    if (filter === 'Cancelled') return b.status === 'cancelled';
    return true;
  });

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

  const renderBooking = ({ item }) => {
    const salonName    = item.salonId?.name || item.salonName || 'Salon';
    const serviceName  = Array.isArray(item.serviceIds)
      ? item.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ')
      : item.serviceName || 'Service';
    const date         = item.appointmentDate?.split('T')[0] || item.appointmentDate || '';
    const time         = item.appointmentTime || '';
    const canCancel    = ['pending','confirmed'].includes(item.status);
    const canReview    = item.status === 'completed' && !reviewed.has(item._id) && !item.reviewed;

    return (
      <View style={styles.bookingCard}>
        {/* Top row */}
        <View style={styles.bookingHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingSalon} numberOfLines={1}>{salonName}</Text>
            <Text style={styles.bookingService} numberOfLines={1}>{serviceName}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Date & Time */}
        <View style={styles.bookingMeta}>
          <View style={styles.bookingMetaItem}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.bookingMetaText}>{date}</Text>
          </View>
          <View style={styles.bookingMetaItem}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.bookingMetaText}>{time}</Text>
          </View>
          {item.totalAmount > 0 && (
            <View style={styles.bookingMetaItem}>
              <Ionicons name="cash-outline" size={14} color="#6b7280" />
              <Text style={styles.bookingMetaText}>₹{item.totalAmount}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.bookingActions}>
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item._id)}>
              <Ionicons name="close-outline" size={14} color="#dc2626" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {canReview && (
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setReviewBooking(item)}>
              <Ionicons name="star-outline" size={14} color="#f59e0b" />
              <Text style={styles.reviewBtnText}>Leave Review</Text>
            </TouchableOpacity>
          )}
          {reviewed.has(item._id) && (
            <View style={styles.reviewedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text style={styles.reviewedText}>Reviewed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</Text>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'Notifications' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.getParent('DrawerNav')?.openDrawer()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={i => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={52} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No {filter === 'All' ? '' : filter.toLowerCase()} bookings</Text>
          <Text style={styles.emptyText}>
            {filter === 'All' ? 'Book your first salon appointment now!' : `You have no ${filter.toLowerCase()} bookings.`}
          </Text>
          {filter === 'All' && (
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('HomeTab')}>
              <Text style={styles.exploreBtnText}>Explore Salons</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        />
      )}

      <ReviewModal
        visible={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        onSubmit={handleReviewSubmit}
      />
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 },
  decorCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  menuBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  filterRow: { backgroundColor: t.card, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: t.border, borderWidth: 1.5, borderColor: t.border },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: t.subText },
  filterChipTextActive: { color: '#fff' },
  bookingCard: { backgroundColor: t.card, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: t.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bookingHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bookingSalon: { fontSize: 15, fontWeight: '700', color: t.text },
  bookingService: { fontSize: 13, color: t.subText, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  bookingMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bookingMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingMetaText: { fontSize: 12, color: t.subText },
  bookingActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff1f2' },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fefce8' },
  reviewBtnText: { fontSize: 12, fontWeight: '600', color: '#d97706' },
  reviewedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  reviewedText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginTop: 16 },
  guestText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  signInBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  reviewModal: { backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  reviewModalTitle: { fontSize: 18, fontWeight: '700', color: t.text, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  reviewInput: { borderWidth: 1.5, borderColor: t.inputBorder, borderRadius: 12, padding: 12, fontSize: 14, color: t.text, minHeight: 80, textAlignVertical: 'top' },
  reviewCancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: t.inputBorder, alignItems: 'center', justifyContent: 'center' },
  reviewCancelText: { fontSize: 14, fontWeight: '600', color: t.subText },
  reviewSubmitBtn: { flex: 2, height: 48, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  reviewSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
