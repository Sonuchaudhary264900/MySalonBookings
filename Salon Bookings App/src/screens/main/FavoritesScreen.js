import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function isOpenNow(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

function getTodayHours(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open || !h.close) return null;
  return `${h.open} – ${h.close}`;
}

function StarRating({ rating }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={11} color="#f59e0b" />
      ))}
    </View>
  );
}

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const [salons, setSalons]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving]   = useState(null);

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) loadFavorites();
  }, [isAuthenticated]));

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customer/favorites');
      const data = res.data.data?.salons || res.data.data || [];
      setSalons(Array.isArray(data) ? data : []);
    } catch {
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites().catch(() => {});
    setRefreshing(false);
  };

  const handleRemove = (salonId, salonName) => {
    Alert.alert('Remove Saved', `Remove ${salonName} from your saved salons?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setRemoving(salonId);
        try {
          await api.post(`/customer/favorites/${salonId}`);
          setSalons(prev => prev.filter(s => s._id !== salonId));
        } catch (err) {
          showError('Error', err?.message || 'Failed to remove. Try again.');
        } finally {
          setRemoving(null);
        }
      }},
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="heart-outline" size={56} color="#d1d5db" />
        <Text style={styles.guestTitle}>Sign in to save salons</Text>
        <Text style={styles.guestText}>Keep track of your favourite salons in one place</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const photo    = item.photos?.[0] || item.coverPhoto || item.ownerPhoto;
    const rating   = item.rating || item.averageRating || 0;
    const reviews  = item.reviewCount || item.totalReviews || 0;
    const isRemoving = removing === item._id;
    const openStatus = isOpenNow(item.workingHours);
    const todayHours = getTodayHours(item.workingHours);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SalonDetails', { salonId: item._id })}
        activeOpacity={0.92}
      >
        {/* Image */}
        <View style={styles.imgWrapper}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.img} />
          ) : (
            <View style={[styles.img, styles.imgPlaceholder]}>
              <Ionicons name="cut" size={32} color="#93c5fd" />
            </View>
          )}
          {/* Remove button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => handleRemove(item._id, item.name)}
            disabled={isRemoving}
          >
            {isRemoving
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Ionicons name="heart" size={18} color="#ef4444" />}
          </TouchableOpacity>
          {item.ownerPhoto && (
            <View style={styles.ownerAvatarBadge}>
              <Image source={{ uri: item.ownerPhoto }} style={styles.ownerAvatarImg} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardCategory}>{(item.category || '').replace('_', ' ')}</Text>

          {/* Stars left — Open/Closed right */}
          {rating > 0 && (
            <View style={styles.cardRowSpread}>
              <View style={styles.cardRow}>
                <StarRating rating={rating} />
                <Text style={styles.cardRating}>{rating.toFixed(1)}</Text>
                {reviews > 0 && <Text style={styles.cardReviews}>({reviews})</Text>}
              </View>
              {openStatus !== null && (
                <View style={[styles.openPill, { backgroundColor: openStatus ? '#dcfce7' : '#fee2e2' }]}>
                  <View style={[styles.openDot, { backgroundColor: openStatus ? '#16a34a' : '#dc2626' }]} />
                  <Text style={[styles.openPillText, { color: openStatus ? '#16a34a' : '#dc2626' }]}>
                    {openStatus ? 'Open' : 'Closed'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Address left — Hours right */}
          <View style={styles.cardRowSpread}>
            <View style={[styles.cardRow, { flex: 1, marginRight: 8 }]}>
              <Ionicons name="location-outline" size={13} color={theme.subText} />
              <Text style={styles.cardAddress} numberOfLines={1}>
                {item.address || [item.city, item.state].filter(Boolean).join(', ') || 'Address not listed'}
              </Text>
            </View>
            {todayHours && (
              <View style={styles.cardRow}>
                <Ionicons name="time-outline" size={12} color={theme.subText} />
                <Text style={styles.cardHours}>{todayHours}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.viewDetails}>Book Now</Text>
              <Ionicons name="arrow-forward" size={13} color={theme.accent} />
            </View>
            {item.isApproved && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Saved Salons</Text>
            <Text style={styles.headerSub}>{salons.length} salon{salons.length !== 1 ? 's' : ''} saved</Text>
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

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : salons.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={52} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No saved salons yet</Text>
          <Text style={styles.emptyText}>Tap the heart icon on any salon to save it here</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('HomeTab')}>
            <Text style={styles.exploreBtnText}>Explore Salons</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          data={salons}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        />
      )}
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginTop: 16 },
  guestText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  signInBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: t.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: t.border },
  imgWrapper: { position: 'relative' },
  ownerAvatarBadge: { position: 'absolute', bottom: -16, left: 12, width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: t.card, overflow: 'hidden', elevation: 3 },
  ownerAvatarImg: { width: '100%', height: '100%' },
  img: { width: '100%', height: 150 },
  imgPlaceholder: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  cardRowSpread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openPillText: { fontSize: 11, fontWeight: '700' },
  heartBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardBody: { padding: 12, paddingTop: 22, gap: 5 },
  cardName: { fontSize: 16, fontWeight: '700', color: t.text },
  cardCategory: { fontSize: 12, color: t.subText, textTransform: 'capitalize' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRating: { fontSize: 12, fontWeight: '700', color: t.text },
  cardReviews: { fontSize: 12, color: t.subText },
  cardAddress: { fontSize: 12, color: t.subText, flex: 1 },
  cardHours: { fontSize: 11, color: t.subText },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.border },
  viewDetails: { fontSize: 12, fontWeight: '700', color: t.accent },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#16a34a' },
});
