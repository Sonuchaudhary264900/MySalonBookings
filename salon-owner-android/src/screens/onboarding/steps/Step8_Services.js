import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../../context/OnboardingContext';
import { getCategoriesForGender, QUICK_PICKS } from '../../../data/salonCategories';

export default function Step8_Services() {
  const {
    servedGender,
    selectedServices, toggleService, setSelectedServices,
    servicePricing, setServicePricing,
    quickSetup,
    nextStep,
  } = useOnboarding();

  const categories    = getCategoriesForGender(servedGender || 'male');
  const [activeTab, setActiveTab]     = useState(categories[0]?.key || '');
  const [showQuickBanner, setShowQuickBanner] = useState(quickSetup);
  const [error, setError]             = useState('');

  const selectedCount = Object.keys(selectedServices).length;

  const applyQuickPicks = () => {
    const picks = QUICK_PICKS[servedGender || 'male'] || QUICK_PICKS.unisex;
    const newSelected = {};
    const newPricing  = {};
    picks.forEach(p => {
      const k = `${p.catKey}|||${p.name}`;
      newSelected[k] = true;
      newPricing[k]  = { price: String(p.price), duration: String(p.duration) };
    });
    setSelectedServices(prev => ({ ...prev, ...newSelected }));
    setServicePricing(prev => ({ ...prev, ...newPricing }));
    setShowQuickBanner(false);
  };

  const handleNext = () => {
    if (selectedCount === 0) { setError('Please select at least 1 service'); return; }
    setError('');
    nextStep();
  };

  const activeCategory = categories.find(c => c.key === activeTab);

  return (
    <View style={{ flex: 1 }}>
      {/* Quick setup banner */}
      {showQuickBanner && (
        <View style={s.quickBanner}>
          <Text style={s.quickTitle}>⚡ Quick picks available</Text>
          <Text style={s.quickSub}>Pre-select popular services with suggested prices</Text>
          <View style={s.quickBtns}>
            <TouchableOpacity style={s.quickApply} onPress={applyQuickPicks}>
              <Text style={s.quickApplyText}>Accept Suggestions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQuickBanner(false)}>
              <Text style={s.quickSkip}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabContent}>
        {categories.map(c => (
          <TouchableOpacity
            key={c.key}
            style={[s.tab, activeTab === c.key && s.tabActive]}
            onPress={() => setActiveTab(c.key)}
          >
            <Text style={s.tabEmoji}>{c.icon}</Text>
            <Text style={[s.tabText, activeTab === c.key && s.tabTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.countRow}>
          <Text style={s.sectionTitle}>{activeCategory?.label}</Text>
          <View style={s.countBadge}>
            <Text style={s.countText}>{selectedCount} selected</Text>
          </View>
        </View>

        <View style={s.serviceGrid}>
          {activeCategory?.subServices.map(name => {
            const k       = `${activeTab}|||${name}`;
            const isOn    = !!selectedServices[k];
            return (
              <TouchableOpacity
                key={name}
                style={[s.serviceChip, isOn && s.serviceChipOn]}
                onPress={() => toggleService(activeTab, name)}
                activeOpacity={0.8}
              >
                {isOn && (
                  <View style={s.checkMark}><Ionicons name="checkmark" size={11} color="#fff" /></View>
                )}
                <Text style={[s.serviceText, isOn && s.serviceTextOn]}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!!error && <Text style={s.err}>{error}</Text>}

        {selectedCount > 0 && (
          <View style={s.selectedSummary}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={s.selectedText}>
              {selectedCount} service{selectedCount !== 1 ? 's' : ''} selected — great selection!
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={s.btnText}>Continue to Pricing</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  quickBanner:     { backgroundColor: 'rgba(99,102,241,0.12)', padding: 14, borderBottomWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  quickTitle:      { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  quickSub:        { fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  quickBtns:       { flexDirection: 'row', gap: 12, alignItems: 'center' },
  quickApply:      { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  quickApplyText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  quickSkip:       { fontSize: 13, color: '#475569', fontWeight: '600' },
  tabBar:          { flexGrow: 0 },
  tabContent:      { gap: 6, paddingHorizontal: 0, paddingVertical: 12 },
  tab:             { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.25)', backgroundColor: 'rgba(255,255,255,0.04)', gap: 3 },
  tabActive:       { backgroundColor: 'rgba(99,102,241,0.22)', borderColor: '#6366f1' },
  tabEmoji:        { fontSize: 18 },
  tabText:         { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive:   { color: '#c4b5fd' },
  scroll:          { flexGrow: 1, paddingTop: 4, paddingBottom: 32 },
  countRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  countBadge:      { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countText:       { fontSize: 12, color: '#818cf8', fontWeight: '700' },
  serviceGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  serviceChip:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.25)', backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceChipOn:   { backgroundColor: 'rgba(99,102,241,0.22)', borderColor: '#6366f1' },
  checkMark:       { width: 16, height: 16, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  serviceText:     { fontSize: 13, fontWeight: '500', color: '#64748b' },
  serviceTextOn:   { color: '#c4b5fd', fontWeight: '600' },
  selectedSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  selectedText:    { fontSize: 13, color: '#86efac', flex: 1 },
  err:             { fontSize: 13, color: '#f87171', marginBottom: 12, textAlign: 'center' },
  btn:             { backgroundColor: '#6366f1', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  btnText:         { color: '#fff', fontSize: 16, fontWeight: '800' },
});
