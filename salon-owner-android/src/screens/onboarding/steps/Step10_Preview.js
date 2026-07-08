import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Animated, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalon } from '../../../context/SalonContext';
import { useAuth } from '../../../context/AuthContext';
import { useOnboarding } from '../../../context/OnboardingContext';

const { width: W } = Dimensions.get('window');

const BIZ_LABEL = { barbershop: 'Barbershop', salon: 'Salon', spa_wellness: 'Spa', makeup_bridal: 'Studio', skin_derma: 'Clinic' };
const getBizLabel = (type) => BIZ_LABEL[type] || 'Business';

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Build workingHours with lunch break — mirrors website useOnboardingSubmit
function buildWorkingHours({ workingDays, openTime, closeTime, lunchBreak, lunchStart, lunchEnd }) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const wh = {};
  days.forEach(d => {
    const isClosed = !workingDays.includes(d);
    const hasLunch = lunchBreak && !isClosed;
    wh[d] = {
      open:          isClosed ? '09:00' : openTime,
      close:         isClosed ? '21:00' : closeTime,
      isClosed,
      hasLunchBreak: hasLunch,
      lunchStart:    hasLunch ? lunchStart : null,
      lunchEnd:      hasLunch ? lunchEnd   : null,
    };
  });
  return wh;
}

// Same tips the website shows — services are added post-approval
const SERVICE_TIPS = [
  { icon: 'cut-outline',        color: '#a78bfa', title: 'Add services by category',       desc: 'Haircut, Beard, Colour, Spa — pick from templates or add custom ones in seconds.' },
  { icon: 'layers-outline',     color: '#f9a8d4', title: 'Create sub-service variants',     desc: 'E.g. "Haircut → Basic ₹150 · Premium ₹300 · Kid ₹100" — all under one category.' },
  { icon: 'cash-outline',       color: '#6ee7b7', title: 'Set prices & durations',          desc: 'Customers see exact prices & booking slots auto-calculate from durations you set.' },
  { icon: 'flash-outline',      color: '#fcd34d', title: 'Fast-fill with smart suggestions', desc: 'Dashboard shows popular services for your business type — one tap to add them all.' },
];

function Particle({ anim, color, startX, startY }) {
  const style = {
    position: 'absolute',
    left:  anim.interpolate({ inputRange: [0, 1], outputRange: [startX, startX + (Math.random() * 200 - 100)] }),
    top:   anim.interpolate({ inputRange: [0, 1], outputRange: [startY, startY + 400] }),
    opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
    transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) }],
  };
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }, style]} />;
}

function CelebrationOverlay({ bizLabel, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const confettiColors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    color: confettiColors[i % confettiColors.length],
    startX: Math.random() * W,
    startY: -20,
  }));

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: false }),
    ]).start(() => setTimeout(onDone, 800));
  }, []);

  return (
    <View style={cs.overlay}>
      {particles.map((p, i) => (
        <Particle key={i} anim={anim} color={p.color} startX={p.startX} startY={p.startY} />
      ))}
      <Animated.View style={[cs.card, { transform: [{ scale }] }]}>
        <View style={cs.iconCircle}>
          <Ionicons name="rocket" size={40} color="#a78bfa" />
        </View>
        <Text style={cs.headline}>{bizLabel} Registered!</Text>
        <Text style={cs.sub}>Your {bizLabel.toLowerCase()} is under review.{'\n'}We'll notify you when approved.</Text>
      </Animated.View>
    </View>
  );
}

export default function Step10_Preview() {
  const { createSalon } = useSalon();
  const { refreshUser, user } = useAuth();
  const {
    ownerName, businessType,
    salonName, servedGender, description,
    lat, lng, address, city, district, stateName, pincode,
    workingDays, openTime, closeTime, lunchBreak, lunchStart, lunchEnd,
    photos, videoUrl, businessLicenseUrl, businessRegUrl,
    goToStep,
  } = useOnboarding();

  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const bizLabel   = getBizLabel(businessType);
  const coverPhoto = photos.find(p => p.isCover)?.url || photos[0]?.url || '';

  // Same 6-item checklist as the website (step numbers map to our 7-step flow).
  // The `ok` conditions mirror the backend validator so a green checklist
  // guarantees the submit will pass (no surprise "check your input" error).
  const checks = [
    { label: `Your name — ${ownerName || user?.name || '—'}`,      ok: !!(ownerName || user?.name),                    step: 1 },
    { label: `Business type — ${bizLabel}`,                        ok: !!businessType,                                 step: 2 },
    { label: `${bizLabel} name — ${salonName || '—'}`,             ok: salonName.trim().length >= 3,                   step: 3 },
    { label: `Location — ${city || district || '—'}`,              ok: address.trim().length >= 5 && city.trim().length >= 2, step: 4 },
    { label: `Hours — ${formatTime12(openTime) || '—'}`,           ok: workingDays.length > 0,                         step: 5 },
    { label: `${photos.length} photo${photos.length !== 1 ? 's' : ''} added`, ok: photos.length > 0,                    step: 6 },
  ];

  const canSubmit = checks.every(c => c.ok);

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all sections before submitting.');
      return;
    }
    setLoading(true);
    try {
      const workingHours = buildWorkingHours({ workingDays, openTime, closeTime, lunchBreak, lunchStart, lunchEnd });

      // Payload mirrors website useOnboardingSubmit — services added post-approval
      const payload = {
        name:         salonName,
        phone:        user?.phone || '',
        email:        user?.email || null,
        address,
        city,
        district,
        state:        stateName,
        pincode,
        description,
        businessType: businessType || 'salon',
        servedGender: servedGender || 'unisex',
        workingHours,
        offeredCategories: [],
        photos: photos.map((p, i) => ({ url: p.url, publicId: p.publicId || '', isCover: Boolean(p.isCover) || i === 0 })),
        kidsHaircut:    false,
        atHomeServices: false,
      };
      if (videoUrl)           payload.videoUrl = videoUrl;
      if (businessLicenseUrl) payload.businessLicenseUrl = businessLicenseUrl;
      if (businessRegUrl)     payload.businessRegistrationUrl = businessRegUrl;
      if (lat && lng)         payload.location = { latitude: lat, longitude: lng };

      await createSalon(payload);
      setShowCelebration(true);
    } catch (e) {
      const status  = e?.response?.status;
      const data    = e?.response?.data;
      const msg     = data?.message || e?.message || 'Please try again.';
      // Owner already has THIS salon registered → treat as success (idempotent re-submit)
      if (status === 409 && msg.toLowerCase().includes('already have')) {
        setShowCelebration(true);
        return;
      }
      // Surface the exact backend validation reasons instead of the generic message,
      // and point the owner at the step that needs fixing.
      const details = Array.isArray(data?.errors) && data.errors.length
        ? data.errors.join('\n• ')
        : null;
      Alert.alert(
        'Submission Failed',
        details ? `• ${details}` : msg,
        [{ text: 'OK' }]
      );
    } finally { setLoading(false); }
  };

  if (showCelebration) {
    return <CelebrationOverlay bizLabel={bizLabel} onDone={() => refreshUser()} />;
  }

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>Here's your {bizLabel} on GlowLoox</Text>
      <Text style={s.sub}>Review everything before going live.</Text>

      {/* Mini profile preview — mirrors the customer app card */}
      <View style={s.previewCard}>
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={s.previewImg} />
        ) : (
          <View style={[s.previewImg, s.previewImgEmpty]}>
            <Ionicons name="cut-outline" size={32} color="#7c3aed" />
          </View>
        )}
        <View style={s.previewBody}>
          <Text style={s.previewName}>{salonName || 'Your Business'}</Text>
          <View style={s.badgeRow}>
            {!!servedGender && (
              <View style={s.genderBadge}>
                <Text style={s.genderText}>
                  {servedGender === 'male' ? 'Men' : servedGender === 'female' ? 'Women' : 'Unisex'}
                </Text>
              </View>
            )}
            <View style={s.newBadge}>
              <Ionicons name="star" size={9} color="#fcd34d" />
              <Text style={s.newBadgeText}> New</Text>
            </View>
          </View>
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={12} color="#94a3b8" />
            <Text style={s.metaText}>{[district, city, stateName].filter(Boolean).join(', ') || 'Location set'}</Text>
          </View>
          <View style={s.metaRow}>
            <Ionicons name="time-outline" size={12} color="#94a3b8" />
            <Text style={s.metaText}>{formatTime12(openTime)} – {formatTime12(closeTime)} · {workingDays.length} days</Text>
          </View>
          <View style={s.servicesPlaceholder}>
            <Ionicons name="sparkles-outline" size={11} color="#a78bfa" />
            <Text style={s.servicesPlaceholderText}> Services added after approval</Text>
          </View>
          <View style={s.bookPill}><Text style={s.bookPillText}>Book Now</Text></View>
        </View>
      </View>

      {/* Checklist */}
      <Text style={s.checklistTitle}>COMPLETION CHECKLIST</Text>
      {checks.map(c => (
        <View key={c.label} style={s.checkRow}>
          {c.ok ? (
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          ) : (
            <View style={s.checkPending} />
          )}
          <Text style={[s.checkLabel, c.ok && s.checkLabelOk]} numberOfLines={1}>{c.label}</Text>
          <TouchableOpacity onPress={() => goToStep(c.step)} style={s.editBtn}>
            <Ionicons name="pencil-outline" size={10} color="#a78bfa" />
            <Text style={s.editText}> Edit</Text>
          </TouchableOpacity>
        </View>
      ))}

      {!!description && (
        <View style={s.descCard}>
          <Text style={s.descText}>"{description.slice(0, 100)}{description.length > 100 ? '…' : ''}"</Text>
        </View>
      )}

      {/* Services setup guide — same as website */}
      <View style={s.tipsCard}>
        <View style={s.tipsHeader}>
          <View style={s.tipsHeaderIcon}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.tipsTitle}>Add services right after approval</Text>
            <Text style={s.tipsSub}>Here's how to make it fast and complete in your dashboard</Text>
          </View>
        </View>
        {SERVICE_TIPS.map(tip => (
          <View key={tip.title} style={s.tipRow}>
            <View style={[s.tipIcon, { backgroundColor: `${tip.color}1f` }]}>
              <Ionicons name={tip.icon} size={15} color={tip.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tipTitle}>{tip.title}</Text>
              <Text style={s.tipDesc}>{tip.desc}</Text>
            </View>
          </View>
        ))}
        <View style={s.tipsFooter}>
          <Ionicons name="checkmark-circle" size={14} color="#10b981" />
          <Text style={s.tipsFooterText}>Services, pricing & sub-variants are all editable anytime from your dashboard — no rush now.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.btn, (!canSubmit || loading) && s.btnOff]}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
        activeOpacity={0.88}
      >
        {loading
          ? <>
              <ActivityIndicator color="#fff" />
              <Text style={s.btnText}>Setting up your {bizLabel.toLowerCase()}...</Text>
            </>
          : <>
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={s.btnText}>Submit My {bizLabel}</Text>
            </>
        }
      </TouchableOpacity>
      <Text style={s.note}>Our team reviews businesses within 24–48 hours</Text>
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,7,26,0.95)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  card:       { backgroundColor: '#0f0f2b', borderRadius: 24, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)', maxWidth: 300 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headline:   { fontSize: 24, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', marginBottom: 10 },
  sub:        { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
});

const s = StyleSheet.create({
  scroll:         { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 40 },
  title:          { fontSize: 24, fontWeight: '900', color: '#f1f5f9', marginBottom: 6, letterSpacing: -0.5 },
  sub:            { fontSize: 14, color: '#94a3b8', marginBottom: 20 },

  previewCard:    { backgroundColor: '#0d0d22', borderRadius: 24, overflow: 'hidden', marginBottom: 22, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  previewImg:     { width: '100%', height: 140, resizeMode: 'cover' },
  previewImgEmpty:{ backgroundColor: '#1e1250', alignItems: 'center', justifyContent: 'center' },
  previewBody:    { padding: 14, gap: 8 },
  previewName:    { fontSize: 18, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.3 },
  badgeRow:       { flexDirection: 'row', gap: 6 },
  genderBadge:    { backgroundColor: 'rgba(139,92,246,0.22)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  genderText:     { fontSize: 10, color: '#c4b5fd', fontWeight: '700' },
  newBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(234,179,8,0.18)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.35)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeText:   { fontSize: 10, color: '#fcd34d', fontWeight: '700' },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:       { fontSize: 11, color: '#94a3b8', flex: 1 },
  servicesPlaceholder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.45)', borderStyle: 'dashed' },
  servicesPlaceholderText: { fontSize: 10, color: '#a78bfa', fontWeight: '700' },
  bookPill:       { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  bookPillText:   { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  checklistTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1, marginBottom: 10 },
  checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  checkPending:   { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#f87171' },
  checkLabel:     { flex: 1, fontSize: 13, color: '#f87171', fontWeight: '600' },
  checkLabelOk:   { color: '#e2e8f0', fontWeight: '500' },
  editBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  editText:       { fontSize: 11, color: '#a78bfa', fontWeight: '700' },

  descCard:       { marginTop: 6, marginBottom: 4, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  descText:       { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', lineHeight: 18 },

  tipsCard:       { marginTop: 16, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', borderRadius: 20, padding: 18, gap: 12 },
  tipsHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipsHeaderIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  tipsTitle:      { fontSize: 14, fontWeight: '800', color: '#f1f5f9' },
  tipsSub:        { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  tipRow:         { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tipIcon:        { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tipTitle:       { fontSize: 12, fontWeight: '700', color: '#f1f5f9', marginBottom: 3 },
  tipDesc:        { fontSize: 11, color: '#94a3b8', lineHeight: 16 },
  tipsFooter:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  tipsFooterText: { flex: 1, fontSize: 11.5, color: '#6ee7b7', lineHeight: 16 },

  btn:            { backgroundColor: '#7c3aed', borderRadius: 18, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  btnOff:         { opacity: 0.4 },
  btnText:        { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  note:           { fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 12 },
});
