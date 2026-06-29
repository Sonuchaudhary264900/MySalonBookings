import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../../context/OnboardingContext';

const CATEGORIES = [
  { value: 'barber',     label: 'Barber',     emoji: '✂️' },
  { value: 'hair_salon', label: 'Hair Salon',  emoji: '💇' },
  { value: 'spa',        label: 'Spa',         emoji: '🧖' },
  { value: 'massage',    label: 'Massage',     emoji: '💆' },
  { value: 'other',      label: 'Other',       emoji: '🏪' },
];

const GENDER_CARDS = [
  { value: 'male',   label: 'Men',      emoji: '👨', hint: 'Barbershop / Men\'s salon' },
  { value: 'female', label: 'Women',    emoji: '👩', hint: 'Ladies beauty parlour' },
  { value: 'unisex', label: 'Unisex',   emoji: '💁', hint: 'Serves everyone' },
];

const AI_DESCRIPTIONS = {
  male:   (name) => `${name || 'Our salon'} is a premium grooming destination for men, offering expert haircuts, beard styling, and relaxing treatments. We ensure every client walks out looking and feeling their best.`,
  female: (name) => `${name || 'Our salon'} is a luxury beauty studio dedicated to women, providing exceptional hair care, skincare, and beauty treatments in a serene and welcoming atmosphere.`,
  unisex: (name) => `${name || 'Our salon'} is a modern unisex salon catering to everyone. We provide world-class hair care, skin treatments, and beauty services in a stylish and comfortable environment.`,
};

export default function Step4_SalonIdentity() {
  const {
    salonName, setSalonName,
    salonCategory, setSalonCategory,
    servedGender, setServedGender,
    description, setDescription,
    quickSetup, setQuickSetup,
    city,
    nextStep,
  } = useOnboarding();
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!salonName.trim()) { setError('Please enter your business name'); return; }
    if (!servedGender) { setError('Please select who you serve'); return; }
    setError('');
    nextStep();
  };

  const fillAiDesc = () => {
    const text = AI_DESCRIPTIONS[servedGender || 'unisex'](salonName);
    setDescription(text);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Salon Identity</Text>
        <Text style={s.sub}>Tell us about your business</Text>

        {/* Business Name */}
        <View style={s.field}>
          <Text style={s.label}>Business Name <Text style={s.req}>*</Text></Text>
          <View style={[s.row, error && !salonName.trim() && s.rowErr]}>
            <Ionicons name="storefront-outline" size={18} color="#818cf8" style={s.ic} />
            <TextInput
              style={s.inp}
              placeholder="e.g. Glow Beauty Studio"
              placeholderTextColor="#4b5563"
              value={salonName}
              onChangeText={t => { setSalonName(t); setError(''); }}
              maxLength={100}
            />
          </View>
        </View>

        {/* Category */}
        <View style={s.field}>
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.value}
                style={[s.catChip, salonCategory === c.value && s.catChipOn]}
                onPress={() => setSalonCategory(c.value)}
              >
                <Text style={s.catEmoji}>{c.emoji}</Text>
                <Text style={[s.catLabel, salonCategory === c.value && s.catLabelOn]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Served Gender */}
        <View style={s.field}>
          <Text style={s.label}>Who do you serve? <Text style={s.req}>*</Text></Text>
          {GENDER_CARDS.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[s.gCard, servedGender === g.value && s.gCardOn]}
              onPress={() => { setServedGender(g.value); setError(''); }}
              activeOpacity={0.8}
            >
              <Text style={s.gEmoji}>{g.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.gLabel, servedGender === g.value && s.gLabelOn]}>{g.label}</Text>
                <Text style={s.gHint}>{g.hint}</Text>
              </View>
              {servedGender === g.value && (
                <View style={s.gCheck}><Ionicons name="checkmark" size={14} color="#fff" /></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={s.field}>
          <View style={s.descHeader}>
            <Text style={s.label}>Description <Text style={s.opt}>(optional)</Text></Text>
            {servedGender && (
              <TouchableOpacity style={s.aiBtn} onPress={fillAiDesc}>
                <Ionicons name="sparkles" size={12} color="#818cf8" />
                <Text style={s.aiBtnText}>AI Fill</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={s.textarea}
            placeholder="Tell customers what makes your business special..."
            placeholderTextColor="#4b5563"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{description.length}/500</Text>
        </View>

        {/* Quick Setup */}
        <View style={s.quickRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.quickTitle}>⚡ Quick Setup Mode</Text>
            <Text style={s.quickSub}>Pre-fill common services with suggested prices</Text>
          </View>
          <Switch
            value={quickSetup}
            onValueChange={setQuickSetup}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(99,102,241,0.5)' }}
            thumbColor={quickSetup ? '#6366f1' : '#6b7280'}
          />
        </View>

        {!!error && <Text style={s.err}>{error}</Text>}

        <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={s.btnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:     { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:      { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:        { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  field:      { marginBottom: 20 },
  label:      { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
  req:        { color: '#f87171' },
  opt:        { color: '#475569', fontWeight: '400' },
  row:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.05)' },
  rowErr:     { borderColor: '#ef4444' },
  ic:         { marginRight: 10 },
  inp:        { flex: 1, fontSize: 16, color: '#f1f5f9' },
  catRow:     { gap: 10, paddingBottom: 4 },
  catChip:    { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(255,255,255,0.05)', gap: 4 },
  catChipOn:  { backgroundColor: 'rgba(99,102,241,0.22)', borderColor: '#6366f1' },
  catEmoji:   { fontSize: 22 },
  catLabel:   { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  catLabelOn: { color: '#c4b5fd' },
  gCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.25)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 10 },
  gCardOn:    { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)' },
  gEmoji:     { fontSize: 28 },
  gLabel:     { fontSize: 15, fontWeight: '700', color: '#e2e8f0', marginBottom: 2 },
  gLabelOn:   { color: '#c4b5fd' },
  gHint:      { fontSize: 12, color: '#475569' },
  gCheck:     { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  descHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  aiBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  aiBtnText:  { fontSize: 11, color: '#818cf8', fontWeight: '700' },
  textarea:   { borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 14, padding: 14, fontSize: 14, color: '#f1f5f9', backgroundColor: 'rgba(255,255,255,0.05)', height: 100 },
  charCount:  { fontSize: 11, color: '#475569', textAlign: 'right', marginTop: 4 },
  quickRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', marginBottom: 20 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  quickSub:   { fontSize: 12, color: '#94a3b8' },
  err:        { fontSize: 13, color: '#f87171', marginBottom: 12, textAlign: 'center' },
  btn:        { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '800' },
});
