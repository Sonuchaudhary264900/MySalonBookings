import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, RefreshControl,
  ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const CATEGORY_KEYS = [
  { key: 'all',                  label: 'All',              emoji: '🏠' },
  { key: 'Hair Services',        label: 'Hair Services',    emoji: '✂️' },
  { key: 'Beard & Grooming',     label: 'Beard & Grooming', emoji: '🧔' },
  { key: 'Nail Services',        label: 'Nail Services',    emoji: '💅' },
  { key: 'Skin & Face / Beauty', label: 'Skin',             emoji: '🧖' },
  { key: 'Spa & Massage',        label: 'Spa & Massage',    emoji: '💆' },
  { key: 'Body Grooming',        label: 'Body Grooming',    emoji: '🧴' },
  { key: 'Bridal & Events',      label: 'Bridal & Events',  emoji: '👰' },
  { key: 'Kids Services',        label: 'Kids',             emoji: '👶' },
  { key: 'At-Home Services',     label: 'At-Home',          emoji: '🏡' },
];

const CATEGORY_ALIASES = {
  'Hair Services':        ['Hair Services', 'Hair Services (Men)', 'Hair Services (Women)'],
  'Skin & Face / Beauty': ['Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty'],
  'Spa & Massage':        ['Spa & Massage', 'Spa & Relaxation'],
};

const MALE_ONLY_CHIPS   = ['Beard & Grooming', 'Body Grooming'];
const FEMALE_ONLY_CHIPS = ['Bridal & Events'];

const SORT_KEYS = [
  { key: 'nearby',  labelKey: 'sortNearest',    icon: 'location-outline' },
  { key: 'booked',  labelKey: 'sortMostBooked', icon: 'trending-up-outline' },
  { key: 'rated',   labelKey: 'sortTopRated',   icon: 'star-outline' },
];

const GENDER_FILTERS = [
  { key: 'all',    label: 'All',    emoji: '👥' },
  { key: 'male',   label: 'Men',    emoji: '👨' },
  { key: 'female', label: 'Women',  emoji: '👩' },
  { key: 'unisex', label: 'Unisex', emoji: '🏠' },
];

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={11} color="#f59e0b" />
      ))}
    </View>
  );
}

const SalonCard = memo(function SalonCard({ salon, onPress, distance, isFavorited, onToggleFavorite }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [toggling, setToggling] = React.useState(false);
  const photo = salon.photos?.[0] || salon.coverPhoto || salon.ownerPhoto;
  const rating = salon.rating || salon.averageRating || 0;
  const reviewCount = salon.reviewCount || salon.totalReviews || 0;
  const category = (salon.category || 'salon').replace('_', ' ');
  const openStatus = isOpenNow(salon.workingHours);
  const todayHours = getTodayHours(salon.workingHours);

  const handleHeart = async (e) => {
    if (toggling) return;
    setToggling(true);
    try {
      await api.post(`/customer/favorites/${salon._id}`);
      onToggleFavorite?.(salon._id, !isFavorited);
    } catch {
      Alert.alert('Error', 'Could not update favourites. Try again.');
    } finally {
      setToggling(false);
    }
  };

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
        {/* Heart / Favourite button */}
        <TouchableOpacity style={styles.heartBtn} onPress={handleHeart} disabled={toggling}>
          {toggling
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={18} color={isFavorited ? '#ef4444' : '#64748b'} />}
        </TouchableOpacity>
        {salon.ownerPhoto && (
          <View style={styles.ownerAvatarBadge}>
            <Image source={{ uri: salon.ownerPhoto }} style={styles.ownerAvatarImg} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{salon.name}</Text>

        {/* Stars left — Open/Closed right */}
        <View style={styles.cardRowSpread}>
          <View style={styles.cardRow}>
            <StarRating rating={rating} />
            <Text style={styles.cardRating}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
            {reviewCount > 0 && <Text style={styles.cardReviews}>({reviewCount})</Text>}
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

        {/* Address left — Hours right */}
        <View style={styles.cardRowSpread}>
          <View style={[styles.cardRow, { flex: 1, marginRight: 8 }]}>
            <Ionicons name="location-outline" size={13} color={theme.subText} />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {salon.address || [salon.city, salon.state].filter(Boolean).join(', ') || 'Address not available'}
            </Text>
          </View>
          {todayHours && (
            <View style={styles.cardRow}>
              <Ionicons name="time-outline" size={12} color={theme.subText} />
              <Text style={styles.cardHours}>{todayHours}</Text>
            </View>
          )}
        </View>

        {distance != null && (
          <View style={styles.cardRow}>
            <Ionicons name="navigate-outline" size={13} color={theme.accent} />
            <Text style={styles.cardDistance}>
              {distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.viewDetails}>Book Now</Text>
              <Ionicons name="arrow-forward" size={13} color={theme.accent} />
            </View>
          {salon.isApproved && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

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
  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(theme);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const [salons, setSalons]           = useState([]);
  const [allSalons, setAllSalons]     = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [genderFilter, setGenderFilter] = useState('all');
  const [sort, setSort]               = useState('nearby');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchText, setSearchText]   = useState('');
  const [searching, setSearching]     = useState(false);
  const [userCoords, setUserCoords]   = useState(null);
  const [locDenied, setLocDenied]     = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const searchTimer                   = useRef(null);

  // Auto-set gender filter from user profile (runs once when user loads)
  const genderInitialized = useRef(false);
  useEffect(() => {
    if (!genderInitialized.current && user?.gender && (user.gender === 'male' || user.gender === 'female')) {
      setGenderFilter(user.gender);
      genderInitialized.current = true;
    }
  }, [user]);

  // Get location and favorites on mount
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
    // Load favourite IDs in background
    api.get('/customer/favorites').then(res => {
      const data = res.data.data?.salons || res.data.data || [];
      setFavoriteIds(new Set(data.map(s => s._id)));
    }).catch(() => {});
  }, []);

  const applyFilters = (data, cats, gender) => {
    let result = data;
    if (cats.length > 0) {
      result = result.filter(s =>
        cats.some(cat => {
          const aliases = CATEGORY_ALIASES[cat] || [cat];
          return (s.offeredCategoryNames || []).some(n => aliases.includes(n));
        })
      );
    }
    if (gender === 'unisex') {
      result = result.filter(s => (s.servedGender || 'unisex') === 'unisex');
    } else if (gender !== 'all') {
      result = result.filter(s => {
        const sg = s.servedGender || 'unisex';
        return sg === gender || sg === 'unisex';
      });
    }
    return result;
  };

  const fetchSalons = async (sortKey, coords, cats, gender) => {
    if (!coords) return;
    setLoading(true);
    setSearchText('');
    try {
      const res = await api.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(applyFilters(data, cats ?? selectedCats, gender ?? genderFilter));
    } catch {
      setAllSalons([]);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSort(key);
    setSelectedCats([]);
    setGenderFilter('all');
    fetchSalons(key, userCoords, [], 'all');
  };

  const handleGenderFilter = (gender) => {
    const newCats = selectedCats.filter(k => {
      if (gender === 'female' && MALE_ONLY_CHIPS.includes(k))   return false;
      if (gender === 'male'   && FEMALE_ONLY_CHIPS.includes(k)) return false;
      return true;
    });
    setSelectedCats(newCats);
    setGenderFilter(gender);
    if (searchText.trim()) {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => runSearch(searchText, newCats, userCoords, gender), 0);
    } else {
      setSalons(applyFilters(allSalons, newCats, gender));
    }
  };

  const sortByNearest = useCallback((list, coords) => {
    if (!coords) return list;
    return [...list].sort((a, b) => {
      const da = a.location?.coordinates
        ? haversineKm(coords.lat, coords.lng, a.location.coordinates[1], a.location.coordinates[0])
        : 9999;
      const db = b.location?.coordinates
        ? haversineKm(coords.lat, coords.lng, b.location.coordinates[1], b.location.coordinates[0])
        : 9999;
      return da - db;
    });
  }, []);

  const runSearch = useCallback(async (text, cats, coords, gender) => {
    if (!text.trim()) return;
    setSearching(true);
    const activeCats   = cats   ?? selectedCats;
    const activeGender = gender ?? genderFilter;
    try {
      const params = new URLSearchParams({ q: text.trim(), limit: '50' });
      if (coords) { params.append('latitude', coords.lat); params.append('longitude', coords.lng); }

      const [salonRes, serviceRes] = await Promise.allSettled([
        api.get(`/public/salons?${params.toString()}`),
        api.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`),
      ]);

      const salonData   = salonRes.status   === 'fulfilled' ? (salonRes.value.data.data?.salons   || []) : [];
      const serviceData = serviceRes.status === 'fulfilled' ? (serviceRes.value.data.data?.salons || []) : [];

      const seen = new Set();
      const merged = [];
      for (const s of [...salonData, ...serviceData]) {
        const id = s._id?.toString();
        if (id && !seen.has(id)) { seen.add(id); merged.push(s); }
      }

      setSalons(sortByNearest(applyFilters(merged, activeCats, activeGender), coords));
    } catch {
      const q = text.toLowerCase();
      const localResults = allSalons.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
      setSalons(sortByNearest(applyFilters(localResults, activeCats, activeGender), coords));
    } finally {
      setSearching(false);
    }
  }, [allSalons, sortByNearest, genderFilter, selectedCats]);

  const handleCategory = (cat) => {
    let newCats;
    if (cat === 'all') {
      newCats = [];
    } else {
      newCats = selectedCats.includes(cat)
        ? selectedCats.filter(c => c !== cat)
        : [...selectedCats, cat];
    }
    setSelectedCats(newCats);
    if (searchText.trim()) {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => runSearch(searchText, newCats, userCoords, genderFilter), 0);
    } else {
      setSalons(applyFilters(allSalons, newCats, genderFilter));
    }
  };

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setSalons(applyFilters(allSalons, selectedCats, genderFilter));
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(text, selectedCats, userCoords, genderFilter), 400);
  }, [allSalons, selectedCats, genderFilter, userCoords, runSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalons(sort, userCoords).catch(() => {});
    setRefreshing(false);
  };

  const getDistance = useCallback((salon) => {
    if (!userCoords || !salon.location?.coordinates) return null;
    const [lng, lat] = salon.location.coordinates;
    return haversineKm(userCoords.lat, userCoords.lng, lat, lng);
  }, [userCoords]);

  const handleToggleFavorite = useCallback((salonId, nowFavorited) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (nowFavorited) next.add(salonId); else next.delete(salonId);
      return next;
    });
  }, []);

  const renderItem = useCallback(({ item }) => (
    <SalonCard
      salon={item}
      distance={getDistance(item)}
      onPress={() => navigation.navigate('SalonDetails', { salonId: item._id })}
      isFavorited={favoriteIds.has(item._id)}
      onToggleFavorite={handleToggleFavorite}
    />
  ), [getDistance, navigation, favoriteIds, handleToggleFavorite]);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('homeTitle')}</Text>
            <Text style={styles.headerSub}>
              {locDenied ? t('homeSubLocDenied') : t('homeSubNearby')}
            </Text>
          </View>
          {/* Theme toggle */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={toggleTheme}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.subText} />
          </TouchableOpacity>
          {/* Notification bell */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('Notifications')}
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

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
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
        <FlatList
          data={loading ? [1,2,3,4] : salons}
          keyExtractor={(item) => loading ? String(item) : item._id}
          renderItem={loading ? () => <SkeletonCard /> : renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingTop: 0 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={!loading ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} /> : undefined}
          ListHeaderComponent={
            <View>
              {/* Category chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chips}
                contentContainerStyle={styles.chipsContent}
                nestedScrollEnabled={true}
              >
                {CATEGORY_KEYS.filter(({ key }) => {
                  if (key === 'all') return true;
                  if (genderFilter === 'female' && MALE_ONLY_CHIPS.includes(key))   return false;
                  if (genderFilter === 'male'   && FEMALE_ONLY_CHIPS.includes(key)) return false;
                  return true;
                }).map((c) => {
                  const active = c.key === 'all' ? selectedCats.length === 0 : selectedCats.includes(c.key);
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => handleCategory(c.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>


              {/* Gender filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0, marginBottom: 4 }}
                contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingRight: 24 }}
                nestedScrollEnabled={true}
              >
                {GENDER_FILTERS.map(({ key, label, emoji }) => {
                  const active = genderFilter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleGenderFilter(key)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 12, paddingVertical: 7,
                        borderRadius: 20, borderWidth: 1.5,
                        backgroundColor: active ? '#e11d48' : styles.chip.backgroundColor,
                        borderColor: active ? '#e11d48' : styles.chip.borderColor,
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 13 }}>{emoji}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : styles.chipText.color }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Location denied notice */}
              {locDenied && !searchText && (
                <View style={styles.noLocBox}>
                  <Ionicons name="location-outline" size={20} color="#d97706" />
                  <Text style={styles.noLocText}>Location access denied. Use search to find salons.</Text>
                </View>
              )}

              {/* Results count + sort picker */}
              {!loading && salons.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 4 }}>
                  <Text style={styles.resultsCount}>
                    {salons.length} salon{salons.length !== 1 ? 's' : ''} {searchText ? 'found' : 'nearby'}
                  </Text>
                  {!searchText && userCoords && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {SORT_KEYS.map(s => (
                        <TouchableOpacity
                          key={s.key}
                          onPress={() => handleSort(s.key)}
                          style={{
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                            backgroundColor: sort === s.key ? '#4f46e5' : 'transparent',
                            borderWidth: 1,
                            borderColor: sort === s.key ? '#4f46e5' : theme.border,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: sort === s.key ? '#fff' : theme.subText }}>
                            {s.key === 'nearby' ? '📍' : s.key === 'booked' ? '🔥' : '⭐'} {t(s.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No salons found</Text>
              <Text style={styles.emptyText}>
                {searchText ? 'Try a different search term' : 'No salons available in your area yet'}
              </Text>
            </View>
          ) : null}
        />
      </View>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: t.card, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: t.text },
  headerSub: { fontSize: 12, color: t.subText, marginTop: 2 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: t.card },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 12, paddingHorizontal: 12, height: 46, gap: 8, borderWidth: 1, borderColor: t.border },
  searchInput: { flex: 1, fontSize: 14, color: t.text },
  body: { flex: 1, backgroundColor: t.bg },
  chips: { flexGrow: 0, flexShrink: 0, paddingVertical: 10 },
  chipsContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingRight: 24 },
  chip: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, marginRight: 8, flexShrink: 0 },
  chipActive: { backgroundColor: t.accent, borderColor: t.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: t.subText },
  chipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  sortBtn: { flex: 1, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
  sortBtnActive: { backgroundColor: t.card, borderColor: t.accent },
  sortText: { fontSize: 11, fontWeight: '600', color: t.subText },
  sortTextActive: { color: t.accent, fontWeight: '700' },
  noLocBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fde68a' },
  noLocText: { fontSize: 13, color: '#92400e', flex: 1 },
  resultsCount: { fontSize: 12, color: t.subText },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: t.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: t.border },
  cardImgWrapper: { position: 'relative' },
  ownerAvatarBadge: { position: 'absolute', bottom: -16, left: 12, width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: t.card, overflow: 'hidden', elevation: 3 },
  ownerAvatarImg: { width: '100%', height: '100%' },
  cardImg: { width: '100%', height: 160 },
  cardImgPlaceholder: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  heartBtn: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  categoryBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  cardBody: { padding: 12, paddingTop: 22, gap: 5 },
  cardName: { fontSize: 16, fontWeight: '700', color: t.text },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRating: { fontSize: 12, fontWeight: '700', color: t.text },
  cardReviews: { fontSize: 12, color: t.subText },
  cardAddress: { fontSize: 12, color: t.subText, flex: 1 },
  cardDistance: { fontSize: 12, color: t.accent, fontWeight: '600' },
  cardHours: { fontSize: 11, color: t.subText },
  cardRowSpread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openPillText: { fontSize: 11, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.border },
  viewDetails: { fontSize: 12, fontWeight: '700', color: t.accent },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#16a34a' },
});
