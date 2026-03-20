import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const FILTERS = ['all', 'needs_reply', 'replied'];

function Stars({ rating }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rating ? 'star' : 'star-outline'}
          size={14}
          color={s <= rating ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review, onReplySubmit }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState(review.ownerResponse || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!replyText.trim()) { Alert.alert('Error', 'Reply cannot be empty'); return; }
    setSaving(true);
    try {
      await api.put(`/owner/reviews/${review._id}/reply`, { reply: replyText.trim() });
      onReplySubmit(review._id, replyText.trim());
      setReplying(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save reply');
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{review.customerName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{review.customerName || 'Anonymous'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <Stars rating={review.salonRating || review.rating || 0} />
            <Text style={styles.dateText}>{timeAgo(review.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.ratingBadge, { backgroundColor: ratingColor(review.salonRating || review.rating) + '20' }]}>
          <Text style={[styles.ratingBadgeText, { color: ratingColor(review.salonRating || review.rating) }]}>
            {review.salonRating || review.rating || 0}/5
          </Text>
        </View>
      </View>

      {/* Review text */}
      {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
      {review.reviewText && <Text style={styles.reviewText}>{review.reviewText}</Text>}

      {/* Owner reply */}
      {review.ownerResponse && !replying && (
        <View style={styles.replyBox}>
          <View style={styles.replyHeader}>
            <Ionicons name="chatbubble-outline" size={13} color="#4f46e5" />
            <Text style={styles.replyLabel}>Your Reply</Text>
          </View>
          <Text style={styles.replyText}>{review.ownerResponse}</Text>
          <TouchableOpacity onPress={() => { setReplyText(review.ownerResponse); setReplying(true); }} style={styles.editReplyBtn}>
            <Ionicons name="create-outline" size={13} color="#4f46e5" />
            <Text style={styles.editReplyText}>Edit Reply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reply input */}
      {replying ? (
        <View style={styles.replyInputBox}>
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write your reply…"
            placeholderTextColor="#9ca3af"
            multiline
            editable={!saving}
            textAlignVertical="top"
          />
          <View style={styles.replyActions}>
            <TouchableOpacity
              style={[styles.replyBtn, styles.replyBtnPrimary]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.replyBtnText}>Save Reply</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.replyBtn, styles.replyBtnOutline]}
              onPress={() => { setReplying(false); setReplyText(review.ownerResponse || ''); }}
              disabled={saving}
            >
              <Text style={styles.replyBtnOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : !review.ownerResponse ? (
        <TouchableOpacity style={styles.replyNowBtn} onPress={() => setReplying(true)}>
          <Ionicons name="chatbubble-outline" size={14} color="#4f46e5" />
          <Text style={styles.replyNowText}>Reply to Review</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ratingColor(rating) {
  if (rating >= 4) return '#10b981';
  if (rating >= 3) return '#f59e0b';
  return '#ef4444';
}

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get('/owner/reviews');
      const d = res.data.data;
      setReviews(Array.isArray(d) ? d : (d?.reviews || []));
    } catch { setReviews([]); } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchReviews(); setRefreshing(false); };

  const handleReplySubmit = useCallback((reviewId, reply) => {
    setReviews((prev) => prev.map((r) => r._id === reviewId ? { ...r, ownerResponse: reply } : r));
  }, []);

  const filtered = reviews.filter((r) => {
    if (filter === 'needs_reply') return !r.ownerResponse;
    if (filter === 'replied') return !!r.ownerResponse;
    return true;
  });

  const total = reviews.length;
  const avgRating = total
    ? (reviews.reduce((s, r) => s + (r.salonRating || r.rating || 0), 0) / total).toFixed(1)
    : '—';
  const repliedCount = reviews.filter((r) => r.ownerResponse).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reviews</Text>
        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: total },
            { label: 'Avg Rating', value: avgRating },
            { label: 'Replied', value: repliedCount },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'all' ? 'All' : f === 'needs_reply' ? 'Needs Reply' : 'Replied'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ReviewCard review={item} onReplySubmit={handleReplySubmit} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 14 }}>
                {filter === 'needs_reply' ? 'All reviews have been replied to!' : 'No reviews yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 0, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 10, marginHorizontal: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#c7d2fe', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, paddingVertical: 7, borderRadius: 999, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  filterTabTextActive: { color: '#4f46e5' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  customerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dateText: { fontSize: 11, color: '#9ca3af' },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingBadgeText: { fontSize: 12, fontWeight: '700' },
  reviewTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  reviewText: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 10 },
  replyBox: { backgroundColor: '#ede9fe', borderRadius: 10, padding: 12, marginBottom: 8 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  replyLabel: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  replyText: { fontSize: 13, color: '#3730a3', lineHeight: 18 },
  editReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  editReplyText: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  replyNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#c4b5fd', backgroundColor: '#f5f3ff' },
  replyNowText: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },
  replyInputBox: { marginTop: 8 },
  replyInput: { borderWidth: 1.5, borderColor: '#c4b5fd', borderRadius: 10, padding: 12, fontSize: 13, color: '#111827', minHeight: 80, backgroundColor: '#fafafa' },
  replyActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  replyBtn: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  replyBtnPrimary: { backgroundColor: '#4f46e5' },
  replyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  replyBtnOutline: { borderWidth: 1.5, borderColor: '#d1d5db' },
  replyBtnOutlineText: { color: '#374151', fontWeight: '600', fontSize: 13 },
});
