import { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Linking, Alert, Modal, TextInput, Dimensions
} from 'react-native';
import AppText from '../../components/AppText';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showError, showInfo } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

const BASE_TABS = ['Services', 'Reels', 'Photos', 'Packages', 'Reviews', 'Info'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── Working hours helpers ─────────────────────────────────────────────────────
const WH_DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const isOpenNow = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(':').map(Number); const [ch, cm] = h.close.split(':').map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
};
const getTodayHours = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return null;
  return `${h.open} – ${h.close}`;
};
const getOpensAt = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open) return null;
  return h.open;
};
const getNextSlot = (wh, intervalMins = 30) => {
  if (!wh) return null;
  const now = new Date(); const nowDay = now.getDay(); const nowM = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 7; i++) {
    const h = wh[WH_DAYS[(nowDay + i) % 7]];
    if (!h || h.isClosed || !h.open || !h.close) continue;
    const [oh, om] = h.open.split(':').map(Number); const [ch, cm] = h.close.split(':').map(Number);
    const openM = oh * 60 + om; const closeM = ch * 60 + cm;
    let slotM;
    if (i === 0) {
      if (nowM >= closeM) continue;
      slotM = nowM <= openM ? openM : openM + Math.ceil((nowM - openM) / intervalMins) * intervalMins;
      if (slotM >= closeM) continue;
    } else { slotM = openM; }
    const label = `${String(Math.floor(slotM/60)).padStart(2,'0')}:${String(slotM%60).padStart(2,'0')}`;
    if (i === 0) return label;
    if (i === 1) return `Tomorrow ${label}`;
    return `${WH_DAYS[(nowDay+i)%7].charAt(0).toUpperCase()}${WH_DAYS[(nowDay+i)%7].slice(1,3)} ${label}`;
  }
  return null;
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Booking helpers ──────────────────────────────────────────────────────────
const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = localDate(0);

const addMinutes = (t, m) => {
  const [h, min] = t.split(':').map(Number);
  const total = h * 60 + min + m;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
};

const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const isPastSlot = (date, s) => {
  if (date !== todayStr) return false;
  const now = new Date();
  return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
};

const formatDay = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return { day: names[d.getDay()], date: d.getDate() };
};
// ────────────────────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color="#f59e0b" />
      ))}
    </View>
  );
}

function WorkingHoursRow({ day, hours, styles }) {
  const today = DAY_NAMES[new Date().getDay()];
  const isToday = day.toLowerCase() === today.toLowerCase();
  return (
    <View style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
      <AppText style={[styles.hoursDay, isToday && { color: '#60a5fa', fontWeight: '700' }]}>{day}</AppText>
      {hours?.isClosed ? (
        <AppText style={styles.hoursClosed}>Closed</AppText>
      ) : (
        <AppText style={[styles.hoursTime, isToday && { color: '#60a5fa' }]}>
          {hours?.open || '09:00'} – {hours?.close || '21:00'}
        </AppText>
      )}
    </View>
  );
}

export default function SalonDetailsScreen({ route, navigation }) {
  const { salonId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Salon details state ────────────────────────────────────────────────────
  const [salon, setSalon]                 = useState(null);
  const [services, setServices]           = useState([]);
  const [reviews, setReviews]             = useState([]);
  const [offers, setOffers]               = useState([]);
  const [packages, setPackages]           = useState([]);
  const [tab, setTab]                     = useState('Services');
  const [loading, setLoading]             = useState(true);

  // Package request modal
  const [pkgReqItem, setPkgReqItem]         = useState(null);
  const [pkgNote, setPkgNote]               = useState('');
  const [pkgReqLoading, setPkgReqLoading]   = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [isFavorite, setIsFavorite]       = useState(false);
  const [favLoading, setFavLoading]       = useState(false);
  const [followed, setFollowed]           = useState(false);
  const [reviewFilter, setReviewFilter]   = useState('all');

  const userGender = user?.gender;
  const [serviceGenderFilter, setServiceGenderFilter] = useState(
    userGender === 'male' || userGender === 'female' ? userGender : 'all'
  );
  const [expandedCat, setExpandedCat] = useState(null);

  // ── Booking modal state ───────────────────────────────────────────────────
  const [showBooking, setShowBooking]     = useState(false);
  const [barbers, setBarbers]             = useState([]);
  const [barberId, setBarberId]           = useState('');
  const [bookDate, setBookDate]           = useState(todayStr);
  const [slot, setSlot]                   = useState('');
  const [slots, setSlots]                 = useState([]);
  const [blockedSlots, setBlockedSlots]   = useState([]);
  const [closedDay, setClosedDay]         = useState(false);
  const [bookingMode, setBookingMode]     = useState('sequential');
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [galleryLightbox, setGalleryLightbox] = useState(null); // index into galleryItems
  const galleryVideoRef = useRef(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [couponInput, setCouponInput]     = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError]     = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [slotAlert, setSlotAlert]         = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('confirmed');
  const [bookingDetail, setBookingDetail] = useState(null);

  // ── Computed booking values ───────────────────────────────────────────────
  const totalDuration = selectedServices.reduce((s, x) => s + (x.duration || 0), 0);
  const totalPrice    = selectedServices.reduce((s, x) => s + (x.basePrice || x.price || 0), 0);
  const finalPrice    = Math.max(0, totalPrice - couponDiscount);
  const advanceDays   = salon?.advanceBookingDays ?? 7;
  const dateDays      = Array.from({ length: Math.max(advanceDays + 1, 8) }, (_, i) => localDate(i));

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews(), loadBarbers(), loadOffers(), loadPackages()]).finally(() => setLoading(false));
  }, [salonId]);

  const loadSalon = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}`);
      const data = res.data.data || res.data.salon;
      setSalon(data);
      // Seed offers immediately from topOffer — guarantees something shows even if /offers call fails
      if (data?.topOffer) setOffers(prev => prev.length > 0 ? prev : [data.topOffer]);
    } catch {}
  };

  const loadServices = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/services`);
      setServices(res.data.data?.services || res.data.data || []);
    } catch {}
  };

  const loadReviews = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/reviews`);
      setReviews(res.data.data?.reviews || res.data.data || []);
    } catch {}
  };

  const loadBarbers = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/barbers`).catch(() => ({ data: { data: { barbers: [] } } }));
      setBarbers(res.data.data?.barbers || []);
    } catch {}
  };

  const loadPackages = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/packages`);
      setPackages(res.data.data?.packages || []);
    } catch {}
  };

  const loadOffers = async () => {
    try {
      const res = await api.get(`/public/salons/${salonId}/offers`);
      const list = res.data.data?.offers || [];
      if (list.length > 0) setOffers(list);
    } catch {}
  };

  // ── Slot fetch whenever booking modal is open + date/duration changes ─────
  useEffect(() => {
    if (!showBooking || !totalDuration || !salonId) return;
    setSlot('');
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.get(`/public/salons/${salonId}/booked-slots?date=${bookDate}&duration=${totalDuration}`);
        const data = res.data.data || {};
        setBookingMode(data.bookingMode || 'sequential');
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
        setClosedDay(data.closedDay || false);
        if ((data.bookingMode || 'sequential') === 'sequential' && data.slots?.length === 1) {
          setSlot(data.slots[0]);
        }
      } catch { setSlots([]); } finally { setSlotsLoading(false); }
    };
    fetchSlots();
  }, [bookDate, salonId, totalDuration, showBooking]);

  // ── Service selection ─────────────────────────────────────────────────────
  const toggleService = (svc) => {
    setSelectedServices(prev =>
      prev.find(s => s._id === svc._id)
        ? prev.filter(s => s._id !== svc._id)
        : [...prev, svc]
    );
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) { showInfo('Sign In Required', 'Please sign in to save salons.'); return; }
    setFavLoading(true);
    try {
      await api.post(`/customer/favorites/${salonId}`);
      setIsFavorite(v => !v);
    } catch {} finally { setFavLoading(false); }
  };

  // ── Open booking modal ────────────────────────────────────────────────────
  const handleBookNow = async () => {
    if (!isAuthenticated) {
      if (selectedServices.length > 0) {
        await AsyncStorage.setItem('pendingBooking', JSON.stringify({
          salonId,
          serviceIds: selectedServices.map(s => s._id)
        }));
      }
      Alert.alert('Sign In Required', 'Please sign in to book an appointment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    if (selectedServices.length === 0) {
      showError('Select Services', 'Please select at least one service to continue.');
      return;
    }
    // Reset booking state before opening
    setBookDate(todayStr);
    setSlot('');
    setBarberId('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError('');
    setBookingSuccess(false);
    setBookingDetail(null);
    setShowBooking(true);
  };

  // ── Coupon ────────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await api.post('/customer/coupons/validate', {
        code: couponInput.trim().toUpperCase(),
        salonId,
        totalAmount: totalPrice
      });
      const { coupon, discount } = res.data.data;
      setAppliedCoupon(coupon);
      setCouponDiscount(discount);
    } catch (err) {
      setCouponError(err?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError('');
  };

  // ── Confirm booking ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!slot) { showError('Select Time', 'Please select a time slot to continue.'); return; }
    setBookingLoading(true);
    try {
      const res = await api.post('/customer/bookings', {
        salonId,
        serviceIds: selectedServices.map(s => s._id),
        barberId: barberId || undefined,
        appointmentDate: bookDate,
        appointmentTime: slot,
        paymentMethod: 'cash',
        couponCode: appliedCoupon?.code || undefined
      });
      const booking = res.data.data?.booking || res.data.data;
      setBookingStatus(booking?.status || 'confirmed');
      setBookingDetail(booking);
      setBookingSuccess(true);
    } catch (err) {
      showError('Booking Failed', err?.message || 'Please try again.');
    } finally { setBookingLoading(false); }
  };

  // ── Package request ───────────────────────────────────────────────────────
  const handlePackageRequest = async () => {
    if (!isAuthenticated) { showError('Sign In Required', 'Please sign in to request a package.'); return; }
    if (!pkgReqItem) return;
    setPkgReqLoading(true);
    try {
      await api.post('/customer/package-request', { packageId: pkgReqItem._id, purchaseNote: pkgNote.trim() });
      setPkgReqItem(null); setPkgNote('');
      Alert.alert('Request Sent!', 'The salon owner will confirm your package after receiving payment.');
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to send request');
    } finally { setPkgReqLoading(false); }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const photo = salon?.photos?.[0] || salon?.coverPhoto || salon?.ownerPhoto;
  const rating = salon?.rating || salon?.averageRating || 0;
  const basePhotos = salon?.photos?.length ? salon.photos : [];
  const salonPhotos = salon?.ownerPhoto && !basePhotos.includes(salon.ownerPhoto)
    ? [...basePhotos, salon.ownerPhoto]
    : basePhotos;
  const salonVideos = salon?.videos || [];
  // Combined gallery items: { url, type }
  const galleryItems = [
    ...salonPhotos.map(url => ({ url, type: 'image' })),
    ...salonVideos.map(url => ({ url, type: 'video' })),
  ];
  const TABS = BASE_TABS;
  const activeTab = TABS.includes(tab) ? tab : 'Services';
  const styles = getStyles(theme);

  const openStatus  = isOpenNow(salon?.workingHours);
  const todayHours  = getTodayHours(salon?.workingHours);
  const opensAt     = getOpensAt(salon?.workingHours);
  const nextSlot    = getNextSlot(salon?.workingHours);
  const totalBookings = salon?.totalBookings || 0;


  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.loadingBox, { paddingTop: insets.top }]}>
        <View style={styles.loadingHeader} />
        <View style={{ padding: 20, gap: 12 }}>
          <View style={{ height: 22, backgroundColor: '#e5e7eb', borderRadius: 8, width: '60%' }} />
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 6, width: '40%' }} />
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 6, width: '50%' }} />
        </View>
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!salon) {
    return (
      <View style={[styles.loadingBox, { paddingTop: insets.top + 60, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={52} color="#d1d5db" />
        <AppText style={{ fontSize: 16, color: '#6b7280', marginTop: 12 }}>Salon not found</AppText>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn2}>
          <AppText style={{ color: '#7C3AED', fontWeight: '700' }}>Go Back</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── FIXED OVERLAY: back + fav + verified ── */}
      <View style={{ position: 'absolute', top: insets.top + 20, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {salon?.isApproved && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.45)' }}>
              <Ionicons name="checkmark-circle" size={13} color="#4ade80" />
              <AppText style={{ fontSize: 11, fontWeight: '700', color: '#4ade80' }}>Verified</AppText>
            </View>
          )}
          <TouchableOpacity
            onPress={toggleFavorite} disabled={favLoading}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isFavorite ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isFavorite ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.18)' }}
          >
            {favLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <View style={{ position: 'relative', height: 320 }}>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: '100%', height: 320 }} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', height: 320, backgroundColor: '#312e81', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cut" size={64} color="rgba(255,255,255,0.12)" />
            </View>
          )}

          {/* Bottom content — dark strip behind text only */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 18, paddingBottom: 18, paddingTop: 14 }}>
            {/* Top Rated badge */}
            {rating >= 4.0 && (salon.totalReviews || salon.reviewCount || reviews.length) > 0 && (
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(251,191,36,0.2)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)' }}>
                  <Ionicons name="trophy-outline" size={11} color="#fbbf24" />
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: '#fbbf24' }}>Top Rated in Your Area</AppText>
                </View>
              </View>
            )}
            {/* Name */}
            <AppText style={{ fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4, lineHeight: 32, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }} numberOfLines={2}>{salon.name}</AppText>
            {/* Address */}
            {(salon.address || salon.city) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 }}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
                <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 }} numberOfLines={1}>
                  {salon.address}{salon.city ? `, ${salon.city}` : ''}
                </AppText>
              </View>
            )}
            {/* Rating + services row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' }}>
                  <Ionicons name="star" size={12} color="#fbbf24" />
                  <AppText style={{ fontSize: 13, fontWeight: '700', color: '#fbbf24' }}>{rating.toFixed(1)}</AppText>
                  {(salon.totalReviews || salon.reviewCount || reviews.length) > 0 && (
                    <AppText style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>({salon.totalReviews || salon.reviewCount || reviews.length})</AppText>
                  )}
                </View>
              )}
              {services.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                  <Ionicons name="cut-outline" size={12} color="rgba(255,255,255,0.8)" />
                  <AppText style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>{services.length} Services</AppText>
                </View>
              )}
            </View>
            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <TouchableOpacity
                onPress={() => setShowBooking(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 14, backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.55, shadowRadius: 14, elevation: 8 }}
              >
                <Ionicons name="flash-outline" size={16} color="#fff" />
                <AppText style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Book Your Look ✨</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFollowed(f => !f)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, backgroundColor: followed ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.14)', borderWidth: 1.5, borderColor: followed ? '#7C3AED' : 'rgba(255,255,255,0.25)' }}
              >
                <Ionicons name={followed ? 'heart' : 'heart-outline'} size={16} color={followed ? '#A78BFA' : '#fff'} />
                <AppText style={{ fontSize: 14, fontWeight: '600', color: followed ? '#A78BFA' : '#fff' }}>{followed ? 'Following' : 'Follow'}</AppText>
              </TouchableOpacity>
              {salon.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${salon.phone}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  <Ionicons name="call-outline" size={16} color="#fff" />
                  <AppText style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Call</AppText>
                </TouchableOpacity>
              )}
              {(salon.address || salon.city) && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(salon.address || salon.city || '')}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  <Ionicons name="navigate-outline" size={16} color="#fff" />
                  <AppText style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Directions</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── INFO CHIPS ──────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
          {salon.servedGender && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              backgroundColor: salon.servedGender === 'male' ? 'rgba(59,130,246,0.1)' : salon.servedGender === 'female' ? 'rgba(236,72,153,0.1)' : 'rgba(139,92,246,0.1)',
              borderWidth: 1,
              borderColor: salon.servedGender === 'male' ? 'rgba(59,130,246,0.22)' : salon.servedGender === 'female' ? 'rgba(236,72,153,0.22)' : 'rgba(139,92,246,0.22)'
            }}>
              <AppText style={{ fontSize: 12, fontWeight: '600', color: salon.servedGender === 'male' ? '#60a5fa' : salon.servedGender === 'female' ? '#f472b6' : '#c4b5fd' }}>
                {salon.servedGender === 'male' ? '👨 Men' : salon.servedGender === 'female' ? '👩 Women' : '👥 Unisex'}
              </AppText>
            </View>
          )}
          {salon.ownerGender && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              backgroundColor: salon.ownerGender === 'male' ? 'rgba(59,130,246,0.1)' : salon.ownerGender === 'female' ? 'rgba(236,72,153,0.1)' : 'rgba(148,163,184,0.1)',
              borderWidth: 1,
              borderColor: salon.ownerGender === 'male' ? 'rgba(59,130,246,0.22)' : salon.ownerGender === 'female' ? 'rgba(236,72,153,0.22)' : 'rgba(148,163,184,0.2)'
            }}>
              <AppText style={{ fontSize: 12, fontWeight: '600', color: salon.ownerGender === 'male' ? '#60a5fa' : salon.ownerGender === 'female' ? '#f472b6' : theme.subText }}>
                {salon.ownerGender === 'male' ? '👨 Owner: Male' : salon.ownerGender === 'female' ? '👩 Owner: Female' : '🧑 Owner: Other'}
              </AppText>
            </View>
          )}
          {salon.phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${salon.phone}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.border }}
            >
              <Ionicons name="call-outline" size={12} color={theme.subText} />
              <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.subText }}>{salon.phone}</AppText>
            </TouchableOpacity>
          )}
        </ScrollView>
        {salon.description && (
          <AppText style={{ fontSize: 13, color: theme.subText, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 10 }}>{salon.description}</AppText>
        )}

        {/* Trust strip */}
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.bg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 10 }}>
            {openStatus !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: openStatus ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: openStatus ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: openStatus ? '#10b981' : '#ef4444' }} />
                <AppText style={{ fontSize: 11, fontWeight: '700', color: openStatus ? '#10b981' : '#ef4444' }}>
                  {openStatus ? 'Open Now' : opensAt ? `Opens ${opensAt}` : 'Closed'}
                </AppText>
              </View>
            )}
            {todayHours && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={13} color={theme.subText} />
                <AppText style={{ fontSize: 11, fontWeight: '600', color: theme.subText }}>{todayHours}</AppText>
              </View>
            )}
            {rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={13} color="#f59e0b" />
                <AppText style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>{rating.toFixed(1)} Rating</AppText>
              </View>
            )}
            {(() => {
              const rc = salon.totalReviews || salon.reviewCount || reviews.length;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="people-outline" size={13} color={theme.subText} />
                  <AppText style={{ fontSize: 11, fontWeight: '600', color: theme.subText }}>
                    {rc > 0 ? `${rc} ${rc === 1 ? 'Review' : 'Reviews'}` : 'No reviews yet'}
                  </AppText>
                </View>
              );
            })()}
            {salon.isApproved && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#10b981" />
                <AppText style={{ fontSize: 11, fontWeight: '600', color: '#10b981' }}>Verified</AppText>
              </View>
            )}
            {services.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="cut-outline" size={13} color={theme.subText} />
                <AppText style={{ fontSize: 11, fontWeight: '600', color: theme.subText }}>{services.length} Services</AppText>
              </View>
            )}
            {totalBookings >= 10 && (
              <AppText style={{ fontSize: 11, fontWeight: '600', color: '#f87171' }}>
                🔥 {totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : `${totalBookings}+`} booked
              </AppText>
            )}
          </ScrollView>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 14, marginBottom: 4, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', overflow: 'hidden' }}>
          {[
            { val: totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : totalBookings > 0 ? `${totalBookings}+` : '—', label: 'CUSTOMERS' },
            { val: services.length > 0 ? String(services.length) : '—', label: 'SERVICES' },
            { val: rating > 0 ? `${rating.toFixed(1)}★` : '—', label: 'RATING' },
          ].map(({ val, label }, i) => (
            <View key={label} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(167,139,250,0.15)' }}>
              <AppText style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', lineHeight: 22, marginBottom: 3 }}>{val}</AppText>
              <AppText style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{label}</AppText>
            </View>
          ))}
        </View>

        {/* Quick info row */}
        {(nextSlot || salon.minPrice || salon.kidsHaircut || salon.atHomeServices) && (
          <View style={{ borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.cardAlt }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
              {nextSlot && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.accent }}>⏱ Next slot: {nextSlot}</AppText>
                </View>
              )}
              {salon.minPrice && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.accent }}>💰 From ₹{salon.minPrice}</AppText>
                </View>
              )}
              {salon.kidsHaircut && (
                <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(234,179,8,0.12)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)' }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>👶 Kids Haircut</AppText>
                </View>
              )}
              {salon.atHomeServices && (
                <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>🏠 At-Home Service</AppText>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Offers / promo section — uses /offers API list or falls back to salon.topOffer */}
        {(() => {
          const allOffers = offers.length > 0 ? offers : salon.topOffer ? [salon.topOffer] : [];
          if (allOffers.length === 0) return null;
          return (
          <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AppText style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>🏷️ Offers & Coupons</AppText>
              <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                <AppText style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>{allOffers.length}</AppText>
              </View>
            </View>
            {allOffers.map((offer) => {
              const offerLabel = offer.discountType === 'percentage'
                ? `${offer.discountValue}% OFF${offer.minAmount > 0 ? ` on ₹${offer.minAmount}+` : ''}`
                : `₹${offer.discountValue} OFF${offer.minAmount > 0 ? ` on ₹${offer.minAmount}+` : ''}`;
              const textClr    = offer.isExpiringSoon ? '#d97706' : offer.isLimited ? '#dc2626' : '#059669';
              const borderClr  = offer.isExpiringSoon ? 'rgba(245,158,11,0.35)' : offer.isLimited ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.25)';
              const bgClr      = offer.isExpiringSoon ? 'rgba(245,158,11,0.08)' : offer.isLimited ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.08)';
              const icon       = offer.isExpiringSoon ? '⏰' : offer.isLimited ? '🔥' : '🏷️';
              return (
                <View key={offer.code} style={{ backgroundColor: bgClr, borderWidth: 1, borderColor: borderClr, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <AppText style={{ fontSize: 18 }}>{icon}</AppText>
                    <View style={{ flex: 1 }}>
                      {/* Discount label + badges */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <AppText style={{ fontSize: 13, fontWeight: '700', color: textClr }}>{offerLabel}</AppText>
                        {offer.isExpiringSoon && (
                          <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <AppText style={{ fontSize: 9, fontWeight: '700', color: '#d97706' }}>⏰ EXPIRING SOON</AppText>
                          </View>
                        )}
                        {offer.isLimited && !offer.isExpiringSoon && (
                          <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <AppText style={{ fontSize: 9, fontWeight: '700', color: '#dc2626' }}>⚡ LIMITED</AppText>
                          </View>
                        )}
                      </View>
                      {/* Meta: expiry + remaining */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                        {offer.expiresLabel && (
                          <AppText style={{ fontSize: 10, color: offer.isExpiringSoon ? '#d97706' : theme.subText }}>
                            {offer.daysLeft === 0 ? '🔴' : offer.daysLeft === 1 ? '🟡' : '🟢'} {offer.expiresLabel}
                          </AppText>
                        )}
                        {offer.remaining !== null && (
                          <AppText style={{ fontSize: 10, fontWeight: '600', color: offer.isLimited ? '#dc2626' : theme.subText }}>
                            {offer.remaining <= 5 ? `🔴 Only ${offer.remaining} left!` : offer.remaining <= 10 ? `🟡 Only ${offer.remaining} left` : `${offer.remaining} uses left`}
                          </AppText>
                        )}
                      </View>
                    </View>
                    {/* Code pill / tap to apply */}
                    <TouchableOpacity
                      onPress={() => { setCouponInput(offer.code); if (!showBooking) openBooking(); }}
                      style={{ backgroundColor: `rgba(${offer.isExpiringSoon ? '245,158,11' : offer.isLimited ? '239,68,68' : '5,150,105'},0.15)`, borderWidth: 1, borderColor: borderClr, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}
                    >
                      <AppText style={{ fontSize: 11, fontWeight: '700', color: textClr, letterSpacing: 0.5 }}>{offer.code}</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          );
        })()}

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppText style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</AppText>
                {((t === 'Reviews' && reviews.length > 0) || (t === 'Packages' && packages.length > 0)) && (
                  <View style={[styles.tabBadge, activeTab === t && styles.tabBadgeActive]}>
                    <AppText style={[styles.tabBadgeText, tab === t && { color: '#bfdbfe' }]}>
                      {t === 'Reviews' ? reviews.length : packages.length}
                    </AppText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: selectedServices.length > 0 ? 100 : 32 }}>

          {/* Services Tab */}
          {activeTab === 'Services' && (() => {
            const isUnisex = salon.servedGender === 'unisex';

            const MALE_ONLY_CATS   = ['Beard & Grooming', 'Body Grooming'];
            const FEMALE_ONLY_CATS = ['Bridal & Events'];

            const UNISEX_CAT_NAMES = {
              'Hair Services':        { m: new Set(['Basic Haircut','Fade / Taper / Skin Fade','Designer Haircut','Hair Styling','Hair Wash','Blow Dry','Hair Coloring','Hair Straightening','Hair Smoothening','Hair Spa','Dandruff Treatment','Hair Fall Treatment']), f: new Set(['Haircut (Layer / Step / Trim)','Advanced Haircut','Hair Styling (Straight / Curl / Party)','Hair Wash','Blow Dry','Hair Coloring','Highlights / Balayage','Hair Smoothening','Rebonding','Keratin Treatment','Hair Spa']) },
              'Beard & Grooming':     { m: new Set(['Beard Trim','Clean Shave','Beard Styling / Shape','Designer Beard','Beard Coloring','Hot Towel Shave']), f: new Set() },
              'Nail Services':        { m: new Set(['Manicure','Pedicure']), f: new Set(['Manicure','Pedicure','Nail Art','Gel Nails','Acrylic Nails','Nail Extensions','Nail Repair']) },
              'Skin & Face / Beauty': { m: new Set(['Basic Facial','Gold Facial','Diamond Facial','Clean-up','Detan','Face Bleach','Anti-Acne Treatment','Skin Brightening']), f: new Set(['Basic Facial','Gold Facial','Diamond Facial','Hydra Facial','Clean-up','Detan','Bleach','Anti-aging Treatment','Skin Brightening']) },
              'Spa & Massage':        { m: new Set(['Head Massage','Neck & Shoulder Massage','Full Body Massage','Foot Massage','Deep Tissue Massage','Relaxation Massage']), f: new Set(['Head Massage','Full Body Massage','Foot Massage','Aromatherapy','Spa Therapy','Relaxation Massage']) },
              'Body Grooming':        { m: new Set(['Chest Waxing','Back Waxing','Full Body Wax','Threading (optional)','Nose Wax','Ear Cleaning']), f: new Set(['Full Body Wax','Half Wax','Bikini Wax','Threading (Eyebrow / Upper Lip / Forehead)','Body Polish','Body Scrub']) },
              'Bridal & Events':      { m: new Set(['Groom Makeup','Hairstyling (Groom)','Shave & Grooming (Groom)']), f: new Set(['Bridal Makeup','Engagement Makeup','Party Makeup','Hairstyling','Saree Draping']) },
              'Kids Services':        { m: new Set(["Kids' Haircut (Boys)","Kids' Hair Styling (Boys)","Kids' Hair Wash"]), f: new Set(["Kids' Haircut (Girls)","Kids' Hair Styling (Girls)","Kids' Hair Wash","Kids' Braiding"]) },
              'At-Home Services':     { m: new Set(['At-Home Haircut (Men)','At-Home Shave','At-Home Massage','At-Home Facial (Men)']), f: new Set(['At-Home Haircut (Women)','At-Home Facial','At-Home Waxing','At-Home Massage','At-Home Bridal']) }
            };

            const classifySvc = (s) => {
              const af = s.applicableFor || [];
              if (af.length > 0 && af.includes('male')   && !af.includes('female')) return 'male';
              if (af.length > 0 && af.includes('female') && !af.includes('male'))   return 'female';
              const lookup = UNISEX_CAT_NAMES[s.category || ''];
              if (lookup) {
                const inM = lookup.m.has(s.name);
                const inF = lookup.f.has(s.name);
                if (inM && !inF) return 'male';
                if (inF && !inM) return 'female';
              }
              return 'both';
            };

            const visibleServices = !isUnisex || serviceGenderFilter === 'all'
              ? services
              : services.filter(s => {
                  const cat = s.category || '';
                  if (serviceGenderFilter === 'female' && MALE_ONLY_CATS.includes(cat))   return false;
                  if (serviceGenderFilter === 'male'   && FEMALE_ONLY_CATS.includes(cat)) return false;
                  const gender = classifySvc(s);
                  if (gender === 'both') return true;
                  return gender === serviceGenderFilter;
                });

            const categoryIconMap = {
              'Hair Services': '✂️', 'Hair Services (Men)': '✂️', 'Hair Services (Women)': '✂️',
              'Beard & Grooming': '🧔', 'Nail Services': '💅',
              'Skin & Face / Beauty': '🧖', 'Skin & Face (Men Grooming)': '🧴', 'Skin & Beauty': '🧖',
              'Spa & Massage': '💆', 'Spa & Relaxation': '💆',
              'Body Grooming': '🧴', 'Bridal & Events': '👰',
              'Kids Services': '👶', 'At-Home Services': '🏠'
            };

            const CATEGORY_ORDER = [
              'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
              'Beard & Grooming', 'Nail Services',
              'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
              'Spa & Massage', 'Spa & Relaxation', 'Body Grooming', 'Bridal & Events',
              'Kids Services', 'At-Home Services',
            ];

            const grouped = visibleServices.reduce((acc, svc) => {
              const cat = svc.category || 'Other';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(svc);
              return acc;
            }, {});

            const sortedGroupEntries = Object.entries(grouped).sort(([a], [b]) => {
              const ai = CATEGORY_ORDER.indexOf(a);
              const bi = CATEGORY_ORDER.indexOf(b);
              if (ai === -1 && bi === -1) return a.localeCompare(b);
              if (ai === -1) return 1;
              if (bi === -1) return -1;
              return ai - bi;
            });

            return (
              <View style={{ gap: 16 }}>
                {/* Gender filter — only for unisex salons */}
                {isUnisex && services.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                    {[
                      { key: 'all',    label: 'All',   emoji: '👥' },
                      { key: 'male',   label: 'Men',   emoji: '👨' },
                      { key: 'female', label: 'Women', emoji: '👩' },
                    ].map(({ key, label, emoji }) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setServiceGenderFilter(key)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingHorizontal: 12, paddingVertical: 7,
                          borderRadius: 20, borderWidth: 1.5,
                          backgroundColor: serviceGenderFilter === key ? '#4f46e5' : '#fff',
                          borderColor: serviceGenderFilter === key ? '#4f46e5' : '#d1d5db'
                        }}
                      >
                        <AppText style={{ fontSize: 13 }}>{emoji}</AppText>
                        <AppText style={{ fontSize: 12, fontWeight: '600', color: serviceGenderFilter === key ? '#fff' : '#6b7280' }}>{label}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {visibleServices.length === 0 ? (
                  <View style={styles.emptyTab}>
                    <Ionicons name="cut-outline" size={36} color="#d1d5db" />
                    <AppText style={styles.emptyTabText}>No services listed</AppText>
                  </View>
                ) : sortedGroupEntries.map(([cat, catServices]) => {
                  const showGenderSplit = salon.servedGender === 'unisex' && serviceGenderFilter === 'all';
                  const maleOnly   = showGenderSplit ? catServices.filter(s => classifySvc(s) === 'male')   : [];
                  const femaleOnly = showGenderSplit ? catServices.filter(s => classifySvc(s) === 'female') : [];
                  const both       = showGenderSplit ? catServices.filter(s => classifySvc(s) === 'both')   : catServices;
                  const hasSplit   = showGenderSplit && (maleOnly.length > 0 || femaleOnly.length > 0);

                  const renderServiceCard = (svc) => {
                    const selected = selectedServices.some(s => s._id === svc._id);
                    return (
                      <TouchableOpacity
                        key={svc._id}
                        style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                        onPress={() => toggleService(svc)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.serviceTop}>
                            <AppText style={[styles.serviceName, selected && { color: '#7C3AED' }]}>{svc.name}</AppText>
                            <AppText style={styles.servicePrice}>₹{svc.basePrice || svc.price}</AppText>
                          </View>
                          <View style={styles.serviceMeta}>
                            <Ionicons name="time-outline" size={12} color="#9ca3af" />
                            <AppText style={styles.serviceMetaText}>{svc.duration} min</AppText>
                            {svc.description && <AppText style={styles.serviceDesc} numberOfLines={1}>· {svc.description}</AppText>}
                          </View>
                        </View>
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && <Ionicons name="checkmark" size={18} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  };

                  const isOpen = expandedCat === cat;

                  return (
                    <View key={cat} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
                      <TouchableOpacity
                        onPress={() => setExpandedCat(isOpen ? null : cat)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: theme.card }}
                        activeOpacity={0.7}
                      >
                        <AppText style={{ fontSize: 18 }}>{categoryIconMap[cat] || '✨'}</AppText>
                        <AppText style={{ fontSize: 15, fontWeight: '700', color: theme.text, flex: 1 }}>{cat}</AppText>
                        <AppText style={{ fontSize: 12, color: theme.subText, marginRight: 6 }}>{catServices.length}</AppText>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12 }}>
                          {hasSplit ? (
                            <View style={{ gap: 12 }}>
                              {maleOnly.length > 0 && (
                                <View>
                                  <AppText style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED', marginBottom: 6 }}>👨 Men</AppText>
                                  <View style={{ gap: 8 }}>{maleOnly.map(renderServiceCard)}</View>
                                </View>
                              )}
                              {femaleOnly.length > 0 && (
                                <View>
                                  <AppText style={{ fontSize: 12, fontWeight: '700', color: '#ec4899', marginBottom: 6 }}>👩 Women</AppText>
                                  <View style={{ gap: 8 }}>{femaleOnly.map(renderServiceCard)}</View>
                                </View>
                              )}
                              {both.length > 0 && (
                                <View style={{ gap: 8 }}>{both.map(renderServiceCard)}</View>
                              )}
                            </View>
                          ) : (
                            <View style={{ gap: 8 }}>{catServices.map(renderServiceCard)}</View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Reels Tab */}
          {activeTab === 'Reels' && (() => {
            const videos = (salon?.videos || []).map(v => typeof v === 'string' ? v : v?.url).filter(Boolean);
            if (videos.length === 0) return (
              <View style={styles.emptyTab}>
                <AppText style={{ fontSize: 36, marginBottom: 8 }}>🎬</AppText>
                <AppText style={styles.emptyTabText}>No reels yet</AppText>
              </View>
            );
            return (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                {videos.map((url, i) => {
                  const thumb = url.replace('/upload/', '/upload/so_0,f_jpg,q_60,w_400/').replace(/\.(mp4|mov|webm)$/, '.jpg');
                  return (
                    <TouchableOpacity key={url} onPress={() => setGalleryLightbox((salon?.photos || []).length + i)}
                      style={{ width: '49%', aspectRatio: 9/16, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(124,58,237,0.1)', position: 'relative', marginBottom: 3 }}>
                      <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => {}} />
                      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="play" size={20} color="#fff" />
                        </View>
                      </View>
                      <View style={{ position: 'absolute', bottom: 8, left: 8 }}>
                        <AppText style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{i+1}/{videos.length}</AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}

          {/* Photos Tab */}
          {activeTab === 'Photos' && (() => {
            const photos = (salon?.photos || []).map(p => typeof p === 'string' ? p : p?.url).filter(Boolean);
            if (photos.length === 0) return (
              <View style={styles.emptyTab}>
                <AppText style={{ fontSize: 36, marginBottom: 8 }}>📷</AppText>
                <AppText style={styles.emptyTabText}>No photos yet</AppText>
              </View>
            );
            return (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                {photos.map((url, i) => (
                  <TouchableOpacity key={url} onPress={() => setGalleryLightbox(i)}
                    style={{ width: '49%', aspectRatio: 1, overflow: 'hidden', marginBottom: 3 }}>
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}

          {/* Packages Tab */}
          {activeTab === 'Packages' && (
            <View style={{ gap: 12 }}>
              {packages.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="gift-outline" size={36} color="#d1d5db" />
                  <AppText style={styles.emptyTabText}>No packages or memberships yet</AppText>
                </View>
              ) : (
                <>
                  {/* Service Packages */}
                  {packages.filter(p => p.type === 'package').length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="gift-outline" size={15} color="#7C3AED" />
                        <AppText style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Service Packages</AppText>
                      </View>
                      {packages.filter(p => p.type === 'package').map(pkg => (
                        <View key={pkg._id} style={[styles.pkgCard, { borderColor: '#c7d2fe' }]}>
                          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                            <AppText style={{ fontSize: 24 }}>{pkg.icon || '🎁'}</AppText>
                            <View style={{ flex: 1 }}>
                              <AppText style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{pkg.name}</AppText>
                              {pkg.description ? <AppText style={{ fontSize: 12, color: theme.subText }} numberOfLines={2}>{pkg.description}</AppText> : null}
                            </View>
                          </View>
                          {pkg.services?.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                              {pkg.services.map((svc, i) => (
                                <View key={i} style={{ backgroundColor: theme.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <AppText style={{ fontSize: 11, color: theme.subText }}>{svc.serviceName}</AppText>
                                </View>
                              ))}
                            </View>
                          )}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                              <AppText style={{ fontSize: 20, fontWeight: '900', color: '#7C3AED' }}>₹{pkg.discountedPrice}</AppText>
                              {pkg.originalPrice > 0 && pkg.originalPrice !== pkg.discountedPrice && (
                                <>
                                  <AppText style={{ fontSize: 12, color: theme.subText, textDecorationLine: 'line-through' }}>₹{pkg.originalPrice}</AppText>
                                  <AppText style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>{pkg.discountPercent}% OFF</AppText>
                                </>
                              )}
                            </View>
                            <TouchableOpacity
                              onPress={() => { setPkgReqItem(pkg); setPkgNote(''); }}
                              style={styles.pkgBuyBtn}
                            >
                              <AppText style={styles.pkgBuyBtnText}>Buy Now</AppText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Memberships */}
                  {packages.filter(p => p.type === 'membership').length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="card-outline" size={15} color="#7c3aed" />
                        <AppText style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Membership Plans</AppText>
                      </View>
                      {packages.filter(p => p.type === 'membership').map(pkg => (
                        <View key={pkg._id} style={[styles.pkgCard, { borderColor: '#ddd6fe' }]}>
                          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                            <AppText style={{ fontSize: 24 }}>{pkg.icon || '💳'}</AppText>
                            <View style={{ flex: 1 }}>
                              <AppText style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{pkg.name}</AppText>
                              {pkg.description ? <AppText style={{ fontSize: 12, color: theme.subText }} numberOfLines={2}>{pkg.description}</AppText> : null}
                            </View>
                          </View>
                          <View style={{ gap: 4, marginBottom: 8 }}>
                            {pkg.benefits?.discountPercent > 0 && (
                              <AppText style={{ fontSize: 12, color: theme.subText }}>🏷 {pkg.benefits.discountPercent}% off all services</AppText>
                            )}
                            {pkg.benefits?.priorityBooking && (
                              <AppText style={{ fontSize: 12, color: theme.subText }}>⚡ Priority booking</AppText>
                            )}
                            {(pkg.benefits?.freeServices || []).map((fs, i) => (
                              <AppText key={i} style={{ fontSize: 12, color: theme.subText }}>✓ {fs.serviceName} × {fs.usageLimit}</AppText>
                            ))}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                                <AppText style={{ fontSize: 20, fontWeight: '900', color: '#7c3aed' }}>₹{pkg.price}</AppText>
                                <AppText style={{ fontSize: 12, color: theme.subText }}>
                                  /{pkg.billingCycle === 'monthly' ? 'month' : pkg.billingCycle === 'quarterly' ? 'quarter' : 'year'}
                                </AppText>
                              </View>
                              <AppText style={{ fontSize: 11, color: theme.subText }}>Valid {pkg.durationDays} days</AppText>
                            </View>
                            <TouchableOpacity
                              onPress={() => { setPkgReqItem(pkg); setPkgNote(''); }}
                              style={[styles.pkgBuyBtn, { backgroundColor: '#7c3aed' }]}
                            >
                              <AppText style={styles.pkgBuyBtnText}>Subscribe</AppText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Reviews Tab */}
          {activeTab === 'Reviews' && (() => {
            const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            reviews.forEach(r => { const s = Math.round(r.salonRating || r.rating || 5); starCounts[s] = (starCounts[s] || 0) + 1; });
            const recommendRate = reviews.length ? Math.round(reviews.filter(r => (r.salonRating || r.rating || 0) >= 4).length / reviews.length * 100) : 0;
            const filteredReviews = reviewFilter === 'with_photos' ? reviews.filter(r => r.photos?.length > 0) : reviews;
            const avatarColors = ['#e94560', '#8b5cf6', '#10b981', '#f59e0b', '#38bdf8'];
            return (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <AppText style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 }}>Reflections of Glow</AppText>
                  <TouchableOpacity style={{ backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <AppText style={{ fontSize: 11, fontWeight: '700', color: '#A78BFA' }}>Write Review</AppText>
                  </TouchableOpacity>
                </View>
                <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: -8, marginBottom: 4 }}>Our community's experience with {salon.name}.</AppText>
                {reviews.length === 0 ? (
                  <View style={styles.emptyTab}>
                    <AppText style={{ fontSize: 32, marginBottom: 8 }}>💬</AppText>
                    <AppText style={styles.emptyTabText}>No reviews yet. Be the first!</AppText>
                  </View>
                ) : (
                  <>
                    {/* Aggregate box */}
                    <View style={{ borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', padding: 18, marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                        <View style={{ alignItems: 'center' }}>
                          <AppText style={{ fontSize: 44, fontWeight: '900', color: '#FFFFFF', lineHeight: 48 }}>{rating > 0 ? rating.toFixed(1) : '—'}</AppText>
                          <View style={{ flexDirection: 'row', gap: 2, marginVertical: 4 }}>
                            {[1,2,3,4,5].map(s => <AppText key={s} style={{ fontSize: 12, color: s <= Math.round(rating) ? '#FDE68A' : 'rgba(255,255,255,0.15)' }}>★</AppText>)}
                          </View>
                          <AppText style={{ fontSize: 8, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>BASED ON {reviews.length}</AppText>
                        </View>
                        <View style={{ flex: 1, gap: 5 }}>
                          {[5,4,3,2,1].map(star => {
                            const pct = reviews.length > 0 ? Math.round((starCounts[star] || 0) / reviews.length * 100) : 0;
                            return (
                              <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <AppText style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600', width: 8, textAlign: 'right' }}>{star}</AppText>
                                <AppText style={{ fontSize: 9, color: '#FDE68A' }}>★</AppText>
                                <View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                  <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: '#7C3AED' }} />
                                </View>
                                <AppText style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: '600', width: 24, textAlign: 'right' }}>{pct}%</AppText>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 12, alignItems: 'center' }}>
                        <AppText style={{ fontSize: 8, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 4 }}>RECOMMENDATION RATE</AppText>
                        <AppText style={{ fontSize: 32, fontWeight: '900', color: '#FFFFFF' }}>{recommendRate}%</AppText>
                        <AppText style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>of clients would recommend to a friend.</AppText>
                      </View>
                    </View>
                    {/* Filter pills */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                      {[{ key: 'all', label: 'All Reviews' }, { key: 'with_photos', label: 'With Photos' }].map(({ key, label }) => (
                        <TouchableOpacity key={key} onPress={() => setReviewFilter(key)}
                          style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: reviewFilter === key ? '#7C3AED' : 'rgba(255,255,255,0.12)', backgroundColor: reviewFilter === key ? '#7C3AED' : 'transparent' }}>
                          <AppText style={{ fontSize: 12, fontWeight: '600', color: reviewFilter === key ? '#fff' : 'rgba(255,255,255,0.5)' }}>{label}</AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Review cards */}
                    {filteredReviews.map((r, i) => {
                      const starRating = Math.round(r.salonRating || r.rating || 5);
                      const name = r.customerName || r.name || 'Guest';
                      return (
                        <View key={r._id || i} style={{ borderRadius: 14, padding: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.10)', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: avatarColors[i % avatarColors.length], alignItems: 'center', justifyContent: 'center' }}>
                              <AppText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{name.charAt(0).toUpperCase()}</AppText>
                            </View>
                            <View style={{ flex: 1 }}>
                              <AppText style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{name}</AppText>
                              {r.createdAt && <AppText style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</AppText>}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 1 }}>
                              {[1,2,3,4,5].map(s => <AppText key={s} style={{ fontSize: 11, color: s <= starRating ? '#FDE68A' : 'rgba(255,255,255,0.15)' }}>★</AppText>)}
                            </View>
                          </View>
                          {(r.reviewText || r.comment) && <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19 }} numberOfLines={4}>&ldquo;{r.reviewText || r.comment}&rdquo;</AppText>}
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            );
          })()}

          {/* Info Tab */}
          {activeTab === 'Info' && (
            <View style={{ gap: 12 }}>
              <View style={styles.infoSection}>
                <AppText style={styles.infoSectionTitle}>Contact</AppText>
                {salon.phone && (
                  <TouchableOpacity style={styles.infoRow2} onPress={() => Linking.openURL(`tel:${salon.phone}`)}>
                    <Ionicons name="call-outline" size={16} color="#7C3AED" />
                    <AppText style={[styles.infoValue, { color: '#7C3AED' }]}>{salon.phone}</AppText>
                  </TouchableOpacity>
                )}
                {salon.email && (
                  <View style={styles.infoRow2}>
                    <Ionicons name="mail-outline" size={16} color="#6b7280" />
                    <AppText style={styles.infoValue}>{salon.email}</AppText>
                  </View>
                )}
              </View>

              <View style={styles.infoSection}>
                <AppText style={styles.infoSectionTitle}>Address</AppText>
                <View style={styles.infoRow2}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <AppText style={styles.infoValue}>
                    {[salon.address, salon.city, salon.district, salon.state, salon.pincode].filter(Boolean).join(', ')}
                  </AppText>
                </View>
              </View>

              {galleryItems.length > 0 && (
                <View style={styles.infoSection}>
                  <AppText style={styles.infoSectionTitle}>
                    Gallery ({salonPhotos.length} photo{salonPhotos.length !== 1 ? 's' : ''}{salonVideos.length > 0 ? ` · ${salonVideos.length} video${salonVideos.length !== 1 ? 's' : ''}` : ''})
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
                    {galleryItems.map((item, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setGalleryLightbox(i)}
                        activeOpacity={0.85}
                        style={{ position: 'relative' }}
                      >
                        <Image source={{ uri: item.url }} style={styles.galleryImg} resizeMode="cover" />
                        {item.type === 'video' && (
                          <View style={styles.galleryPlayOverlay}>
                            <View style={styles.galleryPlayCircle}>
                              <Ionicons name="play" size={16} color="#fff" />
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {salon.workingHours && (
                <View style={styles.infoSection}>
                  <AppText style={styles.infoSectionTitle}>Working Hours</AppText>
                  {DAY_NAMES.map(day => (
                    <WorkingHoursRow
                      key={day}
                      day={day}
                      hours={salon.workingHours[day.toLowerCase()]}
                      styles={styles}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Bottom Book Bar */}
      {selectedServices.length > 0 && (
        <View style={[styles.bookBar, { paddingBottom: insets.bottom + 12 }]}>
          <View>
            <AppText style={styles.bookBarCount}>{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {totalDuration} min</AppText>
            <AppText style={styles.bookBarPrice}>₹{totalPrice}</AppText>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={handleBookNow}>
            <AppText style={styles.bookBtnText}>Book Now</AppText>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Gallery Lightbox ──────────────────────────────────────────────── */}
      {galleryLightbox !== null && galleryItems[galleryLightbox] && (() => {
        const lbItem = galleryItems[galleryLightbox];
        const isVideo = lbItem.type === 'video';
        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setGalleryLightbox(null)} statusBarTranslucent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' }}>
              {/* Top bar */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isVideo && <Ionicons name="videocam" size={16} color="#a78bfa" />}
                  <AppText style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{galleryLightbox + 1} / {galleryItems.length}</AppText>
                </View>
                <TouchableOpacity onPress={() => { galleryVideoRef.current?.pauseAsync?.().catch(()=>{}); setGalleryLightbox(null); }}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Media */}
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {isVideo ? (
                  <Video
                    ref={galleryVideoRef}
                    source={{ uri: lbItem.url }}
                    style={{ width: screenW, height: screenH * 0.55 }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay
                    isLooping={false}
                  />
                ) : (
                  <Image source={{ uri: lbItem.url }} style={{ width: screenW, height: screenH * 0.65 }} resizeMode="contain" />
                )}
              </View>

              {/* Nav arrows */}
              {galleryLightbox > 0 && (
                <TouchableOpacity
                  onPress={() => { galleryVideoRef.current?.pauseAsync?.().catch(()=>{}); setGalleryLightbox(i => i - 1); }}
                  style={{ position: 'absolute', left: 8, top: '50%', marginTop: -24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24 }}
                >
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
              )}
              {galleryLightbox < galleryItems.length - 1 && (
                <TouchableOpacity
                  onPress={() => { galleryVideoRef.current?.pauseAsync?.().catch(()=>{}); setGalleryLightbox(i => i + 1); }}
                  style={{ position: 'absolute', right: 8, top: '50%', marginTop: -24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24 }}
                >
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </Modal>
        );
      })()}

      {/* ── Booking Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showBooking}
        animationType="slide"
        onRequestClose={() => { if (!bookingSuccess) setShowBooking(false); }}
      >
        <View style={[styles.bkContainer, { paddingTop: insets.top }]}>

          {bookingSuccess ? (
            /* ── Success screen ─────────────────────────────────────────── */
            <View style={styles.successBox}>
              <View style={styles.successCard}>
                <View style={[styles.successIcon, { backgroundColor: bookingStatus === 'pending' ? '#fef3c7' : '#dcfce7' }]}>
                  <Ionicons
                    name={bookingStatus === 'pending' ? 'time-outline' : 'checkmark-circle'}
                    size={52}
                    color={bookingStatus === 'pending' ? '#d97706' : '#16a34a'}
                  />
                </View>
                <AppText style={styles.successTitle}>
                  {bookingStatus === 'pending' ? 'Booking Received!' : 'Booking Confirmed!'}
                </AppText>
                {bookingStatus === 'pending' && (
                  <View style={styles.pendingNote}>
                    <AppText style={styles.pendingNoteText}>Awaiting salon confirmation. You'll be notified once approved.</AppText>
                  </View>
                )}
                <View style={styles.successDetails}>
                  <AppText style={styles.successSalon}>{salon.name}</AppText>
                  <AppText style={styles.successService}>{selectedServices.map(s => s.name).join(' + ')}</AppText>
                  <View style={styles.successRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                    <AppText style={styles.successMeta}>{bookDate}</AppText>
                    <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginLeft: 12 }} />
                    <AppText style={styles.successMeta}>{slot}</AppText>
                  </View>
                  <View style={styles.successRow}>
                    <Ionicons name="cash-outline" size={14} color="#6b7280" />
                    <AppText style={styles.successMeta}>₹{finalPrice} · Pay at salon</AppText>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.successBtn}
                  onPress={() => { setShowBooking(false); navigation.getParent()?.navigate('BookingsTab'); }}
                >
                  <AppText style={styles.successBtnText}>View My Bookings</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.successBtnOutline}
                  onPress={() => { setShowBooking(false); navigation.goBack(); }}
                >
                  <AppText style={styles.successBtnOutlineText}>Browse More Salons</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Booking form ───────────────────────────────────────────── */
            <>
              {/* Modal header */}
              <View style={styles.bkHeader}>
                <View style={styles.bkDecorCircle1} />
                <View style={styles.bkDecorCircle2} />
                <View style={styles.bkHeaderRow}>
                  <TouchableOpacity onPress={() => setShowBooking(false)} style={styles.bkBackBtn}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <AppText style={styles.bkHeaderTitle}>Book Appointment</AppText>
                  <View style={{ width: 36 }} />
                </View>
                {/* Selected services summary strip */}
                <View style={styles.bkSvcStrip}>
                  <AppText style={styles.bkSvcStripText} numberOfLines={1}>
                    {salon.name} · {selectedServices.map(s => s.name).join(', ')}
                  </AppText>
                  <AppText style={styles.bkSvcStripMeta}>{totalDuration} min · ₹{totalPrice}</AppText>
                </View>
              </View>

              <ScrollView style={styles.bkBody} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

                {/* Date selection */}
                <View style={styles.bkSection}>
                  <AppText style={styles.bkSectionTitle}>Select Date</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {dateDays.map(d => {
                      const { day, date: dateNum } = formatDay(d);
                      const active = bookDate === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dateChip, active && styles.dateChipActive]}
                          onPress={() => setBookDate(d)}
                        >
                          <AppText style={[styles.dateChipDay, active && styles.dateChipTextActive]}>{day}</AppText>
                          <AppText style={[styles.dateChipNum, active && styles.dateChipTextActive]}>{dateNum}</AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Stylist selection */}
                {barbers.length > 0 && (
                  <View style={styles.bkSection}>
                    <AppText style={styles.bkSectionTitle}>Select Stylist <AppText style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</AppText></AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.barberChip, barberId === '' && styles.barberChipActive]}
                        onPress={() => setBarberId('')}
                      >
                        <View style={styles.barberAvatar}><Ionicons name="people-outline" size={18} color={barberId === '' ? '#fff' : '#6b7280'} /></View>
                        <AppText style={[styles.barberName, barberId === '' && styles.barberNameActive]}>Any</AppText>
                      </TouchableOpacity>
                      {barbers.map(b => (
                        <TouchableOpacity
                          key={b._id}
                          style={[styles.barberChip, barberId === b._id && styles.barberChipActive]}
                          onPress={() => setBarberId(b._id)}
                        >
                          <View style={styles.barberAvatar}>
                            <AppText style={{ fontSize: 15, fontWeight: '700', color: barberId === b._id ? '#fff' : '#7C3AED' }}>
                              {b.name.charAt(0).toUpperCase()}
                            </AppText>
                          </View>
                          <AppText style={[styles.barberName, barberId === b._id && styles.barberNameActive]}>{b.name}</AppText>
                          {b.experience > 0 && <AppText style={styles.barberExp}>{b.experience}yr</AppText>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Time slots */}
                <View style={styles.bkSection}>
                  <AppText style={styles.bkSectionTitle}>
                    Select Time {totalDuration > 0 && <AppText style={{ fontWeight: '400', color: '#9ca3af' }}>({totalDuration} min)</AppText>}
                  </AppText>
                  {slotsLoading ? (
                    <View style={styles.slotsLoading}>
                      <ActivityIndicator color="#7C3AED" size="small" />
                      <AppText style={{ color: '#6b7280', fontSize: 13 }}>Loading slots...</AppText>
                    </View>
                  ) : closedDay ? (
                    <View style={styles.closedDay}>
                      <Ionicons name="lock-closed-outline" size={20} color="#d97706" />
                      <AppText style={styles.closedDayText}>Salon is closed on this date. Try another day.</AppText>
                    </View>
                  ) : slots.length === 0 ? (
                    <View style={styles.noSlots}>
                      <AppText style={styles.noSlotsText}>No available slots for this date.</AppText>
                    </View>
                  ) : bookingMode === 'sequential' ? (
                    <View style={styles.seqSlot}>
                      <Ionicons name="flash-outline" size={16} color="#7c3aed" />
                      <AppText style={styles.seqText}>Auto-assigned: <AppText style={{ fontWeight: '800' }}>{slots[0]} – {addMinutes(slots[0], totalDuration)}</AppText></AppText>
                    </View>
                  ) : (
                    <>
                      <View style={styles.slotLegend}>
                        {[['#e5e7eb','Past'],['#fecaca','Booked'],['#7C3AED','Selected'],['#f3f4f6','Available']].map(([c, l]) => (
                          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
                            <AppText style={{ fontSize: 10, color: '#6b7280' }}>{l}</AppText>
                          </View>
                        ))}
                      </View>
                      <View style={styles.slotsGrid}>
                        {slots.map(s => {
                          const past    = isPastSlot(bookDate, s);
                          const blocked = !past && blockedSlots.includes(s);
                          const selected = slot === s;
                          const end     = addMinutes(s, totalDuration);
                          return (
                            <TouchableOpacity
                              key={s}
                              style={[
                                styles.slotBtn,
                                past    ? styles.slotPast :
                                blocked ? styles.slotBooked :
                                selected ? styles.slotSelected :
                                styles.slotAvailable,
                              ]}
                              onPress={() => {
                                if (past)    { setSlotAlert('past');   return; }
                                if (blocked) { setSlotAlert('booked'); return; }
                                setSlot(s);
                              }}
                            >
                              <AppText style={[styles.slotTime, selected && { color: '#fff' }, (past || blocked) && { color: '#9ca3af' }]}>{s}</AppText>
                              <AppText style={[styles.slotEnd, selected && { color: '#bfdbfe' }, (past || blocked) && { color: '#d1d5db' }]}>–{end}</AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>

                {/* Coupon */}
                {slot && salon?.hasCoupons && (
                  <View style={styles.bkSection}>
                    <AppText style={styles.bkSectionTitle}>Coupon Code</AppText>
                    {appliedCoupon ? (
                      <View style={styles.couponApplied}>
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                        <AppText style={styles.couponAppliedText}>{appliedCoupon.code} — ₹{couponDiscount} off</AppText>
                        <TouchableOpacity onPress={removeCoupon}>
                          <AppText style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remove</AppText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.couponRow}>
                        <TextInput
                          style={styles.couponInput}
                          placeholder="Enter coupon code"
                          placeholderTextColor="#9ca3af"
                          value={couponInput}
                          onChangeText={v => { setCouponInput(v.toUpperCase()); setCouponError(''); }}
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity
                          style={[styles.couponBtn, (!couponInput.trim() || couponLoading) && { opacity: 0.5 }]}
                          onPress={applyCoupon}
                          disabled={!couponInput.trim() || couponLoading}
                        >
                          {couponLoading ? <ActivityIndicator size="small" color="#fff" /> : <AppText style={styles.couponBtnText}>Apply</AppText>}
                        </TouchableOpacity>
                      </View>
                    )}
                    {!!couponError && <AppText style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{couponError}</AppText>}
                  </View>
                )}

                {/* Price summary */}
                {slot && (
                  <View style={styles.priceSummary}>
                    <AppText style={styles.priceSummaryTitle}>Booking Summary</AppText>
                    {selectedServices.map(s => (
                      <View key={s._id} style={styles.priceRow}>
                        <AppText style={styles.priceLabel}>{s.name}</AppText>
                        <AppText style={styles.priceVal}>₹{s.basePrice || s.price}</AppText>
                      </View>
                    ))}
                    <View style={styles.priceRow}>
                      <AppText style={styles.priceLabel}>Date & Time</AppText>
                      <AppText style={styles.priceVal}>{bookDate} · {slot}</AppText>
                    </View>
                    {couponDiscount > 0 && (
                      <View style={styles.priceRow}>
                        <AppText style={[styles.priceLabel, { color: '#16a34a' }]}>Discount</AppText>
                        <AppText style={[styles.priceVal, { color: '#16a34a' }]}>−₹{couponDiscount}</AppText>
                      </View>
                    )}
                    <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
                      <AppText style={styles.priceTotalLabel}>Total (Pay at salon)</AppText>
                      <AppText style={styles.priceTotalVal}>₹{finalPrice}</AppText>
                    </View>
                  </View>
                )}

              </ScrollView>

              {/* Confirm button */}
              <View style={[styles.bkFooter, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                  style={[styles.confirmBtn, (!slot || bookingLoading) && { opacity: 0.5 }]}
                  onPress={handleConfirm}
                  disabled={!slot || bookingLoading}
                >
                  {bookingLoading
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><AppText style={styles.confirmBtnText}>Confirm Booking</AppText></>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Slot alert mini-modal */}
          <Modal transparent visible={!!slotAlert} animationType="fade" onRequestClose={() => setSlotAlert('')}>
            <View style={styles.alertOverlay}>
              <View style={styles.alertCard}>
                <View style={[styles.alertIcon, { backgroundColor: slotAlert === 'past' ? '#f3f4f6' : '#fee2e2' }]}>
                  <Ionicons name={slotAlert === 'past' ? 'time-outline' : 'ban-outline'} size={36} color={slotAlert === 'past' ? '#374151' : '#ef4444'} />
                </View>
                <AppText style={styles.alertTitle}>{slotAlert === 'past' ? 'Time Has Passed' : 'Slot Already Booked'}</AppText>
                <AppText style={styles.alertText}>
                  {slotAlert === 'past' ? 'This time slot has already passed. Please choose an upcoming slot.' : 'This slot is taken. Please choose another available slot.'}
                </AppText>
                <TouchableOpacity style={styles.alertBtn} onPress={() => setSlotAlert('')}>
                  <AppText style={styles.alertBtnText}>Choose Another Slot</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </View>
      </Modal>

      {/* ── Package Request Modal ─────────────────────────────────────── */}
      <Modal transparent visible={!!pkgReqItem} animationType="slide" onRequestClose={() => { setPkgReqItem(null); setPkgNote(''); }}>
        <View style={styles.alertOverlay}>
          <View style={[styles.alertCard, { alignItems: 'flex-start', gap: 0, padding: 20 }]}>
            {pkgReqItem && (
              <>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <AppText style={{ fontSize: 28 }}>{pkgReqItem.icon || (pkgReqItem.type === 'package' ? '🎁' : '💳')}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{pkgReqItem.name}</AppText>
                    <AppText style={{ fontSize: 12, color: theme.subText }}>
                      {pkgReqItem.type === 'package'
                        ? `₹${pkgReqItem.discountedPrice}`
                        : `₹${pkgReqItem.price}/${pkgReqItem.billingCycle === 'monthly' ? 'month' : pkgReqItem.billingCycle === 'quarterly' ? 'quarter' : 'year'}`}
                    </AppText>
                  </View>
                </View>
                <View style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 10, marginBottom: 12, width: '100%' }}>
                  <AppText style={{ fontSize: 12, color: '#7C3AED', lineHeight: 17 }}>
                    Pay directly at the salon. The owner will confirm after receiving your payment.
                  </AppText>
                </View>
                <AppText style={{ fontSize: 12, fontWeight: '600', color: theme.subText, marginBottom: 6 }}>Note (optional)</AppText>
                <TextInput
                  style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 10, fontSize: 13, color: theme.text, backgroundColor: theme.bg, width: '100%', height: 68, textAlignVertical: 'top', marginBottom: 14 }}
                  placeholder="Any message to the salon owner..."
                  placeholderTextColor={theme.subText}
                  value={pkgNote}
                  onChangeText={setPkgNote}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => { setPkgReqItem(null); setPkgNote(''); }}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: theme.border, borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AppText style={{ color: theme.subText, fontWeight: '600', fontSize: 14 }}>Cancel</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePackageRequest}
                    disabled={pkgReqLoading}
                    style={{ flex: 1, backgroundColor: '#7C3AED', borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', opacity: pkgReqLoading ? 0.6 : 1 }}
                  >
                    <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {pkgReqLoading ? 'Sending…' : 'Send Request'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  // ── Salon details ──────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: '#0D0520' },
  loadingBox: { flex: 1, backgroundColor: t.bg },
  loadingHeader: { height: 240, backgroundColor: t.border },
  topBar: { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  backBtn2: { marginTop: 16, padding: 12 },
  heroWrapper: { position: 'relative' },
  heroImg: { width: '100%', height: 240 },
  heroPlaceholder: { backgroundColor: '#1A0528', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'transparent' },
  infoCard: { backgroundColor: t.card, marginHorizontal: 16, marginTop: -20, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, gap: 8, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  salonName: { fontSize: 20, fontWeight: '800', color: t.text },
  salonCategory: { fontSize: 13, color: t.subText, textTransform: 'capitalize', marginTop: 2 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingNum: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  ratingCount: { fontSize: 11, color: '#92400e' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText: { fontSize: 13, color: t.subText, flex: 1, lineHeight: 18 },
  description: { fontSize: 13, color: t.subText, lineHeight: 19, marginTop: 4 },
  genderBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  genderBadgeMale: { backgroundColor: '#eff6ff' },
  genderBadgeFemale: { backgroundColor: '#fdf2f8' },
  genderBadgeUnisex: { backgroundColor: '#f5f3ff' },
  genderBadgeText: { fontSize: 12, fontWeight: '600' },
  tabBar: { flexDirection: 'row', backgroundColor: t.card, marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: t.border },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabBtnActive: { backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.45, shadowRadius: 10, elevation: 5 },
  tabText: { fontSize: 13, fontWeight: '600', color: t.subText },
  tabTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: t.border, borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: t.subText },
  galleryImg: { width: 120, height: 88, borderRadius: 10 },
  galleryPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 10 },
  galleryPlayCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  emptyTab: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTabText: { fontSize: 14, color: t.subText },
  serviceCard: { backgroundColor: t.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: t.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  serviceCardSelected: { borderColor: '#7C3AED', backgroundColor: '#1A0528' },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  serviceName: { fontSize: 15, fontWeight: '700', color: t.text, flex: 1 },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceMetaText: { fontSize: 13, color: t.subText },
  serviceDesc: { fontSize: 13, color: t.subText, flex: 1 },
  checkbox: { width: 30, height: 30, borderRadius: 8, borderWidth: 2, borderColor: t.inputBorder, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  reviewCard: { backgroundColor: t.card, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A0528', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: '#93c5fd' },
  reviewName: { fontSize: 13, fontWeight: '700', color: t.text },
  reviewDate: { fontSize: 11, color: t.subText },
  reviewText: { fontSize: 13, color: t.text, lineHeight: 19 },
  ownerReplyBox: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
  ownerReplyLabel: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  ownerReplyText: { fontSize: 12, color: '#1e40af', lineHeight: 17 },
  infoSection: { backgroundColor: t.card, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: t.border },
  infoSectionTitle: { fontSize: 13, fontWeight: '700', color: t.subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoRow2: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoValue: { fontSize: 13, color: t.text, flex: 1, lineHeight: 19 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: t.border },
  hoursRowToday: { backgroundColor: '#1A0528', marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 6 },
  hoursDay: { fontSize: 13, color: t.text },
  hoursTime: { fontSize: 13, color: t.text, fontWeight: '600' },
  hoursClosed: { fontSize: 13, color: '#ef4444' },
  bookBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  bookBarCount: { fontSize: 12, color: t.subText },
  bookBarPrice: { fontSize: 20, fontWeight: '800', color: t.text },
  bookBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // ── Booking modal ──────────────────────────────────────────────────────────
  bkContainer: { flex: 1, backgroundColor: t.bg },
  bkHeader: { backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingBottom: 14, overflow: 'hidden' },
  bkDecorCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 },
  bkDecorCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 20 },
  bkHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 },
  bkBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  bkHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  bkSvcStrip: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bkSvcStripText: { fontSize: 13, color: '#fff', fontWeight: '600', flex: 1 },
  bkSvcStripMeta: { fontSize: 12, color: '#bfdbfe', fontWeight: '600', marginLeft: 8 },
  bkBody: { flex: 1 },
  bkSection: { gap: 10 },
  bkSectionTitle: { fontSize: 14, fontWeight: '700', color: t.text },
  bkFooter: { backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, paddingHorizontal: 16, paddingTop: 12 },

  // Date chips
  dateChip: { width: 52, height: 62, borderRadius: 12, backgroundColor: t.card, borderWidth: 1.5, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dateChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  dateChipDay: { fontSize: 11, color: t.subText, fontWeight: '600' },
  dateChipNum: { fontSize: 18, color: t.text, fontWeight: '800' },
  dateChipTextActive: { color: '#fff' },

  // Barber chips
  barberChip: { alignItems: 'center', gap: 6, backgroundColor: t.card, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, padding: 12, minWidth: 72 },
  barberChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  barberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  barberName: { fontSize: 12, fontWeight: '600', color: t.text },
  barberNameActive: { color: '#fff' },
  barberExp: { fontSize: 10, color: t.subText },

  // Slots
  slotsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  closedDay: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12 },
  closedDayText: { fontSize: 13, color: '#92400e', flex: 1 },
  noSlots: { backgroundColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  noSlotsText: { fontSize: 13, color: t.subText },
  seqSlot: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: t.border },
  seqText: { fontSize: 13, color: t.accent, flex: 1 },
  slotLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { width: '30%', borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5 },
  slotAvailable: { backgroundColor: t.card, borderColor: t.inputBorder },
  slotSelected: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  slotPast: { backgroundColor: t.border, borderColor: t.border },
  slotBooked: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  slotTime: { fontSize: 13, fontWeight: '700', color: t.text },
  slotEnd: { fontSize: 10, color: t.subText, marginTop: 1 },

  // Coupon
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, borderWidth: 1.5, borderColor: t.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: t.text, letterSpacing: 1 },
  couponBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 16, height: 46, alignItems: 'center', justifyContent: 'center' },
  couponBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  couponAppliedText: { flex: 1, fontSize: 13, color: '#16a34a', fontWeight: '600' },

  // Price summary
  priceSummary: { backgroundColor: t.card, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  priceSummaryTitle: { fontSize: 13, fontWeight: '700', color: t.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 13, color: t.subText },
  priceVal: { fontSize: 13, fontWeight: '600', color: t.text },
  priceTotalLabel: { fontSize: 14, fontWeight: '700', color: t.accent },
  priceTotalVal: { fontSize: 16, fontWeight: '800', color: t.accent },

  // Confirm
  confirmBtn: { backgroundColor: '#7C3AED', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Success
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  successCard: { backgroundColor: t.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  successIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontSize: 22, fontWeight: '800', color: t.text },
  pendingNote: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#fde68a' },
  pendingNoteText: { fontSize: 13, color: '#92400e', textAlign: 'center', lineHeight: 18 },
  successDetails: { backgroundColor: t.bg, borderRadius: 12, padding: 14, width: '100%', gap: 6 },
  successSalon: { fontSize: 15, fontWeight: '700', color: t.text, textAlign: 'center' },
  successService: { fontSize: 13, color: t.subText, textAlign: 'center' },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  successMeta: { fontSize: 13, color: t.text },
  successBtn: { backgroundColor: '#7C3AED', borderRadius: 12, height: 48, width: '100%', alignItems: 'center', justifyContent: 'center' },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successBtnOutline: { borderWidth: 1.5, borderColor: t.border, borderRadius: 12, height: 48, width: '100%', alignItems: 'center', justifyContent: 'center' },
  successBtnOutlineText: { color: t.text, fontWeight: '600', fontSize: 15 },

  // Slot alert
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  alertCard: { backgroundColor: t.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center', gap: 12 },
  alertIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  alertText: { fontSize: 13, color: t.subText, textAlign: 'center', lineHeight: 20 },
  alertBtn: { backgroundColor: '#7C3AED', borderRadius: 12, height: 46, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  alertBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Packages tab
  pkgCard: { backgroundColor: t.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  pkgBuyBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  pkgBuyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' }
});
