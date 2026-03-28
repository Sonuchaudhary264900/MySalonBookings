import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showError } from '../../utils/toast';

const SORT_OPTIONS = [
  { id: 'newest',  label: 'Newest' },
  { id: 'oldest',  label: 'Oldest' },
  { id: 'highest', label: 'Highest ★' },
  { id: 'lowest',  label: 'Lowest ★' },
];

function ratingColor(rating) {
  if (rating >= 4) return '#10b981';
  if (rating >= 3) return '#f59e0b';
  return '#ef4444';
}

function Stars({ rating, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= rating ? 'star' : 'star-outline'} size={size} color={s <= rating ? '#f59e0b' : '#d1d5db'} />
      ))}
    </View>
  );
}

function RatingBar({ reviews, theme }) {
  if (!reviews.length) return null;
  const total = reviews.length;
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => (r.salonRating || r.rating || 0) === star).length,
    pct: Math.round((reviews.filter(r => (r.salonRating || r.rating || 0) === star).length / total) * 100),
  }));
  const barColor = (star) => star >= 4 ? '#10b981' : star === 3 ? '#f59e0b' : '#ef4444';
  return (
    <View style={[rbStyles.container, { backgroundColor: theme.card }]}>
      <View style={rbStyles.header}>
        <Ionicons name="trending-up-outline" size={15} color="#6366f1" />
        <Text style={[rbStyles.title, { color: theme.text }]}>Rating Distribution</Text>
      </View>
      {counts.map(({ star, count, pct }) => (
        <View key={star} style={rbStyles.row}>
          <View style={rbStyles.starLabel}>
            <Text style={[rbStyles.starNum, { color: theme.subText }]}>{star}</Text>
            <Ionicons name="star" size={11} color="#f59e0b" />
          </View>
          <View style={[rbStyles.barBg, { backgroundColor: theme.cardAlt || '#f3f4f6' }]}>
            <View style={[rbStyles.barFill, { width: pct + '%', backgroundColor: barColor(star) }]} />
          </View>
          <Text style={[rbStyles.countText, { color: theme.subText }]}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

function TopReviews({ reviews, theme }) {
  const top = reviews.filter(r => (r.salonRating || r.rating || 0) === 5 && r.reviewText).slice(0, 3);
  if (!top.length) return null;
  return (
    <View style={[trStyles.container, { backgroundColor: theme.card, borderColor: '#fde68a' }]}>
      <View style={trStyles.header}>
        <Ionicons name="star" size={15} color="#f59e0b" />
        <Text style={[trStyles.title, { color: theme.text }]}>Top Reviews</Text>
        <View style={trStyles.badge}><Text style={trStyles.badgeText}>5 ★ only</Text></View>
      </View>
      {top.map(r => (
        <View key={r._id} style={[trStyles.item, { backgroundColor: theme.bg, borderColor: '#fde68a' }]}>
          <Ionicons name="star" size={12} color="#f59e0b" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[trStyles.text, { color: theme.text }]} numberOfLines={2}>"{r.reviewText}"</Text>
            <Text style={[trStyles.author, { color: theme.subText }]}>— {r.customerName || 'Customer'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ReviewCard({ review, onReplySubmit, theme }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState(review.ownerResponse || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!replyText.trim()) { showError('Error', 'Reply cannot be empty'); return; }
    setSaving(true);
    try {
      await api.put(`/owner/reviews/${review._id}/reply`, { reply: replyText.trim() });
      onReplySubmit(review._id, replyText.trim());
      setReplying(false);
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const rating = review.salonRating || review.rating || 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{review.customerName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customerName, { color: theme.text }]}>{review.customerName || 'Anonymous'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <Stars rating={rating} />
            <Text style={[styles.dateText, { color: theme.subText }]}>{timeAgo(review.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.ratingBadge, { backgroundColor: ratingColor(rating) + '20' }]}>
          <Text style={[styles.ratingBadgeText, { color: ratingColor(rating) }]}>{rating}/5</Text>
        </View>
      </View>

      {review.title && <Text style={[styles.reviewTitle, { color: theme.text }]}>{review.title}</Text>}
      {review.reviewText && <Text style={[styles.reviewText, { color: theme.subText }]}>{review.reviewText}</Text>}

      {review.ownerResponse && !replying && (
        <View style={styles.replyBox}>
          <View style={styles.replyHeader}>
            <Ionicons name="chatbubble-outline" size={13} color="#6366f1" />
            <Text style={styles.replyLabel}>Your Reply</Text>
          </View>
          <Text style={styles.replyText}>{review.ownerResponse}</Text>
          <TouchableOpacity onPress={() => { setReplyText(review.ownerResponse); setReplying(true); }} style={styles.editReplyBtn}>
            <Ionicons name="create-outline" size={13} color="#6366f1" />
            <Text style={styles.editReplyText}>Edit Reply</Text>
          </TouchableOpacity>
        </View>
      )}

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
            <TouchableOpacity style={[styles.replyBtn, styles.replyBtnPrimary]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.replyBtnText}>Save Reply</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.replyBtn, styles.replyBtnOutline]} onPress={() => { setReplying(false); setReplyText(review.ownerResponse || ''); }} disabled={saving}>
              <Text style={styles.replyBtnOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : !review.ownerResponse ? (
        <TouchableOpacity style={styles.replyNowBtn} onPress={() => setReplying(true)}>
          <Ionicons name="chatbubble-outline" size={14} color="#6366f1" />
          <Text style={styles.replyNowText}>Reply to Review</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get('/owner/reviews');
      const d = res.data.data;
      setReviews(Array.isArray(d) ? d : (d?.reviews || []));
    } catch { setReviews([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReviews(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchReviews(); setRefreshing(false); };

  const handleReplySubmit = useCallback((id, reply) => {
    setReviews(prev => prev.map(r => r._id === id ? { ...r, ownerResponse: reply } : r));
  }, []);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? (reviews.reduce((s, r) => s + (r.salonRating || r.rating || 0), 0) / total).toFixed(1) : '—';
    const replied = reviews.filter(r => r.ownerResponse).length;
    const unreplied = reviews.filter(r => !r.ownerResponse).length;
    return { total, avg, replied, unreplied };
  }, [reviews]);

  const displayed = useMemo(() => {
    let list = [...reviews];
    if (filter === 'unreplied') list = reviews.filter(r => !r.ownerResponse);
    if (filter === 'replied')   list = reviews.filter(r => !!r.ownerResponse);
    return list.sort((a, b) => {
      if (sort === 'newest')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'oldest')  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'highest') return (b.salonRating || b.rating || 0) - (a.salonRating || a.rating || 0);
      if (sort === 'lowest')  return (a.salonRating || a.rating || 0) - (b.salonRating || b.rating || 0);
      return 0;
    });
  }, [reviews, filter, sort]);

  const FILTERS_WITH_COUNT = [
    { id: 'all',       label: 'All',        count: reviews.length },
    { id: 'unreplied', label: 'Needs Reply', count: stats.unreplied },
    { id: 'replied',   label: 'Replied',     count: stats.replied },
  ];

  const STAT_CARDS = [
    { label: 'Total Reviews', value: stats.total,    icon: 'star-outline',             color: '#d97706', bg: '#fef3c7' },
    { label: 'Avg Rating',    value: stats.avg,       icon: 'trending-up-outline',      color: '#6366f1', bg: '#e0e7ff' },
    { label: 'Replied',       value: stats.replied,   icon: 'checkmark-circle-outline', color: '#10b981', bg: '#d1fae5' },
    { label: 'Needs Reply',   value: stats.unreplied, icon: 'alert-circle-outline',     color: '#ef4444', bg: '#fee2e2' },
  ];

  const ListHeader = () => (
    <View style={{ gap: 12, marginBottom: 4 }}>
      {!loading && reviews.length > 0 && (
        <View style={styles.statsGrid}>
          {STAT_CARDS.map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={16} color={s.color} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {reviews.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {FILTERS_WITH_COUNT.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterPill, filter === f.id && styles.filterPillActive, { borderColor: filter === f.id ? '#6366f1' : theme.border }]}
                onPress={() => setFilter(f.id)}
              >
                {f.id === 'unreplied' && stats.unreplied > 0 && filter !== f.id && <View style={styles.alertDot} />}
                <Text style={[styles.filterPillText, filter === f.id && styles.filterPillTextActive, { color: filter === f.id ? '#fff' : theme.subText }]}>{f.label}</Text>
                <View style={[styles.countBadge, filter === f.id && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, filter === f.id && styles.countBadgeTextActive]}>{f.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {reviews.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sortRow}>
            <Text style={[styles.sortLabel, { color: theme.subText }]}>Sort:</Text>
            {SORT_OPTIONS.map(s => (
              <TouchableOpacity key={s.id} style={[styles.sortPill, sort === s.id && styles.sortPillActive, { borderColor: sort === s.id ? '#6366f1' : theme.border, backgroundColor: sort === s.id ? '#6366f1' : theme.card }]} onPress={() => setSort(s.id)}>
                <Text style={[styles.sortPillText, { color: sort === s.id ? '#fff' : theme.subText }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {!loading && reviews.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={[styles.ratingHero, { backgroundColor: isDark ? '#1c1a0e' : '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }]}>
            <Text style={[styles.ratingHeroNum, { color: theme.text }]}>{stats.avg}</Text>
            <Stars rating={Math.round(parseFloat(stats.avg) || 0)} size={22} />
            <Text style={[styles.ratingHeroSub, { color: theme.subText }]}>Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
          </View>
          <RatingBar reviews={reviews} theme={theme} />
          <TopReviews reviews={reviews} theme={theme} />
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Reviews</Text>
            <Text style={styles.headerSub}>Manage customer feedback and ratings</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          data={displayed}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <ReviewCard review={item} onReplySubmit={handleReplySubmit} theme={theme} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#292107' : '#fef9c3' }]}>
                <Ionicons name="star-outline" size={32} color="#d97706" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {filter === 'unreplied' ? 'All replies done!' : 'No reviews yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.subText }]}>
                {filter === 'unreplied' ? 'Great job keeping up with feedback' : 'Reviews will appear after bookings are completed'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const rbStyles = StyleSheet.create({
  container: { borderRadius: 14, padding: 14, marginBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  starLabel: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 26 },
  starNum: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  barBg: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  countText: { fontSize: 11, width: 20, textAlign: 'right' },
});

const trStyles = StyleSheet.create({
  container: { borderRadius: 14, padding: 14, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '700', flex: 1 },
  badge: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#d97706' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1 },
  text: { fontSize: 12, lineHeight: 17 },
  author: { fontSize: 10, marginTop: 4 },
});

const styles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 1 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 12 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterPillActive: { backgroundColor: '#6366f1' },
  filterPillText: { fontSize: 12, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  countBadge: { backgroundColor: '#f3f4f6', borderRadius: 999, minWidth: 18, paddingHorizontal: 4, paddingVertical: 1, alignItems: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countBadgeText: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },
  countBadgeTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },
  sortLabel: { fontSize: 12, fontWeight: '600' },
  sortPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  sortPillActive: { backgroundColor: '#6366f1' },
  sortPillText: { fontSize: 12, fontWeight: '600' },
  sortPillTextActive: { color: '#fff' },
  ratingHero: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  ratingHeroNum: { fontSize: 48, fontWeight: '900', lineHeight: 54 },
  ratingHeroSub: { fontSize: 12, marginTop: 4 },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  customerName: { fontSize: 14, fontWeight: '700' },
  dateText: { fontSize: 11 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingBadgeText: { fontSize: 12, fontWeight: '700' },
  reviewTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  reviewText: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  replyBox: { backgroundColor: '#e0e7ff', borderRadius: 10, padding: 12, marginBottom: 8 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  replyLabel: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  replyText: { fontSize: 13, color: '#4338ca', lineHeight: 18 },
  editReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  editReplyText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  replyNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eef2ff' },
  replyNowText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  replyInputBox: { marginTop: 8 },
  replyInput: { borderWidth: 1.5, borderColor: '#93c5fd', borderRadius: 10, padding: 12, fontSize: 13, color: '#111827', minHeight: 80, backgroundColor: '#fafafa' },
  replyActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  replyBtn: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  replyBtnPrimary: { backgroundColor: '#6366f1' },
  replyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  replyBtnOutline: { borderWidth: 1.5, borderColor: '#d1d5db' },
  replyBtnOutlineText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptySub: { fontSize: 12, textAlign: 'center', maxWidth: 260 },
});
