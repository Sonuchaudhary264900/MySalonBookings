import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, RefreshControl,
  ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES = [
  { key: 'all',        label: 'All',        icon: 'storefront-outline' },
  { key: 'barber',     label: 'Barber',     icon: 'cut-outline' },
  { key: 'hair_salon', label: 'Hair Salon', icon: 'color-wand-outline' },
  { key: 'spa',        label: 'Spa',        icon: 'leaf-outline' },
  { key: 'massage',    label: 'Massage',    icon: 'body-outline' },
  { key: 'other',      label: 'Other',      icon: 'ellipsis-horizontal-outline' },
];

const SORTS = [
  { key: 'nearby',  label: 'Nearest',      icon: 'location-outline' },
  { key: 'booked',  label: 'Most Booked',  icon: 'trending-up-outline' },
  { key: 'rated',   label: 'Top Rated',    icon: 'star-outline' },
];

function StarRating({ rating }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={11} color="#f59e0b" />
      ))}
    </View>
  );
}

function SalonCard({ salon, onPress, distance }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const photo = salon.photos?.[0] || salon.coverPhoto;
  const rating = salon.rating || salon.averageRating || 0;
  const reviewCount = salon.reviewCount || salon.totalReviews || 0;
  const category = (salon.category || 'salon').replace('_', ' ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Photo */}
      <View style={styles.cardImgWrapper}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Ionicons name="cut" size={36} color="#93c5fd" />
          </View>
        )}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{category}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{salon.name}</Text>

        <View style={styles.cardRow}>
          <StarRating rating={rating} />
          <Text style={styles.cardRating}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
          {reviewCount > 0 && <Text style={styles.cardReviews}>({reviewCount})</Text>}
        </View>

        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={13} color="#6b7280" />
          <Text style={styles.cardAddress} numberOfLines={1}>
            {salon.address || [salon.city, salon.state].filter(Boolean).join(', ') || 'Address not available'}
          </Text>
        </View>

        {distance != null && (
          <View style={styles.cardRow}>
            <Ionicons name="navigate-outline" size={13} color="#2563eb" />
            <Text style={styles.cardDistance}>
              {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={[styles.card, { overflow: 'hidden' }]}>
      <View style={[styles.cardImg, { backgroundColor: theme.border }]} />
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ height: 14, backgroundColor: theme.border, borderRadius: 6, width: '70%' }} />
        <View style={{ height: 11, backgroundColor: theme.border, borderRadius: 6, width: '50%' }} />
        <View style={{ height: 11, backgroundColor: theme.border, borderRadius: 6, width: '60%' }} />
      </View>
    </View>
  );
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { unreadCount } = useNotifications();
  const [salons, setSalons]           = useState([]);
  const [allSalons, setAllSalons]     = useState([]);
  const [category, setCategory]       = useState('all');
  const [sort, setSort]               = useState('nearby');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchText, setSearchText]   = useState('');
  const [searching, setSearching]     = useState(false);
  const [userCoords, setUserCoords]   = useState(null);
  const [locDenied, setLocDenied]     = useState(false);
  const searchTimer                   = useRef(null);

  // Get location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocDenied(true); setLoading(false); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserCoords(coords);
        fetchSalons('nearby', coords);
      } catch {
        setLocDenied(true);
        setLoading(false);
      }
    })();
  }, []);

  const fetchSalons = async (sortKey, coords) => {
    if (!coords) return;
    setLoading(true);
    setSearchText('');
    try {
      const res = await api.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(category === 'all' ? data : data.filter(s => s.category === category));
    } catch {
      setAllSalons([]);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSort(key);
    setCategory('all');
    fetchSalons(key, userCoords);
  };

  const handleCategory = (cat) => {
    setCategory(cat);
    setSalons(cat === 'all' ? allSalons : allSalons.filter(s => s.category === cat));
  };

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setSalons(category === 'all' ? allSalons : allSalons.filter(s => s.category === category));
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/public/salons/search?q=${encodeURIComponent(text.trim())}`);
        const data = res.data.data?.salons || res.data.data || [];
        setSalons(data);
      } catch {
        // fallback to local filter
        const q = text.toLowerCase();
        setSalons(allSalons.filter(s =>
          s.name?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q)
        ));
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [allSalons, category]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalons(sort, userCoords).catch(() => {});
    setRefreshing(false);
  };

  const getDistance = (salon) => {
    if (!userCoords || !salon.location?.coordinates) return null;
    const [lng, lat] = salon.location.coordinates;
    return haversineKm(userCoords.lat, userCoords.lng, lat, lng);
  };

  const renderItem = ({ item }) => (
    <SalonCard
      salon={item}
      distance={getDistance(item)}
      onPress={() => navigation.navigate('SalonDetails', { salonId: item._id })}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Salon Bookings</Text>
            <Text style={styles.headerSub}>
              {locDenied ? 'Enable location for nearby salons' : 'Find salons near you'}
            </Text>
          </View>
          {/* Notification bell */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Hamburger */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.getParent('DrawerNav')?.openDrawer()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search salons, services..."
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {(searching || (searchText.length > 0)) && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              {searching
                ? <ActivityIndicator size="small" color="#6b7280" />
                : <Ionicons name="close-circle" size={18} color="#9ca3af" />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => handleCategory(c.key)}
            >
              <Ionicons name={c.icon} size={14} color={category === c.key ? '#fff' : '#4b5563'} />
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort bar */}
        {!searchText && (
          <View style={styles.sortRow}>
            {SORTS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortBtn, sort === s.key && styles.sortBtnActive]}
                onPress={() => handleSort(s.key)}
                disabled={!userCoords}
              >
                <Ionicons name={s.icon} size={13} color={sort === s.key ? '#2563eb' : '#6b7280'} />
                <Text style={[styles.sortText, sort === s.key && styles.sortTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Location denied notice */}
        {locDenied && !searchText && (
          <View style={styles.noLocBox}>
            <Ionicons name="location-outline" size={20} color="#d97706" />
            <Text style={styles.noLocText}>Location access denied. Use search to find salons.</Text>
          </View>
        )}

        {/* Results count */}
        {!loading && salons.length > 0 && (
          <Text style={styles.resultsCount}>
            {salons.length} salon{salons.length !== 1 ? 's' : ''} {searchText ? 'found' : 'nearby'}
          </Text>
        )}

        {/* Salon list */}
        {loading ? (
          <FlatList
            data={[1,2,3,4]}
            keyExtractor={(i) => String(i)}
            renderItem={() => <SkeletonCard />}
            contentContainerStyle={{ padding: 16, gap: 12 }}
          />
        ) : salons.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No salons found</Text>
            <Text style={styles.emptyText}>
              {searchText ? 'Try a different search term' : 'No salons available in your area yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={salons}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          />
        )}
      </View>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563eb' },
  header: { paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -30 },
  decorCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: -20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#bfdbfe', marginTop: 2 },
  menuBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#2563eb' },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderRadius: 12, paddingHorizontal: 12, height: 46, gap: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  searchInput: { flex: 1, fontSize: 14, color: t.text },
  body: { flex: 1, backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  chips: { paddingVertical: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: t.border, borderWidth: 1.5, borderColor: t.border },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '600', color: t.subText },
  chipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  sortBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 8, backgroundColor: t.border, borderWidth: 1, borderColor: t.border },
  sortBtnActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  sortText: { fontSize: 11, fontWeight: '600', color: t.subText },
  sortTextActive: { color: '#2563eb' },
  noLocBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fde68a' },
  noLocText: { fontSize: 13, color: '#92400e', flex: 1 },
  resultsCount: { fontSize: 12, color: t.subText, paddingHorizontal: 16, marginBottom: 4 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: t.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: t.border },
  cardImgWrapper: { position: 'relative' },
  cardImg: { width: '100%', height: 160 },
  cardImgPlaceholder: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  categoryBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  cardBody: { padding: 12, gap: 5 },
  cardName: { fontSize: 16, fontWeight: '700', color: t.text },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRating: { fontSize: 12, fontWeight: '700', color: t.text },
  cardReviews: { fontSize: 12, color: t.subText },
  cardAddress: { fontSize: 12, color: t.subText, flex: 1 },
  cardDistance: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
});
