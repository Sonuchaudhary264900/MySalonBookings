import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Share, RefreshControl, FlatList,
  Animated, Modal, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSalon } from '../../context/SalonContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const { width: SW, height: SH } = Dimensions.get('window');
const BANNER_H = Math.round(SW * 0.52);
const AVATAR_SIZE = 82;

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

const BIZ_THEME = {
  barbershop:    { p: '#6366f1', acc: '#818cf8', label: 'Barbershop' },
  salon:         { p: '#818cf8', acc: '#a5b4fc', label: 'Salon' },
  spa_wellness:  { p: '#8b5cf6', acc: '#a78bfa', label: 'Spa & Wellness' },
  makeup_bridal: { p: '#a78bfa', acc: '#c4b5fd', label: 'Makeup & Bridal' },
  skin_derma:    { p: '#6366f1', acc: '#818cf8', label: 'Skin & Derma' },
};
const DEFAULT_BIZ = { p: '#6366f1', acc: '#818cf8', label: 'Business' };

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
  const { theme, isDark } = useTheme();

  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('gallery');
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [expandedCat, setExpandedCat] = useState(null);
  const bannerTimer = useRef(null);

  const bizTheme = BIZ_THEME[salon?.businessType] || DEFAULT_BIZ;

  const photoUrls = galleryItems.filter(i => i.type === 'image').map(i => i.url).filter(Boolean);
  const videoUrls = galleryItems.filter(i => i.type === 'video').map(i => i.url).filter(Boolean);
  const bannerSlides = galleryItems.filter(i => i.url);

  const coverPhoto = salon?.profilePhoto || salon?.coverPhoto || photoUrls[0] || null;

  const avgRating = salon?.averageRating || salon?.rating
    ? parseFloat(salon.averageRating || salon.rating)
    : null;
  const openStatus  = isOpenNow(salon?.workingHours);
  const todayHours  = getTodayHours(salon?.workingHours);
  const opensAt     = getOpensAt(salon?.workingHours);

  const load = useCallback(async () => {
    if (!salon?._id) return;
    try {
      const [svcRes, revRes, galRes] = await Promise.all([
        api.get(`/public/salons/${salon._id}/services`).catch(() => ({ data: { data: [] } })),
        api.get(`/public/salons/${salon._id}/reviews`).catch(() => ({ data: { data: [] } })),
        api.get('/owner/gallery').catch(() => ({ data: { data: [] } })),
      ]);
      setServices(svcRes.data.data?.services || svcRes.data.data || []);
      setReviews(revRes.data.data?.reviews || revRes.data.data || []);
      const rawGallery = galRes.data.data || [];
      setGalleryItems(rawGallery.filter(i => i.url));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salon?._id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  // Auto-advance banner
  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % bannerSlides.length), 3500);
    return () => clearInterval(bannerTimer.current);
  }, [bannerSlides.length]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${salon?.name} on GlowLoox!` });
    } catch {}
  };

  // ── Tab: Gallery ──────────────────────────────────────────────────
  const renderGallery = () => {
    if (!photoUrls.length && !videoUrls.length) {
      return (
        <View style={s.emptyBox}>
          <Ionicons name="images-outline" size={40} color={bizTheme.acc} style={{ opacity: 0.4 }} />
          <Text style={[s.emptyTxt, { color: theme.subText }]}>No photos or videos yet</Text>
          <Text style={[s.emptyHint, { color: theme.subText }]}>Add photos from Gallery in the menu</Text>
        </View>
      );
    }
    const items = [...photoUrls.map(u => ({ url: u, type: 'image' })), ...videoUrls.map(u => ({ url: u, type: 'video' }))];
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 }}>
        {items.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => setLightboxIdx(i)}
            style={{ width: (SW - 8) / 3, height: (SW - 8) / 3, overflow: 'hidden', position: 'relative' }}>
            <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {item.type === 'video' && (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <Ionicons name="play-circle" size={28} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
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
      <View style={s.emptyBox}>
        <Ionicons name="cut-outline" size={40} color={bizTheme.acc} style={{ opacity: 0.4 }} />
        <Text style={[s.emptyTxt, { color: theme.subText }]}>No services added yet</Text>
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
          const minPrice = Math.min(...catServices.map(s => s.basePrice || s.price || 0));

          return (
            <View key={cat} style={[s.catBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
              {/* Category header */}
              <TouchableOpacity onPress={() => setExpandedCat(isOpen ? null : cat)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: bizTheme.p + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={icon} size={19} color={bizTheme.acc} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{cat}</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 1 }}>{catServices.length} service{catServices.length !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: bizTheme.acc, marginRight: 6 }}>from ₹{minPrice}+</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
              </TouchableOpacity>

              {/* Service rows */}
              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
                  {catServices.map((svc, i) => (
                    <View key={svc._id || i}
                      style={[s.svcRow, i < catServices.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }]}>
                      {svc.image && (
                        <Image source={{ uri: svc.image }} style={s.svcThumb} resizeMode="cover" />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[s.svcName, { color: theme.text }]}>{svc.name}</Text>
                        {svc.duration > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <Ionicons name="time-outline" size={10} color={theme.subText} />
                            <Text style={[s.svcDur, { color: theme.subText }]}>{svc.duration} min</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[s.svcPrice, { color: bizTheme.acc }]}>₹{svc.basePrice || svc.price || 0}</Text>
                        {/* "+ ADD" visual (customer sees this) */}
                        <View style={{ borderWidth: 1.5, borderColor: bizTheme.p, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: bizTheme.acc }}>+ ADD</Text>
                        </View>
                      </View>
                    </View>
                  ))}
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
        <Ionicons name="star-outline" size={40} color={bizTheme.acc} style={{ opacity: 0.4 }} />
        <Text style={[s.emptyTxt, { color: theme.subText }]}>No reviews yet</Text>
        <Text style={[s.emptyHint, { color: theme.subText }]}>Reviews from customers will appear here</Text>
      </View>
    );

    const totalRating = reviews.reduce((s, r) => s + (r.rating || 0), 0);
    const avgRev = reviews.length ? (totalRating / reviews.length).toFixed(1) : null;
    const dist = [5,4,3,2,1].map(n => ({ n, count: reviews.filter(r => Math.round(r.rating) === n).length }));

    return (
      <View style={{ padding: 12 }}>
        {/* Rating summary */}
        <View style={[s.revSummary, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
          <View style={{ alignItems: 'center', marginRight: 20 }}>
            <Text style={[s.bigRating, { color: theme.text }]}>{avgRev || '—'}</Text>
            {avgRev && <StarRow rating={parseFloat(avgRev)} />}
            <Text style={[s.revCount, { color: theme.subText }]}>{reviews.length} reviews</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {dist.map(({ n, count }) => {
              const pct = reviews.length ? count / reviews.length : 0;
              return (
                <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.starNum, { color: theme.subText }]}>{n}</Text>
                  <Ionicons name="star" size={10} color="#FDE68A" />
                  <View style={{ flex: 1, height: 5, borderRadius: 99, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 99, backgroundColor: bizTheme.p }} />
                  </View>
                  <Text style={[s.starNum, { color: theme.subText, width: 22 }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
        {/* Review cards */}
        <View style={{ gap: 10, marginTop: 10 }}>
          {reviews.map((rev, i) => (
            <View key={rev._id || i} style={[s.revCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <View style={[s.revAvatar, { backgroundColor: bizTheme.p + '33' }]}>
                  <Text style={[s.revAvatarTxt, { color: bizTheme.acc }]}>
                    {(rev.customerName || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.revName, { color: theme.text }]}>{rev.customerName || 'Customer'}</Text>
                  <StarRow rating={rev.rating || 0} size={11} />
                </View>
                <Text style={[s.revDate, { color: theme.subText }]}>
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                </Text>
              </View>
              {rev.comment ? (
                <Text style={[s.revComment, { color: isDark ? 'rgba(255,255,255,0.7)' : '#374151' }]} numberOfLines={4}>
                  {rev.comment}
                </Text>
              ) : null}
              {rev.serviceName ? (
                <View style={[s.revServiceTag, { backgroundColor: bizTheme.p + '18', borderColor: bizTheme.p + '33' }]}>
                  <Text style={[s.revServiceTxt, { color: bizTheme.acc }]}>{rev.serviceName}</Text>
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
        {/* Contact */}
        {(salon?.phone || salon?.email) && (
          <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
            <Text style={[s.infoCardTitle, { color: bizTheme.p }]}>Contact</Text>
            {salon?.phone && (
              <View style={s.infoRow}>
                <Ionicons name="call-outline" size={15} color={bizTheme.acc} />
                <Text style={[s.infoTxt, { color: theme.text }]}>{salon.phone}</Text>
              </View>
            )}
            {salon?.email && (
              <View style={s.infoRow}>
                <Ionicons name="mail-outline" size={15} color={bizTheme.acc} />
                <Text style={[s.infoTxt, { color: theme.text }]}>{salon.email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Location */}
        {(salon?.address || salon?.city) && (
          <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
            <Text style={[s.infoCardTitle, { color: bizTheme.p }]}>Location</Text>
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={15} color={bizTheme.acc} />
              <Text style={[s.infoTxt, { color: theme.text }]}>
                {[salon?.address, salon?.locality, salon?.city, salon?.state, salon?.pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* Working Hours */}
        {wh && (
          <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
            <Text style={[s.infoCardTitle, { color: bizTheme.p }]}>Working Hours</Text>
            {DAY_ORDER.map(day => {
              const h = wh[day];
              if (!h) return null;
              const isToday = WH_DAYS[new Date().getDay()] === day;
              return (
                <View key={day} style={[s.whRow, isToday && { backgroundColor: bizTheme.p + '18', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 }]}>
                  <Text style={[s.whDay, { color: isToday ? bizTheme.acc : theme.text, fontWeight: isToday ? '700' : '400' }]}>{DAY_LABEL[day]}</Text>
                  <Text style={[s.whTime, { color: h.isClosed ? '#ef4444' : (isToday ? bizTheme.acc : theme.subText) }]}>
                    {h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Business type */}
        <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
          <Text style={[s.infoCardTitle, { color: bizTheme.p }]}>Business Type</Text>
          <View style={s.infoRow}>
            <Ionicons name="storefront-outline" size={15} color={bizTheme.acc} />
            <Text style={[s.infoTxt, { color: theme.text }]}>{bizTheme.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  const TABS = [
    { key: 'gallery',  label: 'Gallery',  icon: 'images-outline' },
    { key: 'services', label: 'Services', icon: 'cut-outline' },
    { key: 'reviews',  label: 'Reviews',  icon: 'star-outline' },
    { key: 'info',     label: 'Info',     icon: 'information-circle-outline' },
  ];

  if (!salon) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Ionicons name="storefront-outline" size={48} color={theme.subText} style={{ opacity: 0.3 }} />
        <Text style={{ color: theme.subText, marginTop: 12, fontSize: 14 }}>No business profile yet</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={bizTheme.p} />}
        stickyHeaderIndices={[3]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── BANNER ── */}
        <View style={{ height: BANNER_H, backgroundColor: isDark ? '#1a0a2e' : '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
          {bannerSlides.length > 0 ? (
            <Image source={{ uri: bannerSlides[bannerIdx % bannerSlides.length]?.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bizTheme.p + '33', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="storefront" size={64} color={bizTheme.acc} style={{ opacity: 0.3 }} />
            </View>
          )}
          <View style={[StyleSheet.absoluteFill, { background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)' }]} />

          {/* Slide dots */}
          {bannerSlides.length > 1 && (
            <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 4 }}>
              {bannerSlides.map((_, i) => (
                <View key={i} style={{ width: i === bannerIdx ? 16 : 5, height: 5, borderRadius: 99, backgroundColor: i === bannerIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </View>
          )}

          {/* Preview badge */}
          <View style={[s.previewBadge, { top: (insets.top || 12) + 8 }]}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={s.previewTxt}>Customer View</Text>
          </View>

          {/* Share */}
          <TouchableOpacity onPress={handleShare} style={[s.shareBtn, { top: (insets.top || 12) + 8 }]}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── AVATAR + STATS ROW ── */}
        <View style={{ paddingHorizontal: 16, marginTop: -AVATAR_SIZE / 2, zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Avatar */}
            <View style={[s.avatar, { borderColor: bizTheme.p, shadowColor: bizTheme.p, backgroundColor: isDark ? '#1a0a2e' : '#fff' }]}>
              {coverPhoto
                ? <Image source={{ uri: coverPhoto }} style={{ width: '100%', height: '100%', borderRadius: 999 }} resizeMode="cover" />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bizTheme.p + '22' }}>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: bizTheme.acc }}>{(salon.name || 'B').charAt(0)}</Text>
                  </View>
              }
            </View>
            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 20, paddingBottom: 4 }}>
              {[
                { val: services.length || 0, label: 'Services' },
                { val: salon.totalBookings >= 1000 ? `${(salon.totalBookings / 1000).toFixed(1)}k` : (salon.totalBookings || 0), label: 'Customers' },
                { val: salon.followersCount || 0, label: 'Followers' },
              ].map(({ val, label }) => (
                <View key={label} style={{ alignItems: 'center' }}>
                  <Text style={[s.statVal, { color: theme.text }]}>{val}</Text>
                  <Text style={[s.statLabel, { color: theme.subText }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Name + badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={[s.salonName, { color: theme.text }]}>{salon.name}</Text>
            {avgRating >= 4.5 && <Ionicons name="checkmark-circle" size={17} color={bizTheme.p} />}
          </View>

          {/* Business type chip */}
          <View style={[s.bizChip, { backgroundColor: bizTheme.p + '22', borderColor: bizTheme.p + '44' }]}>
            <Ionicons name="storefront-outline" size={11} color={bizTheme.acc} />
            <Text style={[s.bizChipTxt, { color: bizTheme.acc }]}>{bizTheme.label}</Text>
          </View>

          {/* Tagline */}
          {salon.tagline ? <Text style={[s.tagline, { color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }]}>{salon.tagline}</Text> : null}

          {/* Location + Open status */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 10 }}>
            {(salon.locality || salon.city) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="location-outline" size={12} color={theme.subText} />
                <Text style={[s.metaTxt, { color: theme.subText }]}>
                  {salon.locality && salon.city ? `${salon.locality}, ${salon.city}` : salon.locality || salon.city}
                </Text>
              </View>
            )}
            {salon?.workingHours && (
              <View style={[s.openBadge, {
                backgroundColor: openStatus ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                borderColor: openStatus ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
              }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: openStatus ? '#4ADE80' : '#F87171' }} />
                <Text style={[s.openTxt, { color: openStatus ? '#4ADE80' : '#F87171' }]}>
                  {openStatus ? `Open · ${todayHours || ''}` : opensAt ? `Opens ${opensAt}` : 'Closed today'}
                </Text>
              </View>
            )}
          </View>

          {/* Rating row */}
          {avgRating && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <StarRow rating={avgRating} />
              <Text style={[s.ratingNum, { color: '#FDE68A' }]}>{avgRating.toFixed(1)}</Text>
              <Text style={[s.ratingCount, { color: theme.subText }]}>({reviews.length})</Text>
            </View>
          )}
        </View>

        {/* ── DIVIDER ── */}
        <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', marginHorizontal: 0 }} />

        {/* ── STICKY TAB BAR ── */}
        <View style={[s.tabBar, { backgroundColor: isDark ? 'rgba(13,5,32,0.96)' : 'rgba(255,255,255,0.97)', borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={s.tabBtn} activeOpacity={0.7}>
              <Ionicons name={activeTab === tab.key ? tab.icon.replace('-outline', '') : tab.icon} size={20} color={activeTab === tab.key ? bizTheme.p : theme.subText} />
              <Text style={[s.tabLabel, { color: activeTab === tab.key ? bizTheme.p : theme.subText, fontWeight: activeTab === tab.key ? '700' : '400' }]}>{tab.label}</Text>
              {activeTab === tab.key && <View style={[s.tabIndicator, { backgroundColor: bizTheme.p }]} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB CONTENT ── */}
        <View style={{ minHeight: 300, paddingBottom: 32 }}>
          {activeTab === 'gallery'  && renderGallery()}
          {activeTab === 'services' && renderServices()}
          {activeTab === 'reviews'  && renderReviews()}
          {activeTab === 'info'     && renderInfo()}
        </View>
      </ScrollView>

      {/* ── LIGHTBOX ── */}
      <Modal visible={lightboxIdx !== null} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}>
          {lightboxIdx !== null && photoUrls[lightboxIdx] && (
            <Image source={{ uri: photoUrls[lightboxIdx] }} style={{ width: SW, height: SH * 0.75 }} resizeMode="contain" />
          )}
          <TouchableOpacity onPress={() => setLightboxIdx(null)} style={s.lightboxClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {photoUrls.length > 1 && lightboxIdx !== null && (
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setLightboxIdx(i => (i - 1 + photoUrls.length) % photoUrls.length)} style={s.lightboxNav}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, alignSelf: 'center' }}>{lightboxIdx + 1} / {photoUrls.length}</Text>
              <TouchableOpacity onPress={() => setLightboxIdx(i => (i + 1) % photoUrls.length)} style={s.lightboxNav}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  previewBadge: {
    position: 'absolute', left: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  previewTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  shareBtn: {
    position: 'absolute', right: 12,
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },

  statVal:   { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  statLabel: { fontSize: 11, textAlign: 'center', marginTop: 2 },

  salonName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  bizChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, marginTop: 5,
  },
  bizChipTxt: { fontSize: 11, fontWeight: '600' },
  tagline:   { fontSize: 12, marginTop: 6, lineHeight: 18 },
  metaTxt:   { fontSize: 12 },
  openBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  openTxt:   { fontSize: 11, fontWeight: '600' },
  ratingNum: { fontSize: 14, fontWeight: '800' },
  ratingCount: { fontSize: 11 },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 2, position: 'relative',
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.3 },
  tabIndicator: { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2, borderRadius: 1 },

  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 12, opacity: 0.6, textAlign: 'center' },

  catBlock:  { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  catLabel:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', padding: 10, paddingBottom: 6 },
  svcRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  svcThumb:  { width: 44, height: 44, borderRadius: 10, flexShrink: 0 },
  svcName:   { fontSize: 14, fontWeight: '500' },
  svcDur:    { fontSize: 11, marginTop: 2 },
  svcPrice:  { fontSize: 15, fontWeight: '800' },

  revSummary: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4 },
  bigRating: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  revCount:  { fontSize: 11, marginTop: 4 },
  starNum:   { fontSize: 11, width: 10, textAlign: 'right' },
  revCard:   { borderRadius: 12, borderWidth: 1, padding: 12 },
  revAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  revAvatarTxt: { fontSize: 16, fontWeight: '900' },
  revName:   { fontSize: 13, fontWeight: '700' },
  revDate:   { fontSize: 11 },
  revComment: { fontSize: 13, lineHeight: 19 },
  revServiceTag: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  revServiceTxt: { fontSize: 11, fontWeight: '600' },

  infoCard:      { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  infoCardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoTxt:       { fontSize: 13, flex: 1, lineHeight: 18 },
  whRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  whDay:         { fontSize: 13, width: 36 },
  whTime:        { fontSize: 13 },

  lightboxClose: { position: 'absolute', top: 48, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  lightboxNav:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
