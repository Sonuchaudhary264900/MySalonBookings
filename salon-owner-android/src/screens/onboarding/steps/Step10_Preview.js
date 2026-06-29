import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Animated, Easing, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalon } from '../../../context/SalonContext';
import { useAuth } from '../../../context/AuthContext';
import { useOnboarding } from '../../../context/OnboardingContext';
import { getCategoriesForGender } from '../../../data/salonCategories';

const { width: W } = Dimensions.get('window');

// Build workingHours object from onboarding state
function buildWorkingHours(workingDays, openTime, closeTime) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const hours = {};
  days.forEach(d => {
    hours[d] = workingDays.includes(d)
      ? { open: openTime, close: closeTime, isClosed: false }
      : { open: '09:00', close: '18:00', isClosed: true };
  });
  return hours;
}

// Build offeredCategories array using human-readable category labels
function buildOfferedCategories(selectedServices, servicePricing, servedGender) {
  const categories = getCategoriesForGender(servedGender || 'male');
  const labelMap = {};
  categories.forEach(c => { labelMap[c.key] = c.label; });

  const map = {};
  Object.keys(selectedServices).forEach(k => {
    const [catKey, name] = k.split('|||');
    if (!map[catKey]) map[catKey] = { name: labelMap[catKey] || catKey, subServices: [] };
    const p = servicePricing[k] || {};
    map[catKey].subServices.push({
      name,
      price:    parseFloat(p.price) || 0,
      duration: parseInt(p.duration) || 30,
    });
  });
  return Object.values(map);
}

// Confetti particle component
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

function CelebrationOverlay({ onDone }) {
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
        <Text style={cs.emoji}>🎉</Text>
        <Text style={cs.headline}>Salon Registered!</Text>
        <Text style={cs.sub}>Your salon is under review.{'\n'}We'll notify you when approved.</Text>
      </Animated.View>
    </View>
  );
}

export default function Step10_Preview() {
  const { createSalon } = useSalon();
  const { refreshUser, user } = useAuth();
  const data = useOnboarding();
  const {
    salonName, servedGender, description, salonCategory,
    phone, ownerEmail,
    lat, lng, address, city, stateName, pincode,
    workingDays, openTime, closeTime, lunchBreak, lunchStart, lunchEnd,
    photos, videoUrl, businessLicenseUrl, businessRegUrl,
    selectedServices, servicePricing,
    goToStep,
  } = data;

  const [loading, setLoading]     = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const serviceCount  = Object.keys(selectedServices).length;
  const pricedCount   = Object.keys(selectedServices).filter(k => {
    const p = servicePricing[k];
    return p && parseFloat(p.price) > 0;
  }).length;

  const checks = [
    { label: 'Salon name',    ok: !!salonName,          step: 4 },
    { label: 'Who you serve', ok: !!servedGender,        step: 4 },
    { label: 'Location set',  ok: !!address && !!city,   step: 5 },
    { label: 'Working hours', ok: workingDays.length > 0, step: 6 },
    { label: 'Photos added',  ok: photos.length > 0,     step: 7 },
    { label: 'Services',      ok: serviceCount > 0,      step: 8 },
    { label: 'Pricing',       ok: pricedCount > 0,       step: 9, optional: true },
  ];

  const canSubmit = checks.filter(c => !c.optional).every(c => c.ok);

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all required steps before submitting.');
      return;
    }
    setLoading(true);
    try {
      const workingHours = buildWorkingHours(workingDays, openTime, closeTime);
      const offeredCategories = buildOfferedCategories(selectedServices, servicePricing, servedGender);
      const coverPhotoUrl = photos[0]?.url || null;

      // Backend validator requires /^\+91[6-9]\d{9}$/ format
      // user.phone is already +91XXXXXXXXXX from Firebase registration
      const rawDigits = phone.replace(/\D/g, '').slice(-10);
      const salonPhone = rawDigits.length === 10
        ? '+91' + rawDigits   // new registration path
        : (user?.phone || ''); // returning user — user.phone already has +91 prefix
      await createSalon({
        name:        salonName,
        category:    salonCategory,
        servedGender,
        description,
        phone:       salonPhone || user?.phone || '',
        email:       ownerEmail || user?.email || '',
        address,
        city,
        state:   stateName,
        pincode,
        location: { latitude: lat, longitude: lng },
        workingHours,
        offeredCategories,
        photos: photos.map(p => ({ url: p.url, caption: '', tags: [], isCover: false })),
        coverPhoto: coverPhotoUrl,
        ...(videoUrl          ? { videoUrl }          : {}),
        ...(businessLicenseUrl ? { businessLicenseUrl } : {}),
        ...(businessRegUrl    ? { businessRegistrationUrl: businessRegUrl } : {}),
      });
      setShowCelebration(true);
    } catch (e) {
      Alert.alert('Submission Failed', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally { setLoading(false); }
  };

  if (showCelebration) {
    return <CelebrationOverlay onDone={() => refreshUser()} />;
  }

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Text style={s.title}>Preview & Submit</Text>
      <Text style={s.sub}>Review your business before going live</Text>

      {/* Mini salon card preview */}
      <View style={s.previewCard}>
        {photos[0] && (
          <Image source={{ uri: photos[0].uri || photos[0].url }} style={s.previewImg} />
        )}
        <View style={s.previewBody}>
          <Text style={s.previewName}>{salonName || 'Your Business Name'}</Text>
          {servedGender && (
            <View style={s.genderBadge}>
              <Text style={s.genderText}>{servedGender === 'male' ? '👨 Men' : servedGender === 'female' ? '👩 Women' : '💁 Unisex'}</Text>
            </View>
          )}
          {address && <Text style={s.previewAddr}>{[address, city].filter(Boolean).join(', ')}</Text>}
          {workingDays.length > 0 && (
            <Text style={s.previewHours}>⏰ {openTime} – {closeTime} · {workingDays.length} days</Text>
          )}
          {serviceCount > 0 && (
            <Text style={s.previewServices}>{serviceCount} services · {pricedCount} priced</Text>
          )}
        </View>
      </View>

      {/* Checklist */}
      <Text style={s.checklistTitle}>Completion Checklist</Text>
      {checks.map(c => (
        <View key={c.label} style={s.checkRow}>
          <View style={[s.checkIcon, c.ok ? s.checkIconOk : s.checkIconWarn]}>
            <Ionicons name={c.ok ? 'checkmark' : 'alert'} size={13} color="#fff" />
          </View>
          <Text style={[s.checkLabel, c.ok && s.checkLabelOk]}>
            {c.label}
            {c.optional && <Text style={s.optional}> (optional)</Text>}
          </Text>
          {!c.ok && (
            <TouchableOpacity onPress={() => goToStep(c.step)} style={s.editBtn}>
              <Text style={s.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {!canSubmit && (
        <View style={s.incompleteNote}>
          <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
          <Text style={s.incompleteText}>Complete all required sections to submit.</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.btn, (!canSubmit || loading) && s.btnOff]}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
        activeOpacity={0.88}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={s.btnText}>Submit for Approval</Text>
            </>
        }
      </TouchableOpacity>
      <Text style={s.note}>Our team reviews salons within 24–48 hours</Text>
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,7,26,0.95)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  card:      { backgroundColor: '#0f0f2b', borderRadius: 24, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)', maxWidth: 280 },
  emoji:     { fontSize: 60, marginBottom: 16 },
  headline:  { fontSize: 26, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', marginBottom: 10 },
  sub:       { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
});

const s = StyleSheet.create({
  scroll:         { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 40 },
  title:          { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:            { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  previewCard:    { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  previewImg:     { width: '100%', height: 140, resizeMode: 'cover' },
  previewBody:    { padding: 14, gap: 5 },
  previewName:    { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  genderBadge:    { alignSelf: 'flex-start', backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  genderText:     { fontSize: 12, color: '#c4b5fd', fontWeight: '600' },
  previewAddr:    { fontSize: 13, color: '#94a3b8' },
  previewHours:   { fontSize: 13, color: '#94a3b8' },
  previewServices:{ fontSize: 13, color: '#818cf8', fontWeight: '600' },
  checklistTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 12 },
  checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  checkIcon:      { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkIconOk:    { backgroundColor: '#16a34a' },
  checkIconWarn:  { backgroundColor: '#d97706' },
  checkLabel:     { flex: 1, fontSize: 14, color: '#64748b' },
  checkLabelOk:   { color: '#e2e8f0' },
  optional:       { color: '#475569', fontSize: 12 },
  editBtn:        { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editText:       { fontSize: 12, color: '#818cf8', fontWeight: '700' },
  incompleteNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: 12, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  incompleteText: { fontSize: 13, color: '#fcd34d', flex: 1 },
  btn:            { backgroundColor: '#6366f1', borderRadius: 14, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  btnOff:         { opacity: 0.4 },
  btnText:        { color: '#fff', fontSize: 17, fontWeight: '800' },
  note:           { fontSize: 12, color: '#374151', textAlign: 'center', marginTop: 12 },
});
