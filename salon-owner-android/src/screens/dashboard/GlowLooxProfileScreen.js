import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Share, RefreshControl,
  Animated, Modal, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSalon } from '../../context/SalonContext';
import { showSuccess, showError, showInfo } from '../../utils/toast';
import api from '../../services/api';

const { width: SW, height: SH } = Dimensions.get('window');
const BANNER_H = Math.min(Math.round(SW * 0.52), 220);
const AVATAR_SIZE = 72;

// This screen previews the salon exactly as customers see it on
// glowloox.com/salon/:id — always dark, same layout, same copy.
const DM = {
  bg:    '#0D0520',
  card:  'rgba(255,255,255,0.04)',
  card2: '#1A0F2E',
  border:'rgba(255,255,255,0.08)',
  fg:    '#F9FAFB',
  fg60:  'rgba(255,255,255,0.60)',
  fg45:  'rgba(255,255,255,0.45)',
  fg38:  'rgba(255,255,255,0.38)',
  p:     '#7C3AED',
  acc:   '#A78BFA',
};

// Photos can be plain URL strings or {url, publicId, isCover} objects —
// never hand an object to <Image>, it hard-crashes Fabric.
const urlOf = (x) => (typeof x === 'string' ? x : x?.url || x?.secure_url || null);

const WH_DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const isOpenNow = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
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

const fmt12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABEL = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

function StarRow({ rating, size = 13 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i}
          name={i <= full ? 'star' : (i === full + 1 && half ? 'star-half' : 'star-outline')}
          size={size} color="#FDE68A" />
      ))}
    </View>
  );
}

function SkeletonBox({ w, h, r = 6, style }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: '#2a1a4a', opacity: anim }, style]} />
  );
}

export default function GlowLooxProfileScreen() {
  const insets = useSafeAreaInsets();
  const { salon } = useSalon();

  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [catalogImgMap, setCatalogImgMap] = useState({});
  const [todaySlots, setTodaySlots] = useState(null); // {slots, blockedSlots, closedDay}
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('services'); // web default tab
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [expandedCat, setExpandedCat] = useState(null);
  const bannerTimer = useRef(null);

  const photoUrls = galleryItems.filter(i => i.type === 'image').map(i => urlOf(i.url) || urlOf(i)).filter(Boolean);
  const bannerSlides = galleryItems.map(i => ({ ...i, url: urlOf(i.url) || urlOf(i) })).filter(i => i.url);

  const avatarPhoto = urlOf(salon?.profilePhoto) || urlOf(salon?.logo) || urlOf(salon?.coverPhoto) || photoUrls[0] || null;

  const avgRating = salon?.averageRating || salon?.rating
    ? parseFloat(salon.averageRating || salon.rating)
    : null;
  const openStatus  = isOpenNow(salon?.workingHours);
  const todayHours  = getTodayHours(salon?.workingHours);
  const opensAt     = getOpensAt(salon?.workingHours);

  const load = useCallback(async () => {
    if (!salon?._id) return;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [svcRes, revRes, galRes, catRes, slotRes] = await Promise.all([
        api.get(`/public/salons/${salon._id}/services`).catch(() => ({ data: { data: [] } })),
        api.get(`/public/salons/${salon._id}/reviews`).catch(() => ({ data: { data: [] } })),
        api.get('/owner/gallery').catch(() => ({ data: { data: [] } })),
        api.get('/owner/catalog').catch(() => ({ data: { data: [] } })),
        api.get(`/public/salons/${salon._id}/booked-slots?date=${todayStr}&duration=30`).catch(() => ({ data: { data: { slots: [], blockedSlots: [], closedDay: true } } })),
      ]);
      setServices(svcRes.data.data?.services || svcRes.data.data || []);
      setReviews(revRes.data.data?.reviews || revRes.data.data || []);
      const rawGallery = galRes.data.data || [];
      setGalleryItems(rawGallery.filter(i => urlOf(i.url) || urlOf(i)));
      setTodaySlots(slotRes.data.data || null);
      const cats = catRes.data.data?.categories || catRes.data.data || [];
      const map = {};
      (Array.isArray(cats) ? cats : []).forEach(c => {
        const details = c.serviceDetails || {};
        const inner = {};
        Object.keys(details).forEach(name => {
          const img = urlOf(details[name]?.defaultImage) || urlOf(details[name]?.image);
          if (img) inner[name] = img;
        });
        if (Object.keys(inner).length) map[c.label || c.name] = inner;
      });
      setCatalogImgMap(map);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salon?._id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % bannerSlides.length), 3500);
    return () => clearInterval(bannerTimer.current);
  }, [bannerSlides.length]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${salon?.name} on GlowLoox! https://glowloox.com/salon/${salon?._id}` });
    } catch {}
  };

  const handleDeleteGallery = (item) => {
    if (!item?._id) return;
    Alert.alert('Delete this item?', 'It will be removed from your gallery.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/gallery/${item._id}`);
            setGalleryItems(prev => prev.filter(g => g._id !== item._id));
            setLightboxIdx(null);
            showSuccess('Deleted', 'Removed from gallery');
          } catch (err) {
            showError('Failed', err.response?.data?.message || 'Could not delete');
          }
        },
      },
    ]);
  };

  // ── Tab: Photos (gallery) ─────────────────────────────────────────
  const renderPhotos = () => {
    if (!bannerSlides.length) {
      return (
        <View style={s.emptyBox}>
          <Ionicons name="images-outline" size={40} color={DM.acc} style={{ opacity: 0.4 }} />
          <Text style={s.emptyTxt}>No photos or videos yet</Text>
          <Text style={s.emptyHint}>Add photos from Gallery in the menu</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={s.galleryHint}>Long-press a photo to delete it</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, padding: 3 }}>
          {bannerSlides.map((item, i) => (
            <TouchableOpacity key={item._id || i}
              onPress={() => setLightboxIdx(i)}
              onLongPress={() => handleDeleteGallery(item)}
              delayLongPress={300}
              style={{ width: (SW - 9) / 2, height: (SW - 9) / 2, overflow: 'hidden', position: 'relative' }}>
              <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              {item.type === 'video' && (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                  <Ionicons name="play-circle" size={30} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ── Tab: Services ─────────────────────────────────────────────────
  const CAT_ICON_MAP = {
    'Hair Services': 'cut-outline', 'Hair Services (Men)': 'cut-outline', 'Hair Services (Women)': 'cut-outline',
    'Beard & Grooming': 'man-outline', 'Nail Services': 'color-palette-outline',
    'Skin & Face / Beauty': 'sparkles-outline', 'Skin & Face (Men Grooming)': 'sparkles-outline',
    'Skin & Beauty': 'sparkles-outline', 'Face & Skin': 'sparkles-outline',
    'Spa & Massage': 'fitness-outline', 'Spa & Relaxation': 'fitness-outline',
    'Body Grooming': 'body-outline', 'Men Dermatology': 'medkit-outline',
    'Women Dermatology': 'medkit-outline', 'Bridal & Events': 'heart-outline',
    'Kids Services': 'people-outline', 'At-Home Services': 'home-outline',
  };

  const CATEGORY_ORDER = [
    'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
    'Beard & Grooming', 'Nail Services',
    'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
    'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
    'Men Dermatology', 'Women Dermatology',
    'Bridal & Events', 'Kids Services', 'At-Home Services',
  ];

  const renderServices = () => {
    if (loading) return (
      <View style={{ padding: 16, gap: 12 }}>
        {[1,2,3,4].map(i => <SkeletonBox key={i} w="100%" h={72} r={12} />)}
      </View>
    );
    if (!services.length) return (
      // Same empty state customers see on the website
      <View style={s.svcEmptyBox}>
        <Ionicons name="cut-outline" size={40} color={DM.acc} />
        <Text style={s.svcEmptyTitle}>Services coming soon</Text>
        <Text style={s.svcEmptyHint}>This salon is setting up their menu. Check back shortly or contact them directly.</Text>
      </View>
    );

    const grouped = services.reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});

    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });

    return (
      <View style={{ padding: 12, gap: 8 }}>
        {sortedEntries.map(([cat, catServices]) => {
          const icon = CAT_ICON_MAP[cat] || 'storefront-outline';
          const isOpen = expandedCat === cat;
          const minPrice = Math.min(...catServices.map(x => x.basePrice || x.price || 0));

          return (
            <View key={cat} style={s.catBlock}>
              <TouchableOpacity onPress={() => setExpandedCat(isOpen ? null : cat)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: DM.p + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={icon} size={19} color={DM.acc} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: DM.fg }}>{cat}</Text>
                  <Text style={{ fontSize: 11, color: DM.fg45, marginTop: 1 }}>{catServices.length} service{catServices.length !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: DM.acc, marginRight: 6 }}>from ₹{minPrice}+</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={DM.fg45} />
              </TouchableOpacity>

              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: DM.border }}>
                  {catServices.map((svc, i) => {
                    const thumb = urlOf(svc.image) || urlOf(svc.photos?.[0]) || catalogImgMap[cat]?.[svc.name];
                    return (
                    <View key={svc._id || i}
                      style={[s.svcRow, i < catServices.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={s.svcThumb} resizeMode="cover" />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Text style={s.svcName}>{svc.name}</Text>
                        {svc.duration > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <Ionicons name="time-outline" size={10} color={DM.fg45} />
                            <Text style={s.svcDur}>{svc.duration} min</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.svcPrice}>₹{svc.basePrice || svc.price || 0}</Text>
                        <View style={{ borderWidth: 1.5, borderColor: DM.p, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: DM.acc }}>+ ADD</Text>
                        </View>
                      </View>
                    </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ── Tab: Reviews ──────────────────────────────────────────────────
  const renderReviews = () => {
    if (loading) return (
      <View style={{ padding: 16, gap: 12 }}>
        {[1,2,3].map(i => <SkeletonBox key={i} w="100%" h={96} r={12} />)}
      </View>
    );
    if (!reviews.length) return (
      <View style={s.emptyBox}>
        <Ionicons name="star-outline" size={40} color={DM.acc} style={{ opacity: 0.4 }} />
        <Text style={s.emptyTxt}>No reviews yet</Text>
        <Text style={s.emptyHint}>Reviews from customers will appear here</Text>
      </View>
    );

    const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const avgRev = reviews.length ? (totalRating / reviews.length).toFixed(1) : null;
    const dist = [5,4,3,2,1].map(n => ({ n, count: reviews.filter(r => Math.round(r.rating) === n).length }));

    return (
      <View style={{ padding: 12 }}>
        <View style={s.revSummary}>
          <View style={{ alignItems: 'center', marginRight: 20 }}>
            <Text style={s.bigRating}>{avgRev || '—'}</Text>
            {avgRev && <StarRow rating={parseFloat(avgRev)} />}
            <Text style={s.revCount}>{reviews.length} reviews</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {dist.map(({ n, count }) => {
              const pct = reviews.length ? count / reviews.length : 0;
              return (
                <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.starNum}>{n}</Text>
                  <Ionicons name="star" size={10} color="#FDE68A" />
                  <View style={{ flex: 1, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 99, backgroundColor: DM.p }} />
                  </View>
                  <Text style={[s.starNum, { width: 22 }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 10 }}>
          {reviews.map((rev, i) => (
            <View key={rev._id || i} style={s.revCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <View style={s.revAvatar}>
                  <Text style={s.revAvatarTxt}>
                    {(rev.customerName || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.revName}>{rev.customerName || 'Customer'}</Text>
                  <StarRow rating={rev.rating || 0} size={11} />
                </View>
                <Text style={s.revDate}>
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                </Text>
              </View>
              {rev.comment ? (
                <Text style={s.revComment} numberOfLines={4}>{rev.comment}</Text>
              ) : null}
              {rev.serviceName ? (
                <View style={s.revServiceTag}>
                  <Text style={s.revServiceTxt}>{rev.serviceName}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Tab: Info ─────────────────────────────────────────────────────
  const renderInfo = () => {
    const wh = salon?.workingHours;
    return (
      <View style={{ padding: 12, gap: 10 }}>
        {(salon?.phone || salon?.email) && (
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Contact</Text>
            {salon?.phone && (
              <View style={s.infoRow}>
                <Ionicons name="call-outline" size={15} color={DM.acc} />
                <Text style={s.infoTxt}>{salon.phone}</Text>
              </View>
            )}
            {salon?.email && (
              <View style={s.infoRow}>
                <Ionicons name="mail-outline" size={15} color={DM.acc} />
                <Text style={s.infoTxt}>{salon.email}</Text>
              </View>
            )}
          </View>
        )}

        {(salon?.address || salon?.city) && (
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Location</Text>
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={15} color={DM.acc} />
              <Text style={s.infoTxt}>
                {[salon?.address, salon?.locality, salon?.city, salon?.state, salon?.pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {wh && (
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Working Hours</Text>
            {DAY_ORDER.map(day => {
              const h = wh[day];
              if (!h) return null;
              const isToday = WH_DAYS[new Date().getDay()] === day;
              return (
                <View key={day} style={[s.whRow, isToday && { backgroundColor: DM.p + '18', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 }]}>
                  <Text style={[s.whDay, { color: isToday ? DM.acc : DM.fg, fontWeight: isToday ? '700' : '400' }]}>{DAY_LABEL[day]}</Text>
                  <Text style={[s.whTime, { color: h.isClosed ? '#ef4444' : (isToday ? DM.acc : DM.fg45) }]}>
                    {h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ── Availability strip (same as web) ──────────────────────────────
  const renderAvailabilityStrip = () => {
    if (!todaySlots) return null;
    if (todaySlots.closedDay) return (
      <View style={s.availStrip}>
        <Ionicons name="time-outline" size={13} color={DM.fg38} />
        <Text style={s.availMuted}>Closed today</Text>
      </View>
    );
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const avail = (todaySlots.slots || []).filter(t =>
      !(todaySlots.blockedSlots || []).includes(t) && toMin(t) > nowMin
    ).slice(0, 8);
    if (avail.length === 0) return (
      <View style={s.availStrip}>
        <Ionicons name="calendar-outline" size={13} color={DM.fg38} />
        <Text style={s.availMuted}>Fully booked today — check back tomorrow</Text>
      </View>
    );
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DM.p + '12' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="flash-outline" size={12} color="#10b981" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>Next available: Today {fmt12(avail[0])}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {avail.map(t => (
            <View key={t} style={s.slotChip}>
              <Text style={s.slotChipTxt}>{fmt12(t)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const TABS = [
    { key: 'services', label: 'SERVICES' },
    { key: 'photos',   label: 'PHOTOS' },
    { key: 'reviews',  label: 'REVIEWS' },
    { key: 'info',     label: 'INFO' },
  ];

  if (!salon) {
    return (
      <View style={[s.center, { backgroundColor: DM.bg }]}>
        <Ionicons name="storefront-outline" size={48} color={DM.fg45} style={{ opacity: 0.3 }} />
        <Text style={{ color: DM.fg45, marginTop: 12, fontSize: 14 }}>No business profile yet</Text>
      </View>
    );
  }

  const locality = salon.locality || '';

  return (
    <View style={[s.root, { backgroundColor: DM.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* NOTE: no stickyHeaderIndices — on Fabric (new arch) the sticky wrapper
          drops the child's flexDirection and the tab bar renders vertically */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DM.p} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── A. BANNER ── */}
        <View style={{ height: BANNER_H, backgroundColor: DM.card2, overflow: 'hidden', position: 'relative' }}>
          {bannerSlides.length > 0 ? (
            <Image source={{ uri: bannerSlides[bannerIdx % bannerSlides.length]?.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: DM.p + '30', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="storefront" size={64} color={DM.acc} style={{ opacity: 0.3 }} />
            </View>
          )}
          {/* Bottom fade into page bg — same as web gradient */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BANNER_H * 0.55, backgroundColor: 'transparent' }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(13,5,32,0.35)' }} />
            <View style={{ height: 34, backgroundColor: 'rgba(13,5,32,0.75)' }} />
            <View style={{ height: 14, backgroundColor: DM.bg }} />
          </View>

          {bannerSlides.length > 1 && (
            <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 4 }}>
              {bannerSlides.map((_, i) => (
                <View key={i} style={{ width: i === bannerIdx ? 16 : 5, height: 5, borderRadius: 99, backgroundColor: i === bannerIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </View>
          )}

          <View style={[s.previewBadge, { top: (insets.top || 12) + 8 }]}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={s.previewTxt}>Customer View</Text>
          </View>

          <TouchableOpacity onPress={handleShare} style={[s.shareTopBtn, { top: (insets.top || 12) + 8 }]}>
            <Ionicons name="share-social-outline" size={17} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── B. PROFILE INFO (matches web mobile layout) ── */}
        <View style={{ paddingHorizontal: 16, marginTop: -28, zIndex: 10 }}>
          {/* Avatar left + Book button right */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={s.avatar}>
              {avatarPhoto
                ? <Image source={{ uri: avatarPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,58,237,0.2)' }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: DM.acc }}>{(salon.name || 'S').charAt(0)}</Text>
                  </View>
              }
            </View>
            <TouchableOpacity
              style={s.bookBtn}
              activeOpacity={0.85}
              onPress={() => showInfo('Customer preview', 'This is the button customers tap to book you')}
            >
              <Ionicons name="flash" size={14} color="#fff" />
              <Text style={s.bookBtnTxt}>Book Your Look</Text>
              <Ionicons name="sparkles" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Name + badge + rating */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <Text style={s.salonName}>{salon.name}</Text>
            {avgRating >= 4.5 && <Ionicons name="checkmark-circle" size={17} color={DM.p} />}
            {avgRating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                <Ionicons name="star" size={12} color="#FDE68A" />
                <Text style={{ fontWeight: '700', fontSize: 12, color: '#FDE68A' }}>{avgRating.toFixed(1)}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(253,230,138,0.5)' }}>({reviews.length})</Text>
              </View>
            ) : null}
          </View>

          {salon.tagline ? <Text style={s.tagline}>{salon.tagline}</Text> : null}

          {/* Location + Open chip */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {(locality || salon.city) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="location-outline" size={11} color={DM.fg45} />
                <Text style={{ fontSize: 11, color: DM.fg45 }}>
                  {locality && salon.city ? `${locality}, ${salon.city}` : locality || salon.city}
                </Text>
              </View>
            ) : null}
            {salon?.workingHours && (
              <View style={[s.openBadge, {
                backgroundColor: openStatus ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: openStatus ? '#4ADE80' : '#F87171' }} />
                <Text style={[s.openTxt, { color: openStatus ? '#4ADE80' : '#F87171' }]}>
                  {openStatus ? `Open · ${todayHours || ''}` : opensAt ? `Opens ${opensAt}` : 'Closed'}
                </Text>
              </View>
            )}
          </View>

          {/* Follow + Share ghost buttons — same as web */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 16 }}>
            <TouchableOpacity
              style={s.ghostBtn}
              activeOpacity={0.8}
              onPress={() => showInfo('Customer preview', 'Customers tap this to follow your salon')}
            >
              <Ionicons name="heart-outline" size={14} color={DM.acc} />
              <Text style={s.ghostBtnTxt}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} activeOpacity={0.8} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={14} color={DM.acc} />
              <Text style={s.ghostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── C. TODAY'S AVAILABILITY STRIP ── */}
        <View>{renderAvailabilityStrip()}</View>

        {/* ── spacer keeps sticky index stable ── */}
        <View style={{ height: 0 }} />

        {/* ── D. STICKY TAB BAR (uppercase text tabs like web) ── */}
        <View style={s.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={s.tabBtn} activeOpacity={0.7}>
              <Text style={[s.tabLabel, { color: activeTab === tab.key ? DM.acc : DM.fg38 }]}>{tab.label}</Text>
              {activeTab === tab.key && <View style={s.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── E. TAB CONTENT ── */}
        <View style={{ minHeight: 300, paddingBottom: 32 }}>
          {activeTab === 'services' && renderServices()}
          {activeTab === 'photos'   && renderPhotos()}
          {activeTab === 'reviews'  && renderReviews()}
          {activeTab === 'info'     && renderInfo()}
        </View>
      </ScrollView>

      {/* ── LIGHTBOX ── */}
      <Modal visible={lightboxIdx !== null} transparent animationType="fade" statusBarTranslucent>
        {(() => {
          const cur = lightboxIdx !== null ? bannerSlides[lightboxIdx] : null;
          return (
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}>
              {cur && (
                <Image source={{ uri: cur.url }} style={{ width: SW, height: SH * 0.75 }} resizeMode="contain" />
              )}
              <TouchableOpacity onPress={() => setLightboxIdx(null)} style={s.lightboxClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              {cur && (
                <TouchableOpacity onPress={() => handleDeleteGallery(cur)} style={s.lightboxDelete}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              {bannerSlides.length > 1 && lightboxIdx !== null && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
                  <TouchableOpacity onPress={() => setLightboxIdx(i => (i - 1 + bannerSlides.length) % bannerSlides.length)} style={s.lightboxNav}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                  </TouchableOpacity>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, alignSelf: 'center' }}>{lightboxIdx + 1} / {bannerSlides.length}</Text>
                  <TouchableOpacity onPress={() => setLightboxIdx(i => (i + 1) % bannerSlides.length)} style={s.lightboxNav}>
                    <Ionicons name="chevron-forward" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  galleryHint: { fontSize: 11, textAlign: 'center', paddingVertical: 8, color: 'rgba(255,255,255,0.38)' },
  lightboxDelete: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.7)', alignItems: 'center', justifyContent: 'center' },

  previewBadge: {
    position: 'absolute', left: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  previewTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  shareTopBtn: {
    position: 'absolute', right: 12,
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3, borderColor: '#7C3AED', overflow: 'hidden', backgroundColor: '#1A0F2E',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  bookBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  salonName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4, color: '#F9FAFB', lineHeight: 24 },
  tagline:   { fontSize: 12, marginTop: 4, lineHeight: 17, color: '#A78BFA' },
  openBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  openTxt:   { fontSize: 11, fontWeight: '600' },

  ghostBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.4)', borderRadius: 12, paddingVertical: 11,
  },
  ghostBtnTxt: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },

  availStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.07)' },
  availMuted: { fontSize: 12, color: 'rgba(255,255,255,0.38)' },
  slotChip:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.33)', backgroundColor: 'rgba(124,58,237,0.07)' },
  slotChipTxt:{ fontSize: 11, fontWeight: '700', color: '#A78BFA' },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.1)',
    backgroundColor: 'rgba(13,5,32,0.97)',
  },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, position: 'relative',
  },
  tabLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  tabIndicator: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, borderRadius: 1, backgroundColor: '#7C3AED' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  emptyHint: { fontSize: 12, opacity: 0.6, textAlign: 'center', color: 'rgba(255,255,255,0.45)' },

  // Web-matching "Services coming soon" dashed box
  svcEmptyBox: {
    margin: 20, paddingVertical: 44, paddingHorizontal: 24, alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.3)', borderStyle: 'dashed', borderRadius: 18,
  },
  svcEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#F9FAFB' },
  svcEmptyHint:  { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 19 },

  catBlock:  { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: 4 },
  svcRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  svcThumb:  { width: 44, height: 44, borderRadius: 10, flexShrink: 0 },
  svcName:   { fontSize: 14, fontWeight: '500', color: '#F9FAFB' },
  svcDur:    { fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.45)' },
  svcPrice:  { fontSize: 15, fontWeight: '800', color: '#A78BFA' },

  revSummary: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 14, marginBottom: 4 },
  bigRating: { fontSize: 40, fontWeight: '900', lineHeight: 46, color: '#F9FAFB' },
  revCount:  { fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.45)' },
  starNum:   { fontSize: 11, width: 10, textAlign: 'right', color: 'rgba(255,255,255,0.45)' },
  revCard:   { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12 },
  revAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,58,237,0.25)' },
  revAvatarTxt: { fontSize: 16, fontWeight: '900', color: '#A78BFA' },
  revName:   { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  revDate:   { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  revComment: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.7)' },
  revServiceTag: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.33)', backgroundColor: 'rgba(124,58,237,0.15)' },
  revServiceTxt: { fontSize: 11, fontWeight: '600', color: '#A78BFA' },

  infoCard:      { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, gap: 8 },
  infoCardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#7C3AED' },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoTxt:       { fontSize: 13, flex: 1, lineHeight: 18, color: '#F9FAFB' },
  whRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  whDay:         { fontSize: 13, width: 36 },
  whTime:        { fontSize: 13 },

  lightboxClose: { position: 'absolute', top: 48, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  lightboxNav:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
