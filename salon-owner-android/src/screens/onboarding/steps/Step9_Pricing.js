import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../../context/OnboardingContext';
import { PRICE_HINTS } from '../../../data/salonCategories';

export default function Step9_Pricing() {
  const {
    selectedServices,
    servicePricing, setPricing, setServicePricing,
    nextStep,
  } = useOnboarding();

  const entries = Object.keys(selectedServices).map(k => {
    const [catKey, name] = k.split('|||');
    return { k, catKey, name };
  });

  const filled = entries.filter(({ k }) => {
    const p = servicePricing[k];
    return p && parseFloat(p.price) > 0 && parseInt(p.duration) > 0;
  }).length;

  const fillSuggested = () => {
    const next = { ...servicePricing };
    entries.forEach(({ k, name }) => {
      const hint = PRICE_HINTS[name];
      if (hint && !(next[k]?.price)) {
        next[k] = { price: String(hint.price), duration: String(hint.duration) };
      }
    });
    setServicePricing(next);
  };

  return (
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Set Prices</Text>
      <Text style={s.sub}>Set price and duration for each service</Text>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${entries.length ? (filled / entries.length) * 100 : 0}%` }]} />
        </View>
        <Text style={s.progressText}>{filled}/{entries.length} priced</Text>
      </View>

      {/* Fill suggested */}
      <TouchableOpacity style={s.suggestBtn} onPress={fillSuggested}>
        <Ionicons name="sparkles" size={14} color="#818cf8" />
        <Text style={s.suggestText}>Fill Suggested Prices</Text>
      </TouchableOpacity>

      {/* Service rows */}
      {entries.map(({ k, catKey, name }) => {
        const p     = servicePricing[k] || {};
        const hint  = PRICE_HINTS[name];
        return (
          <View key={k} style={s.row}>
            <View style={s.rowName}>
              <Text style={s.name}>{name}</Text>
              {hint && <Text style={s.hint}>~₹{hint.price} · {hint.duration}min</Text>}
            </View>
            <View style={s.inputs}>
              <View style={s.inputWrap}>
                <Text style={s.inputPrefix}>₹</Text>
                <TextInput
                  style={s.inp}
                  placeholder="Price"
                  placeholderTextColor="#4b5563"
                  keyboardType="number-pad"
                  value={p.price || ''}
                  onChangeText={v => setPricing(catKey, name, 'price', v)}
                  maxLength={6}
                />
              </View>
              <View style={s.inputWrap}>
                <Ionicons name="time-outline" size={13} color="#818cf8" />
                <TextInput
                  style={s.inp}
                  placeholder="Mins"
                  placeholderTextColor="#4b5563"
                  keyboardType="number-pad"
                  value={p.duration || ''}
                  onChangeText={v => setPricing(catKey, name, 'duration', v)}
                  maxLength={3}
                />
              </View>
            </View>
          </View>
        );
      })}

      {entries.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="cut-outline" size={40} color="#374151" />
          <Text style={s.emptyText}>No services selected yet</Text>
        </View>
      )}

      <TouchableOpacity style={s.skipBtn} onPress={nextStep}>
        <Text style={s.skipText}>Skip pricing for now →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btn} onPress={nextStep} activeOpacity={0.88}>
        <Text style={s.btnText}>Continue to Preview</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 32 },
  title:        { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  sub:          { fontSize: 14, color: '#94a3b8', marginBottom: 18 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  progressBar:  { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#6366f1' },
  progressText: { fontSize: 12, color: '#818cf8', fontWeight: '700', width: 70, textAlign: 'right' },
  suggestBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', marginBottom: 18 },
  suggestText:  { fontSize: 13, color: '#818cf8', fontWeight: '700' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rowName:      { flex: 1 },
  name:         { fontSize: 13, fontWeight: '600', color: '#e2e8f0', marginBottom: 2 },
  hint:         { fontSize: 11, color: '#475569' },
  inputs:       { flexDirection: 'row', gap: 8 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 10, paddingHorizontal: 8, height: 38, width: 80, backgroundColor: 'rgba(255,255,255,0.05)' },
  inputPrefix:  { fontSize: 13, color: '#818cf8', fontWeight: '700' },
  inp:          { flex: 1, fontSize: 14, color: '#f1f5f9', textAlign: 'center' },
  empty:        { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText:    { fontSize: 14, color: '#374151' },
  skipBtn:      { alignItems: 'center', paddingVertical: 14 },
  skipText:     { fontSize: 14, color: '#475569' },
  btn:          { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
