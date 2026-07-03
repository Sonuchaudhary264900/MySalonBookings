import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../../context/OnboardingContext';
import { SALON_TYPES } from './Step4_BusinessType';

// Mirrors website Step4_SalonIdentity — name (with suggestions), who you
// serve (locked when the business type auto-sets it), description + AI fill.

const NAME_CONFIG = {
  barbershop:    { label: 'Barbershop Name', placeholder: 'e.g. The Classic Cuts',       title: "What's your barbershop called?" },
  salon:         { label: 'Salon Name',      placeholder: 'e.g. The Glow Room',          title: "What's your salon called?" },
  spa_wellness:  { label: 'Spa Name',        placeholder: 'e.g. Serene Bliss Spa',       title: "What's your spa called?" },
  makeup_bridal: { label: 'Studio Name',     placeholder: 'e.g. The Bridal Glow Studio', title: "What's your studio called?" },
  skin_derma:    { label: 'Clinic Name',     placeholder: 'e.g. ClearSkin Derma Clinic', title: "What's your clinic called?" },
};

const AI_NAMES_BY_BUSINESS_TYPE = {
  barbershop:    ["King's Cuts", 'The Barber Lab', 'Sharp & Clean', 'The Gents Room', 'Studio Cuts'],
  salon:         ['The Glow Room', 'Glamour Studio', 'Luxe Cuts', 'Style & Co.', 'Radiance Salon'],
  spa_wellness:  ['Serenity Spa', 'The Zen Garden', 'Bliss & Beyond', 'Tranquil Touch', 'Aura Wellness'],
  makeup_bridal: ['The Bridal Canvas', 'Glamour Bride Studio', 'Luxe Bridal', 'The Glow Studio', 'Radiance Bridal'],
  skin_derma:    ['ClearSkin Clinic', 'DermaCare Studio', 'Glow Derma Clinic', 'Skin & Soul Clinic', 'The Derma Lab'],
};

const AI_DESCRIPTIONS = {
  male:   (city) => `A premium men's grooming studio offering expert haircuts, beard styling, and skin care services in the heart of ${city}. Designed for the modern man who demands the best.`,
  female: (city) => `An exclusive women's beauty salon providing expert hair styling, skin care, and beauty treatments in ${city}. Where every visit is a luxurious self-care experience.`,
  unisex: (city) => `A premium unisex salon offering expert haircuts, color treatments, grooming, and beauty services in ${city}. A welcoming space for everyone who loves to look their best.`,
  '':     (city) => `A premium salon offering expert haircuts, color treatments, and beauty services in ${city}. A welcoming space for everyone who loves to look their best.`,
};

const GENDER_CARDS = [
  { value: 'male',   label: 'Men Only',   icon: 'cut-outline' },
  { value: 'female', label: 'Women Only', icon: 'flower-outline' },
  { value: 'unisex', label: 'Unisex',     icon: 'people-outline' },
];

const GENDER_LABELS = { male: 'Men Only', female: 'Women Only', unisex: 'Unisex' };

export default function Step4_SalonIdentity() {
  const {
    businessType,
    salonName, setSalonName,
    servedGender, setServedGender,
    description, setDescription,
    quickSetup, setQuickSetup,
    city, district,
    nextStep,
  } = useOnboarding();
  const [error, setError] = useState('');

  const businessTypeDef = SALON_TYPES.find(t => t.key === businessType);
  const lockedGender    = businessTypeDef?.autoGender || null;
  const nameConfig      = NAME_CONFIG[businessType] || NAME_CONFIG.salon;
  const suggestions     = AI_NAMES_BY_BUSINESS_TYPE[businessType] || AI_NAMES_BY_BUSINESS_TYPE.salon;

  const fillAiDesc = () => {
    const effGender = lockedGender || servedGender || '';
    const place = city || district || 'your city';
    const fn = AI_DESCRIPTIONS[effGender] || AI_DESCRIPTIONS[''];
    setDescription(fn(place));
  };

  const handleNext = () => {
    const effGender = lockedGender || servedGender;
    if (!salonName.trim()) { setError(`${nameConfig.label} is required`); return; }
    if (!effGender)        { setError('Please select who you serve'); return; }
    if (!description.trim()) { setError('Add a short description'); return; }
    if (lockedGender && servedGender !== lockedGender) setServedGender(lockedGender);
    setError('');
    nextStep();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{nameConfig.title}</Text>
        <Text style={s.sub}>This is your brand. Make it memorable.</Text>

        {/* Business Name */}
        <View style={s.field}>
          <Text style={s.label}>{nameConfig.label} <Text style={s.req}>*</Text></Text>
          <View style={[s.row, !!error && !salonName.trim() && s.rowErr]}>
            <Ionicons name="storefront-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput
              style={s.inp}
              placeholder={nameConfig.placeholder}
              placeholderTextColor="#4b5563"
              value={salonName}
              onChangeText={t => { setSalonName(t); setError(''); }}
              maxLength={100}
            />
          </View>

          {/* Name suggestion chips — matches website */}
          <View style={s.chipsWrap}>
            {suggestions.map(sg => (
              <TouchableOpacity key={sg} style={s.chip} onPress={() => { setSalonName(sg); setError(''); }}>
                <Ionicons name="sparkles-outline" size={11} color="#c4b5fd" />
                <Text style={s.chipText}>{sg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Who you serve */}
        <View style={s.field}>
          <View style={s.labelRow}>
            <Text style={s.label}>Who do you serve? <Text style={s.req}>*</Text></Text>
            {lockedGender && (
              <View style={s.lockBadge}>
                <Ionicons name="lock-closed" size={9} color="#a855f7" />
                <Text style={s.lockBadgeText}>Auto-set by {businessTypeDef?.label}</Text>
              </View>
            )}
          </View>

          {lockedGender ? (
            <View style={s.lockedCard}>
              <View style={s.lockedIcon}>
                <Ionicons
                  name={lockedGender === 'male' ? 'cut-outline' : lockedGender === 'female' ? 'flower-outline' : 'people-outline'}
                  size={18} color="#a855f7"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lockedLabel}>{GENDER_LABELS[lockedGender]}</Text>
                <Text style={s.lockedHint}>Pre-selected by your business type. Go back a step to change it.</Text>
              </View>
              <View style={s.lockedCheck}><Ionicons name="checkmark" size={13} color="#fff" /></View>
            </View>
          ) : (
            <View style={s.genderRow}>
              {GENDER_CARDS.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[s.gCard, servedGender === g.value && s.gCardOn]}
                  onPress={() => { setServedGender(g.value); setError(''); }}
                  activeOpacity={0.8}
                >
                  {servedGender === g.value && (
                    <View style={s.gCheck}><Ionicons name="checkmark" size={10} color="#fff" /></View>
                  )}
                  <View style={[s.gIcon, servedGender === g.value && s.gIconOn]}>
                    <Ionicons name={g.icon} size={20} color={servedGender === g.value ? '#a855f7' : '#94a3b8'} />
                  </View>
                  <Text style={[s.gLabel, servedGender === g.value && s.gLabelOn]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={s.field}>
          <View style={s.descHeader}>
            <Text style={s.label}>Description <Text style={s.req}>*</Text></Text>
            <TouchableOpacity style={s.aiBtn} onPress={fillAiDesc}>
              <Ionicons name="sparkles" size={12} color="#a855f7" />
              <Text style={s.aiBtnText}>Write one for me</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.textarea}
            placeholder="Help customers know what makes you special..."
            placeholderTextColor="#4b5563"
            value={description}
            onChangeText={t => { setDescription(t.slice(0, 500)); setError(''); }}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={[s.charCount, description.length > 480 && { color: '#f87171' }]}>{description.length}/500</Text>
        </View>

        {/* Quick Setup — matches website banner */}
        <View style={s.quickRow}>
          <Ionicons name="flash-outline" size={22} color="#c4b5fd" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.quickTitle}>Quick Setup (Recommended)</Text>
            <Text style={s.quickSub}>We'll pre-select services and suggest prices based on your business type. You can customize everything.</Text>
          </View>
          <Switch
            value={quickSetup}
            onValueChange={setQuickSetup}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(124,58,237,0.5)' }}
            thumbColor={quickSetup ? '#7c3aed' : '#6b7280'}
          />
        </View>

        {!!error && <Text style={s.err}>{error}</Text>}

        <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={s.btnText}>Continue — Add Your Location</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:     { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:      { fontSize: 24, fontWeight: '900', color: '#f1f5f9', marginBottom: 6, letterSpacing: -0.5 },
  sub:        { fontSize: 14, color: '#94a3b8', marginBottom: 22 },
  field:      { marginBottom: 20 },
  label:      { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  req:        { color: '#f87171' },
  row:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.05)' },
  rowErr:     { borderColor: '#ef4444' },
  ic:         { marginRight: 10 },
  inp:        { flex: 1, fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  chipsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'rgba(139,92,246,0.1)' },
  chipText:   { fontSize: 12, fontWeight: '600', color: '#c4b5fd' },

  lockBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', marginBottom: 8 },
  lockBadgeText: { fontSize: 10, fontWeight: '700', color: '#a855f7' },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.12)' },
  lockedIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' },
  lockedLabel:{ fontSize: 14, fontWeight: '700', color: '#a855f7' },
  lockedHint: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  lockedCheck:{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },

  genderRow:  { flexDirection: 'row', gap: 10 },
  gCard:      { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  gCardOn:    { borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.12)' },
  gCheck:     { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  gIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gIconOn:    { backgroundColor: 'rgba(124,58,237,0.18)' },
  gLabel:     { fontSize: 12, fontWeight: '700', color: '#94a3b8', textAlign: 'center' },
  gLabelOn:   { color: '#a855f7' },

  descHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  aiBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.35)' },
  aiBtnText:  { fontSize: 11, color: '#a855f7', fontWeight: '700' },
  textarea:   { borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, padding: 14, fontSize: 14, color: '#f1f5f9', backgroundColor: 'rgba(255,255,255,0.05)', height: 110, lineHeight: 21 },
  charCount:  { fontSize: 11, color: '#475569', textAlign: 'right', marginTop: 4 },

  quickRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', marginBottom: 20 },
  quickTitle: { fontSize: 13, fontWeight: '700', color: '#c4b5fd', marginBottom: 2 },
  quickSub:   { fontSize: 12, color: '#94a3b8', lineHeight: 17 },

  err:        { fontSize: 13, color: '#f87171', marginBottom: 12, textAlign: 'center' },
  btn:        { backgroundColor: '#7c3aed', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});
