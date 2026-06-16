import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, RefreshControl,
  ScrollView, Alert, Animated, Linking
} from 'react-native';
import AppText from '../../components/AppText';
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
  'Spa & Massage':        ['Spa & Massage', 'Spa & Relaxation']
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

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

function getOpensAt(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open) return null;
  return h.open;
}

// Returns the next available slot label derived from working hours.
// Approximation: assumes 30-min slots, ignores existing bookings (accurate for card-level display).
function getNextSlot(workingHours, intervalMins = 30) {
  if (!workingHours) return null;
  const now    = new Date();
  const nowDay = now.getDay();
  const nowM   = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < 7; i++) {
    const dayIdx = (nowDay + i) % 7;
    const h = workingHours[DAYS[dayIdx]];
    if (!h || h.isClosed || !h.open || !h.close) continue;

    const [oh, om] = h.open.split(':').map(Number);
    const [ch, cm] = h.close.split(':').map(Number);
    const openM  = oh * 60 + om;
    const closeM = ch * 60 + cm;

    let slotM;
    if (i === 0) {
      if (nowM >= closeM) continue;
      if (nowM <= openM) {
        slotM = openM;
      } else {
        const elapsed = Math.ceil((nowM - openM) / intervalMins);
        slotM = openM + elapsed * intervalMins;
        if (slotM >= closeM) continue;
      }
    } else {
      slotM = openM;
    }

    const hh    = String(Math.floor(slotM / 60)).padStart(2, '0');
    const mm    = String(slotM % 60).padStart(2, '0');
    const label = `${hh}:${mm}`;
    if (i === 0) return label;
    if (i === 1) return `Tomorrow ${label}`;
    const dayName = DAYS[dayIdx].charAt(0).toUpperCase() + DAYS[dayIdx].slice(1, 3);
    return `${dayName} ${label}`;
  }
  return null;
}

const SalonCard = memo(function SalonCard({ salon, onPress, distance, isFavorited, onToggleFavorite }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [toggling, setToggling] = React.useState(false);
  const [pressed, setPressed]   = React.useState(false);
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const photo         = salon.photos?.[0] || salon.coverPhoto;
  const rating        = salon.rating || salon.averageRating || 0;
  const reviewCount   = salon.reviewCount || salon.totalReviews || 0;
  const totalBookings = salon.totalBookings || 0;
  const category      = (salon.category || 'salon').replace(/_/g, ' ').replace(/\bbarber\b/i, 'Salon');
  const openStatus    = isOpenNow(salon.workingHours);
  const todayHours    = getTodayHours(salon.workingHours);
  const opensAt       = getOpensAt(salon.workingHours);
  const nextSlot      = getNextSlot(salon.workingHours);
  const isTopRated    = rating >= 4.5 && reviewCount >= 10;
  const isTrending    = !isTopRated && totalBookings >= 50;

  const offerLabel = salon.topOffer
    ? salon.topOffer.discountType === 'percentage'
      ? `${salon.topOffer.discountValue}% OFF${salon.topOffer.minAmount > 0 ? ` on ₹${salon.topOffer.minAmount}+` : ''}`
      : `₹${salon.topOffer.discountValue} OFF${salon.topOffer.minAmount > 0 ? ` on ₹${salon.topOffer.minAmount}+` : ''}`
    : null;

  const animateHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.5, useNativeDriver: true, tension: 280, friction: 4 }),
      Animated.spring(heartScale, { toValue: 1,   useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
  };

  const handleHeart = async () => {
    if (toggling) return;
    animateHeart();
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
    <TouchableOpacity
      style={[styles.card, pressed && { transform: [{ scale: 0.985 }], shadowOpacity: 0.03 }]}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={1}
    >
      {/* ── Image ── */}
      <View style={styles.cardImgWrapper}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Ionicons name="cut" size={40} color="#93c5fd" />
          </View>
        )}


        {/* Top-left: category + verified + trust badge */}
        <View style={styles.topLeftBadges}>
          {category.toLowerCase() !== 'salon' && (
            <View style={styles.categoryBadge}>
              <AppText style={styles.categoryBadgeText}>{category}</AppText>
            </View>
          )}
          {salon.isApproved && (
            <View style={styles.verifiedImgBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#fff" />
              <AppText style={styles.verifiedImgText}>Verified</AppText>
            </View>
          )}
          {isTopRated && (
            <View style={styles.topRatedBadge}>
              <AppText style={styles.topRatedText}>🏆 Top Rated</AppText>
            </View>
          )}
          {isTrending && (
            <View style={styles.trendingBadge}>
              <AppText style={styles.trendingText}>🔥 Trending</AppText>
            </View>
          )}
        </View>

        {/* Top-right: Heart */}
        <TouchableOpacity
          style={[styles.heartBtn, isFavorited && styles.heartBtnActive]}
          onPress={handleHeart}
          disabled={toggling}
        >
          {toggling
            ? <ActivityIndicator size="small" color="#ef4444" />
            : (
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={18} color={isFavorited ? '#fff' : '#94a3b8'} />
              </Animated.View>
            )}
        </TouchableOpacity>

        {/* Bottom image row: open pill (left) + rating + distance (right) */}
        <View style={styles.imgBottomRow}>
          <View>
            {openStatus !== null && (
              <View style={[styles.openPillImg, { backgroundColor: openStatus ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)' }]}>
                <View style={styles.openDotImg} />
                <AppText style={styles.openPillImgText}>
                  {openStatus ? 'Open Now' : opensAt ? `Opens ${opensAt}` : 'Closed'}
                </AppText>
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {rating > 0 && (
              <View style={styles.ratingPillImg}>
                <Ionicons name="star" size={11} color="#f59e0b" />
                <AppText style={styles.ratingPillText}>{rating.toFixed(1)}</AppText>
                {reviewCount > 0 && <AppText style={styles.reviewCountText}>({reviewCount})</AppText>}
              </View>
            )}
            {distance != null && (
              <View style={styles.distancePillImg}>
                <AppText style={styles.distancePillText}>
                  📍 {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.cardBody}>
        {/* Salon name */}
        <AppText style={styles.cardName} numberOfLines={1}>{salon.name}</AppText>

        {/* Stars + rating + review count */}
        <View style={[styles.cardRow, { marginBottom: 6 }]}>
          {[1,2,3,4,5].map(i => (
            <Ionicons
              key={i}
              name={
                rating > 0 && i <= Math.floor(rating) ? 'star' :
                rating > 0 && i === Math.ceil(rating) && rating % 1 >= 0.5 ? 'star-half' :
                'star-outline'
              }
              size={13}
              color={rating > 0 && i <= Math.ceil(rating) ? '#f59e0b' : theme.border}
            />
          ))}
          <AppText style={styles.cardRatingValue}>{rating > 0 ? rating.toFixed(1) : '—'}</AppText>
          <AppText style={styles.cardReviewCount}>
            {reviewCount > 0
              ? `(${reviewCount.toLocaleString()} ${reviewCount === 1 ? 'review' : 'reviews'})`
              : 'No reviews yet'}
          </AppText>
        </View>

        {/* Address + Hours */}
        <View style={[styles.cardRowSpread, { marginBottom: 6 }]}>
          <View style={[styles.cardRow, { flex: 1, marginRight: 8 }]}>
            <Ionicons name="location-outline" size={13} color={theme.subText} />
            <AppText style={styles.cardAddress} numberOfLines={1}>
              {salon.address || [salon.city, salon.state].filter(Boolean).join(', ') || 'Address not available'}
            </AppText>
          </View>
          {todayHours && (
            <View style={styles.cardRow}>
              <Ionicons name="time-outline" size={12} color={theme.subText} />
              <AppText style={styles.cardHours}>{todayHours}</AppText>
            </View>
          )}
        </View>

        {/* Next available slot */}
        {nextSlot && (
          <View style={styles.nextSlotRow}>
            <AppText style={styles.nextSlotText}>⏱ Next slot: {nextSlot}</AppText>
          </View>
        )}

        {/* Social proof + price */}
        {(totalBookings >= 10 || salon.minPrice) && (
          <View style={[styles.cardRowSpread, { marginBottom: 10 }]}>
            {totalBookings >= 10 ? (
              <View style={styles.popularityPill}>
                <AppText style={styles.popularityText}>
                  🔥 {totalBookings >= 1000 ? `${(totalBookings / 1000).toFixed(1)}k` : `${totalBookings}+`} booked
                </AppText>
              </View>
            ) : <View />}
            {salon.minPrice && (
              <AppText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                from ₹{salon.minPrice}
              </AppText>
            )}
          </View>
        )}

        {/* Offer / promo tag */}
        {offerLabel && (
          <View style={styles.offerRow}>
            <AppText style={{ fontSize: 13 }}>🏷️</AppText>
            <AppText style={styles.offerLabel} numberOfLines={1}>{offerLabel}</AppText>
            <View style={styles.offerCodeBadge}>
              <AppText style={styles.offerCodeText}>{salon.topOffer.code}</AppText>
            </View>
          </View>
        )}

        {/* Book Now CTA */}
        <View style={styles.bookBtn}>
          <AppText style={styles.bookBtnText}>Book Now</AppText>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
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
      <View style={{ padding: 14, gap: 9 }}>
        <View style={{ height: 14, backgroundColor: theme.border, borderRadius: 6, width: '70%' }} />
        <View style={{ height: 11, backgroundColor: theme.border, borderRadius: 6, width: '50%' }} />
        <View style={{ height: 11, backgroundColor: theme.border, borderRadius: 6, width: '40%' }} />
        <View style={{ height: 38, backgroundColor: theme.border, borderRadius: 12, width: '100%', marginTop: 4 }} />
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
  const { user, isAuthenticated } = useAuth();
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
  const [serviceMatchLabel, setServiceMatchLabel] = useState('');
  const [openNow, setOpenNow]         = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);
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

  const applyFilters = (data, cats, gender, onlyOpen) => {
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
    if (onlyOpen) {
      result = result.filter(s => isOpenNow(s.workingHours) === true);
    }
    return result;
  };

  const fetchSalons = async (sortKey, coords, cats, gender) => {
    if (!coords) return;
    setLoading(true);
    setSearchText('');
    setServiceMatchLabel('');
    try {
      const res = await api.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(applyFilters(data, cats ?? selectedCats, gender ?? genderFilter, openNow));
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
      setSalons(applyFilters(allSalons, newCats, gender, openNow));
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

      const salonData      = salonRes.status   === 'fulfilled' ? (salonRes.value.data.data?.salons   || []) : [];
      const serviceData    = serviceRes.status === 'fulfilled' ? (serviceRes.value.data.data?.salons || []) : [];
      const matchedService = serviceRes.status === 'fulfilled' ? serviceRes.value.data.data?.matchedService : null;

      const seen = new Set();
      const merged = [];
      for (const s of [...salonData, ...serviceData]) {
        const id = s._id?.toString();
        if (id && !seen.has(id)) { seen.add(id); merged.push(s); }
      }

      if (matchedService && serviceData.length > 0 && salonData.length === 0) {
        setServiceMatchLabel(`Salons offering "${matchedService}"`);
      } else {
        setServiceMatchLabel('');
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
      setSalons(applyFilters(allSalons, newCats, genderFilter, openNow));
    }
  };

  const handleSearch = useCallback((text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setServiceMatchLabel('');
      setSalons(applyFilters(allSalons, selectedCats, genderFilter, openNow));
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(text, selectedCats, userCoords, genderFilter), 400);
  }, [allSalons, selectedCats, genderFilter, userCoords, runSearch]);

  const handleOpenNow = () => {
    const next = !openNow;
    setOpenNow(next);
    setSalons(applyFilters(allSalons, selectedCats, genderFilter, next));
  };

  // Fetch upcoming bookings count for the My Bookings badge
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/customer/bookings').then(res => {
      const arr = res.data.data?.bookings || res.data.data || [];
      setUpcomingCount(Array.isArray(arr) ? arr.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length : 0);
    }).catch(() => {});
  }, [isAuthenticated]);

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

  const isSearchActive = searchText.trim().length > 0;

  const sectionTitle = serviceMatchLabel
    ? serviceMatchLabel
    : isSearchActive
    ? 'Search Results'
    : sort === 'nearby' ? 'Salons Near You'
    : sort === 'rated'  ? 'Top Rated Salons'
    : 'Most Booked Salons';

  const renderItem = useCallback(({ item }) => (
    <SalonCard
      salon={item}
      distance={getDistance(item)}
      onPress={() => navigation.navigate(isAuthenticated ? 'SalonDetails' : 'GuestSalonDetails', { salonId: item._id })}
      isFavorited={favoriteIds.has(item._id)}
      onToggleFavorite={handleToggleFavorite}
    />
  ), [getDistance, navigation, favoriteIds, handleToggleFavorite]);

  // ── Location gate ────────────────────────────────────────────────
  if (locDenied) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <View style={{
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: 'rgba(99,102,241,0.12)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 24
        }}>
          <Ionicons name="location-outline" size={48} color={theme.accent} />
        </View>
        <AppText style={{ fontSize: 22, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 10 }}>
          Location Required
        </AppText>
        <AppText style={{ fontSize: 14, color: theme.subText, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          We need your location to show nearby salons. Please allow location access to continue.
        </AppText>
        <TouchableOpacity
          style={{
            backgroundColor: theme.accent, paddingVertical: 14, paddingHorizontal: 36,
            borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
            shadowColor: theme.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4
          }}
          onPress={async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              setLocDenied(false);
              setLoading(true);
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
              setUserCoords(coords);
              fetchSalons('nearby', coords);
            } else {
              Linking.openSettings();
            }
          }}
        >
          <Ionicons name="location" size={18} color="#fff" />
          <AppText style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Allow Location</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openSettings()} style={{ marginTop: 16 }}>
          <AppText style={{ fontSize: 13, color: theme.subText, textDecorationLine: 'underline' }}>
            Open Settings
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.headerTitle}>
              {getGreeting()},{' '}
              <AppText style={{ color: theme.accent }}>{user?.name || user?.firstName || 'there'}</AppText>
              {' '}👋
            </AppText>
            <AppText style={styles.headerSub}>
              {locDenied ? t('homeSubLocDenied') : 'Where would you like to book today?'}
            </AppText>
          </View>
          {/* Map */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('Map')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="map-outline" size={21} color={theme.subText} />
          </TouchableOpacity>
          {/* Explore */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('Explore')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="compass-outline" size={22} color={theme.subText} />
          </TouchableOpacity>
          {/* Reels */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('Reels')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play-circle-outline" size={22} color={theme.subText} />
          </TouchableOpacity>
          {/* Theme toggle */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={toggleTheme}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.subText} />
          </TouchableOpacity>
          {/* Notification bell — only when logged in */}
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.subText} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <AppText style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          )}

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
                      <AppText style={{ fontSize: 14 }}>{c.emoji}</AppText>
                      <AppText style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>


              {/* Open Now + Clear row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0, marginBottom: 4 }}
                contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingRight: 24, alignItems: 'center' }}
                nestedScrollEnabled={true}
              >
                <TouchableOpacity
                  onPress={handleOpenNow}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 12, paddingVertical: 7,
                    borderRadius: 20, borderWidth: 1.5,
                    backgroundColor: openNow ? 'rgba(16,185,129,0.12)' : styles.chip.backgroundColor,
                    borderColor: openNow ? '#10b981' : styles.chip.borderColor
                  }}
                  activeOpacity={0.75}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: openNow ? '#10b981' : styles.chipText.color }} />
                  <AppText style={{ fontSize: 12, fontWeight: '600', color: openNow ? '#10b981' : styles.chipText.color }}>Open Now</AppText>
                </TouchableOpacity>
                {(openNow || selectedCats.length > 0) && (
                  <TouchableOpacity
                    onPress={() => { setOpenNow(false); setSelectedCats([]); setSalons(applyFilters(allSalons, [], genderFilter, false)); }}
                    style={{ paddingHorizontal: 10, paddingVertical: 7 }}
                  >
                    <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.accent }}>✕ Clear</AppText>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Quick nav shortcuts */}
              {isAuthenticated && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, flexShrink: 0, marginBottom: 8 }}
                  contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingRight: 24 }}
                  nestedScrollEnabled={true}
                >
                  <TouchableOpacity
                    onPress={() => navigation.getParent()?.navigate('BookingsTab')}
                    style={styles.navShortcut}
                  >
                    <AppText style={styles.navShortcutText}>📅 My Bookings</AppText>
                    {upcomingCount > 0 && (
                      <View style={styles.navBadge}>
                        <AppText style={styles.navBadgeText}>{upcomingCount}</AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.getParent()?.navigate('FavoritesTab')}
                    style={styles.navShortcut}
                  >
                    <AppText style={styles.navShortcutText}>❤️ Saved Salons</AppText>
                  </TouchableOpacity>
                </ScrollView>
              )}


              {/* Section title + results count + sort + Show All */}
              {!loading && (
                <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <AppText style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{sectionTitle}</AppText>
                    {isSearchActive && (
                      <TouchableOpacity onPress={() => handleSearch('')}>
                        <AppText style={{ fontSize: 13, color: theme.accent, fontWeight: '600' }}>← Show All</AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText style={styles.resultsCount}>
                      {salons.length} salon{salons.length !== 1 ? 's' : ''} {isSearchActive ? 'found' : 'nearby'}
                    </AppText>
                    {!isSearchActive && userCoords && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {SORT_KEYS.map(s => (
                          <TouchableOpacity
                            key={s.key}
                            onPress={() => handleSort(s.key)}
                            style={{
                              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                              backgroundColor: sort === s.key ? '#4f46e5' : 'transparent',
                              borderWidth: 1,
                              borderColor: sort === s.key ? '#4f46e5' : theme.border
                            }}
                          >
                            <AppText style={{ fontSize: 11, fontWeight: '600', color: sort === s.key ? '#fff' : theme.subText }}>
                              {s.key === 'nearby' ? '📍' : s.key === 'booked' ? '🔥' : '⭐'} {t(s.labelKey)}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <AppText style={styles.emptyTitle}>No salons found</AppText>
              <AppText style={styles.emptyText}>
                {searchText ? 'Try a different search term' : 'No salons available in your area yet'}
              </AppText>
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
  resultsCount: { fontSize: 12, color: t.subText },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  // ── Card ─────────────────────────────────────────────────────────
  card: { backgroundColor: t.card, borderRadius: 20, overflow: 'hidden', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderWidth: 1, borderColor: t.border, marginBottom: 2 },
  cardImgWrapper: { position: 'relative' },
  cardImg: { width: '100%', height: 190 },
  cardImgPlaceholder: { backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },

  imgOverlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.03)' },
  imgOverlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.06)' },

  topLeftBadges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 5, maxWidth: '75%' },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  verifiedImgBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.94)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#10b981', shadowOpacity: 0.7, shadowRadius: 8, elevation: 4 },
  verifiedImgText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  topRatedBadge: { backgroundColor: 'rgba(234,179,8,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  topRatedText: { fontSize: 10, fontWeight: '700', color: '#1a1200' },
  trendingBadge: { backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  trendingText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  heartBtn: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heartBtnActive: { backgroundColor: 'rgba(244,63,94,0.9)', borderColor: 'rgba(244,63,94,0.4)' },

  imgBottomRow: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  openPillImg: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  openDotImg: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  openPillImgText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  ratingPillImg: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.58)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ratingPillText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  reviewCountText: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  distancePillImg: { backgroundColor: 'rgba(0,0,0,0.58)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  distancePillText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  cardBody: { padding: 14, gap: 0 },
  cardName: { fontSize: 16, fontWeight: '800', color: t.text, marginBottom: 4 },
  cardRatingValue: { fontSize: 13, fontWeight: '800', color: t.text, marginLeft: 3 },
  cardReviewCount: { fontSize: 11, color: t.subText },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRowSpread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAddress: { fontSize: 12, color: t.subText, flex: 1 },
  cardHours: { fontSize: 11, color: t.subText },
  cardDistance: { fontSize: 12, color: t.accent, fontWeight: '600' },

  verifiedBar: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.09)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  verifiedBarText: { fontSize: 11, fontWeight: '800', color: '#10b981' },
  verifiedBarSub: { fontSize: 10, color: '#6b7280' },

  popularityPill: { backgroundColor: 'rgba(239,68,68,0.09)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  popularityText: { fontSize: 11, fontWeight: '600', color: '#f87171' },

  nextSlotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(99,102,241,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  nextSlotText: { fontSize: 11, fontWeight: '600', color: '#6366f1' },

  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  offerLabel: { fontSize: 12, fontWeight: '700', color: '#059669', flex: 1 },
  offerCodeBadge: { backgroundColor: 'rgba(5,150,105,0.15)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.25)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  offerCodeText: { fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 0.5 },

  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: '#6366f1', shadowColor: '#6366f1', shadowOpacity: 0.38, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bookBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // ── Nav shortcuts ────────────────────────────────────────────────
  navShortcut: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
  navShortcutText: { fontSize: 12, fontWeight: '600', color: t.text },
  navBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  navBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' }
});
