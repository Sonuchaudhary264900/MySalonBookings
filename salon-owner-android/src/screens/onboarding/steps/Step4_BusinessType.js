import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../../context/OnboardingContext';

// Mirrors website Step4_SalonType — 5 business types, some auto-set who-you-serve
export const SALON_TYPES = [
  { key: 'barbershop',    label: 'Barbershop',         icon: 'cut-outline',      description: 'Expert cuts, shaves & beard grooming',   autoGender: 'male',   color: '#3b82f6' },
  { key: 'salon',         label: 'Salon',              icon: 'color-wand-outline', description: 'Hair, beauty & grooming for everyone', autoGender: null,     color: '#8b5cf6' },
  { key: 'spa_wellness',  label: 'Spa & Wellness',     icon: 'water-outline',    description: 'Relaxation, massage & holistic care',    autoGender: null,     color: '#10b981' },
  { key: 'makeup_bridal', label: 'Makeup & Bridal',    icon: 'brush-outline',    description: 'Bridal, party makeup & beauty services', autoGender: 'female', color: '#ec4899' },
  { key: 'skin_derma',    label: 'Skin & Derma Clinic', icon: 'medkit-outline',  description: 'Advanced skin treatments & dermatology', autoGender: 'unisex', color: '#f59e0b' },
];

const GENDER_LABELS = { male: 'Men Only', female: 'Women Only', unisex: 'Unisex' };

export default function Step4_BusinessType() {
  const { businessType, setBusinessType, setServedGender, nextStep } = useOnboarding();

  const handleSelect = (type) => {
    setBusinessType(type.key);
    setServedGender(type.autoGender || '');
  };

  const selectedType = SALON_TYPES.find(t => t.key === businessType);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>What describes you best?</Text>
      <Text style={s.sub}>Choose the sanctuary that best describes your craft. This helps us tailor your experience.</Text>

      <View style={s.grid}>
        {SALON_TYPES.map(type => {
          const isActive = businessType === type.key;
          return (
            <TouchableOpacity
              key={type.key}
              style={[
                s.card,
                isActive && { borderColor: type.color, backgroundColor: `${type.color}1a` },
              ]}
              onPress={() => handleSelect(type)}
              activeOpacity={0.85}
            >
              {isActive && (
                <View style={[s.check, { backgroundColor: type.color }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
              <View style={[s.iconBubble, isActive && { backgroundColor: `${type.color}28`, borderColor: `${type.color}55` }]}>
                <Ionicons name={type.icon} size={24} color={isActive ? type.color : '#64748b'} />
              </View>
              <Text style={[s.cardLabel, isActive && { color: '#fff' }]}>{type.label}</Text>
              <Text style={[s.cardDesc, isActive && { color: '#cbd5e1' }]}>{type.description}</Text>
              {isActive && type.autoGender && (
                <View style={[s.autoBadge, { backgroundColor: `${type.color}22`, borderColor: `${type.color}44` }]}>
                  <Text style={[s.autoBadgeText, { color: type.color }]}>Serves: {GENDER_LABELS[type.autoGender]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Info banner when auto-gender is set — matches website */}
      {selectedType?.autoGender && (
        <View style={s.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#a78bfa" />
          <Text style={s.infoText}>
            <Text style={{ fontWeight: '700' }}>{selectedType.label}</Text> automatically serves{' '}
            <Text style={{ fontWeight: '700' }}>{GENDER_LABELS[selectedType.autoGender]}</Text>.
            You can still customize your services in the next steps.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.btn, !businessType && s.btnOff]}
        onPress={() => businessType && nextStep()}
        disabled={!businessType}
        activeOpacity={0.88}
      >
        <Text style={s.btnText}>
          {businessType ? `Continue — Set Up Your ${selectedType?.label || 'Business'}` : 'Select a type to continue'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:        { fontSize: 26, fontWeight: '900', color: '#f1f5f9', marginBottom: 6, letterSpacing: -0.5 },
  sub:          { fontSize: 14, color: '#94a3b8', marginBottom: 22, lineHeight: 20 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  card:         { width: '47.5%', flexGrow: 1, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center' },
  check:        { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBubble:   { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardLabel:    { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 4, textAlign: 'center' },
  cardDesc:     { fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 15 },
  autoBadge:    { marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  autoBadgeText:{ fontSize: 10, fontWeight: '700' },
  infoBanner:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 18 },
  infoText:     { flex: 1, fontSize: 13, color: '#c4b5fd', lineHeight: 18 },
  btn:          { backgroundColor: '#7c3aed', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnOff:       { opacity: 0.45 },
  btnText:      { color: '#fff', fontSize: 15, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
});
