import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, Switch, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showError } from '../../utils/toast';
import { useSalon } from '../../context/SalonContext';

// ── Category constants ──────────────────────────────────────────
const CATEGORY_ORDER = [
  'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
  'Beard & Grooming', 'Nail Services',
  'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
  'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
  'Bridal & Events', 'Kids Services', 'At-Home Services',
];

const CAT_ICON = {
  'Hair Services': '✂️', 'Hair Services (Men)': '✂️', 'Hair Services (Women)': '✂️',
  'Beard & Grooming': '🧔', 'Nail Services': '💅',
  'Skin & Face / Beauty': '🧖', 'Skin & Face (Men Grooming)': '🧴', 'Skin & Beauty': '🧖',
  'Spa & Massage': '💆', 'Spa & Relaxation': '💆', 'Body Grooming': '🧴',
  'Bridal & Events': '👰', 'Kids Services': '👶', 'At-Home Services': '🏠',
};

// Inline UNISEX_CATEGORIES lookup — used to classify sub-services by gender
const UNISEX_CAT_LOOKUP = {
  'Hair Services': {
    male: new Set(['Basic Haircut','Fade / Taper / Skin Fade','Designer Haircut','Hair Styling','Hair Wash','Blow Dry','Hair Coloring','Hair Straightening','Hair Smoothening','Hair Spa','Dandruff Treatment','Hair Fall Treatment']),
    female: new Set(['Haircut (Layer / Step / Trim)','Advanced Haircut','Hair Styling (Straight / Curl / Party)','Hair Wash','Blow Dry','Hair Coloring','Highlights / Balayage','Hair Smoothening','Rebonding','Keratin Treatment','Hair Spa']),
  },
  'Beard & Grooming': {
    male: new Set(['Beard Trim','Clean Shave','Beard Styling / Shape','Designer Beard','Beard Coloring','Hot Towel Shave']),
    female: new Set(),
  },
  'Nail Services': {
    male: new Set(['Manicure','Pedicure']),
    female: new Set(['Manicure','Pedicure','Nail Art','Gel Nails','Acrylic Nails','Nail Extensions','Nail Repair']),
  },
  'Skin & Face / Beauty': {
    male: new Set(['Basic Facial','Gold Facial','Diamond Facial','Clean-up','Detan','Face Bleach','Anti-Acne Treatment','Skin Brightening']),
    female: new Set(['Basic Facial','Gold Facial','Diamond Facial','Hydra Facial','Clean-up','Detan','Bleach','Anti-aging Treatment','Skin Brightening']),
  },
  'Spa & Massage': {
    male: new Set(['Head Massage','Neck & Shoulder Massage','Full Body Massage','Foot Massage','Deep Tissue Massage','Relaxation Massage']),
    female: new Set(['Head Massage','Full Body Massage','Foot Massage','Aromatherapy','Spa Therapy','Relaxation Massage']),
  },
  'Body Grooming': {
    male: new Set(['Chest Waxing','Back Waxing','Full Body Wax','Threading (optional)','Nose Wax','Ear Cleaning']),
    female: new Set(['Full Body Wax','Half Wax','Bikini Wax','Threading (Eyebrow / Upper Lip / Forehead)','Body Polish','Body Scrub']),
  },
  'Bridal & Events': {
    male: new Set(['Groom Makeup','Hairstyling (Groom)','Shave & Grooming (Groom)']),
    female: new Set(['Bridal Makeup','Engagement Makeup','Party Makeup','Hairstyling','Saree Draping']),
  },
  'Kids Services': {
    male: new Set(["Kids' Haircut (Boys)","Kids' Hair Styling (Boys)","Kids' Hair Wash"]),
    female: new Set(["Kids' Haircut (Girls)","Kids' Hair Styling (Girls)","Kids' Hair Wash","Kids' Braiding"]),
  },
  'At-Home Services': {
    male: new Set(['At-Home Haircut (Men)','At-Home Shave','At-Home Massage','At-Home Facial (Men)']),
    female: new Set(['At-Home Haircut (Women)','At-Home Facial','At-Home Waxing','At-Home Massage','At-Home Bridal']),
  },
};

const MALE_ONLY_CATS   = ['Beard & Grooming', 'Body Grooming'];
const FEMALE_ONLY_CATS = ['Bridal & Events'];

function classifySub(s, catName) {
  const name = typeof s === 'string' ? s : s.name;
  const af   = (typeof s === 'object' && s.applicableFor) || [];
  if (af.length > 0 && af.includes('male')   && !af.includes('female')) return 'male';
  if (af.length > 0 && af.includes('female') && !af.includes('male'))   return 'female';
  const lookup = UNISEX_CAT_LOOKUP[catName];
  if (lookup) {
    const inMale   = lookup.male.has(name);
    const inFemale = lookup.female.has(name);
    if (inMale && !inFemale)   return 'male';
    if (inFemale && !inMale)   return 'female';
  }
  return 'both';
}

function classifySvc(s) {
  const af = s.applicableFor || [];
  if (af.length > 0 && af.includes('male')   && !af.includes('female')) return 'male';
  if (af.length > 0 && af.includes('female') && !af.includes('male'))   return 'female';
  const lookup = UNISEX_CAT_LOOKUP[s.category];
  if (lookup) {
    const inMale   = lookup.male.has(s.name);
    const inFemale = lookup.female.has(s.name);
    if (inMale && !inFemale)   return 'male';
    if (inFemale && !inMale)   return 'female';
  }
  return 'both';
}

// ── Service Modal ───────────────────────────────────────────────
function ServiceModal({ visible, service, salon, onClose, onSaved }) {
  const editing = !!service?._id;
  const [name, setName]           = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration]   = useState('30');
  const [category, setCategory]   = useState(CATEGORY_ORDER[0]);
  const [isActive, setIsActive]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setBasePrice(String(service.basePrice || ''));
      setDuration(String(service.duration || '30'));
      setCategory(service.category || CATEGORY_ORDER[0]);
      setIsActive(service.isActive !== false);
    } else {
      setName(''); setDescription(''); setBasePrice(''); setDuration('30');
      setCategory(CATEGORY_ORDER[0]); setIsActive(true);
    }
    setError('');
  }, [service, visible]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Service name is required'); return; }
    if (!basePrice || isNaN(Number(basePrice))) { setError('Enter a valid price'); return; }
    if (!duration || isNaN(Number(duration))) { setError('Enter a valid duration in minutes'); return; }
    setError(''); setLoading(true);
    try {
      const applicableFor =
        salon?.servedGender === 'male'   ? ['male'] :
        salon?.servedGender === 'female' ? ['female'] :
        ['male', 'female'];
      const payload = { name: name.trim(), description: description.trim(), basePrice: Number(basePrice), duration: Number(duration), category, isActive, applicableFor };
      if (editing) {
        await api.put(`/owner/services/${service._id}`, payload);
      } else {
        await api.post('/owner/services', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  // Categories available based on salon's offeredCategories (or all if not set)
  const availableCategories = salon?.offeredCategories?.length > 0
    ? salon.offeredCategories.map(c => c.name)
    : CATEGORY_ORDER;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{editing ? 'Edit Service' : 'Add Service'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          {[
            { label: 'Service Name *', value: name, setter: setName, placeholder: 'e.g. Basic Haircut', keyboard: 'default' },
            { label: 'Description', value: description, setter: setDescription, placeholder: 'Brief description…', keyboard: 'default' },
            { label: 'Price (₹) *', value: basePrice, setter: setBasePrice, placeholder: '0', keyboard: 'numeric' },
            { label: 'Duration (minutes) *', value: duration, setter: setDuration, placeholder: '30', keyboard: 'numeric' },
          ].map((f) => (
            <View style={styles.field} key={f.label}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#9ca3af" keyboardType={f.keyboard} value={f.value} onChangeText={f.setter} />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsRow}>
              {availableCategories.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={styles.chipEmoji}>{CAT_ICON[c] || '✨'}</Text>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#d1d5db', true: '#60a5fa' }} thumbColor={isActive ? '#2563eb' : '#9ca3af'} />
          </View>

          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Service'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ─────────────────────────────────────────────────
export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { salon } = useSalon();
  const [services, setServices]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [expandedCat, setExpandedCat]   = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/owner/services');
      const d = res.data.data;
      setServices(Array.isArray(d) ? d : (d?.services || []));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchServices(); setRefreshing(false); };

  const handleDelete = (service) => {
    Alert.alert('Delete Service', `Delete "${service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/services/${service._id}`);
            setServices((prev) => prev.filter((s) => s._id !== service._id));
          } catch (err) { showError('Error', err.message || 'Something went wrong'); }
        },
      },
    ]);
  };

  const handleToggleActive = async (service) => {
    try {
      await api.put(`/owner/services/${service._id}`, { isActive: !service.isActive });
      setServices((prev) => prev.map((s) => s._id === service._id ? { ...s, isActive: !s.isActive } : s));
    } catch (err) { showError('Error', err.message || 'Something went wrong'); }
  };

  // ── Group services by category ────────────────────────────────
  const grouped = services.reduce((acc, svc) => {
    const cat = svc.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });

  const isUnisex = salon?.servedGender === 'unisex';

  const renderServiceRow = (s) => (
    <View key={s._id} style={[styles.serviceRow, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.serviceName, { color: theme.text }]}>{s.name}</Text>
          <View style={[styles.badge, { backgroundColor: s.isActive ? '#dcfce7' : '#f3f4f6' }]}>
            <Text style={[styles.badgeText, { color: s.isActive ? '#16a34a' : '#9ca3af' }]}>
              {s.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        {s.description ? <Text style={[styles.serviceDesc, { color: theme.subText }]} numberOfLines={1}>{s.description}</Text> : null}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={12} color={theme.subText} />
            <Text style={[styles.metaText, { color: theme.subText }]}>₹{s.basePrice}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={theme.subText} />
            <Text style={[styles.metaText, { color: theme.subText }]}>{s.duration} min</Text>
          </View>
        </View>
      </View>
      <View style={styles.rowActions}>
        <Switch
          value={s.isActive !== false}
          onValueChange={() => handleToggleActive(s)}
          trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
          thumbColor={s.isActive !== false ? '#2563eb' : '#9ca3af'}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity onPress={() => { setEditingService(s); setModalVisible(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="create-outline" size={18} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAccordionGroup = ([cat, svcs]) => {
    const isOpen = expandedCat === cat;

    // Gender split for unisex
    const menSvcs   = isUnisex ? svcs.filter(s => classifySvc(s) === 'male')   : [];
    const womenSvcs = isUnisex ? svcs.filter(s => classifySvc(s) === 'female') : [];
    const bothSvcs  = isUnisex ? svcs.filter(s => classifySvc(s) === 'both')   : [];

    return (
      <View key={cat} style={[styles.accordionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setExpandedCat(isOpen ? null : cat)}
          activeOpacity={0.7}
        >
          <Text style={styles.catEmoji}>{CAT_ICON[cat] || '✨'}</Text>
          <Text style={[styles.accordionTitle, { color: theme.text }]}>{cat}</Text>
          <Text style={[styles.accordionCount, { color: theme.subText }]}>{svcs.length}</Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
        </TouchableOpacity>

        {isOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
            {!isUnisex ? (
              svcs.map(renderServiceRow)
            ) : (
              <>
                {bothSvcs.length > 0 && bothSvcs.map(renderServiceRow)}
                {menSvcs.length > 0 && (
                  <>
                    <View style={[styles.genderHeader, { backgroundColor: '#eff6ff' }]}>
                      <Text style={[styles.genderHeaderText, { color: '#2563eb' }]}>👨 Men</Text>
                    </View>
                    {menSvcs.map(renderServiceRow)}
                  </>
                )}
                {womenSvcs.length > 0 && (
                  <>
                    <View style={[styles.genderHeader, { backgroundColor: '#fdf2f8' }]}>
                      <Text style={[styles.genderHeaderText, { color: '#be185d' }]}>👩 Women</Text>
                    </View>
                    {womenSvcs.map(renderServiceRow)}
                  </>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Service Menu section (offeredCategories) ──────────────────
  const renderServiceMenu = () => {
    if (!salon?.offeredCategories?.length) return null;

    const sortedCats = [...salon.offeredCategories].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.name), bi = CATEGORY_ORDER.indexOf(b.name);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });

    return (
      <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.menuCardHeader}>
          <View>
            <Text style={[styles.menuCardTitle, { color: theme.text }]}>Service Menu</Text>
            <Text style={[styles.menuCardSub, { color: theme.subText }]}>
              Serves {salon.servedGender || 'unisex'} customers
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {salon.kidsHaircut && (
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>👶 Kids</Text>
              </View>
            )}
            {salon.atHomeServices && (
              <View style={[styles.optionBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.optionBadgeText, { color: '#166534' }]}>🏠 At-Home</Text>
              </View>
            )}
          </View>
        </View>

        {sortedCats.map((cat, idx) => {
          const subs = cat.subServices || [];
          const isMaleOnlyCat   = MALE_ONLY_CATS.includes(cat.name);
          const isFemaleOnlyCat = FEMALE_ONLY_CATS.includes(cat.name);
          const showSplit = isUnisex && !isMaleOnlyCat && !isFemaleOnlyCat;

          const menSubs   = showSplit ? subs.filter(s => classifySub(s, cat.name) === 'male')   : [];
          const womenSubs = showSplit ? subs.filter(s => classifySub(s, cat.name) === 'female') : [];
          const bothSubs  = showSplit ? subs.filter(s => classifySub(s, cat.name) === 'both')   : [];

          return (
            <View key={idx} style={[styles.menuCatCard, { borderColor: theme.border }]}>
              <Text style={[styles.menuCatTitle, { color: theme.text }]}>
                {CAT_ICON[cat.name] || '✨'} {cat.name}
                {isUnisex && isMaleOnlyCat   ? '  👨' : ''}
                {isUnisex && isFemaleOnlyCat ? '  👩' : ''}
              </Text>
              {subs.length === 0 ? (
                <Text style={[styles.noSubs, { color: theme.subText }]}>No sub-services selected</Text>
              ) : showSplit ? (
                <View style={{ gap: 8 }}>
                  {bothSubs.length > 0 && (
                    <View style={styles.subChipsRow}>
                      {bothSubs.map((s, i) => <SubChip key={i} sub={s} />)}
                    </View>
                  )}
                  {menSubs.length > 0 && (
                    <View>
                      <Text style={styles.genderLabel_m}>👨 Men</Text>
                      <View style={styles.subChipsRow}>{menSubs.map((s, i) => <SubChip key={i} sub={s} />)}</View>
                    </View>
                  )}
                  {womenSubs.length > 0 && (
                    <View>
                      <Text style={styles.genderLabel_f}>👩 Women</Text>
                      <View style={styles.subChipsRow}>{womenSubs.map((s, i) => <SubChip key={i} sub={s} />)}</View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.subChipsRow}>
                  {subs.map((s, i) => <SubChip key={i} sub={s} />)}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 14 + insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingService(null); setModalVisible(true); }}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Service Menu (offeredCategories) */}
          {renderServiceMenu()}

          {/* Services grouped by category */}
          {sortedGroups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="cut-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 14 }}>No services yet. Tap Add to create one.</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: theme.subText }]}>
                {services.length} service{services.length !== 1 ? 's' : ''} in your salon
              </Text>
              {sortedGroups.map(renderAccordionGroup)}
            </>
          )}
        </ScrollView>
      )}

      <ServiceModal
        visible={modalVisible}
        service={editingService}
        salon={salon}
        onClose={() => { setModalVisible(false); setEditingService(null); }}
        onSaved={fetchServices}
      />
    </View>
  );
}

// ── Sub-service chip ────────────────────────────────────────────
function SubChip({ sub }) {
  const name  = typeof sub === 'string' ? sub : sub.name;
  const price = typeof sub === 'object' ? sub.price : null;
  return (
    <View style={styles.subChip}>
      <Text style={styles.subChipText}>{name}</Text>
      {price > 0 && <Text style={styles.subChipPrice}>₹{price}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Service Menu
  menuCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  menuCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  menuCardTitle: { fontSize: 15, fontWeight: '700' },
  menuCardSub: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  optionBadge: { backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  optionBadgeText: { fontSize: 11, fontWeight: '600', color: '#854d0e' },
  menuCatCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  menuCatTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  noSubs: { fontSize: 12 },
  subChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  subChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  subChipText: { fontSize: 11, color: '#475569' },
  subChipPrice: { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  genderLabel_m: { fontSize: 11, fontWeight: '700', color: '#2563eb', marginBottom: 4 },
  genderLabel_f: { fontSize: 11, fontWeight: '700', color: '#be185d', marginBottom: 4 },

  // Accordion
  sectionLabel: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  accordionCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  catEmoji: { fontSize: 16 },
  accordionTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  accordionCount: { fontSize: 12 },
  accordionBody: { borderTopWidth: 1 },
  genderHeader: { paddingHorizontal: 14, paddingVertical: 6 },
  genderHeaderText: { fontSize: 12, fontWeight: '700' },

  // Service row
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  serviceName: { fontSize: 14, fontWeight: '600' },
  serviceDesc: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { flex: 1, padding: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#111827' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  chipEmoji: { fontSize: 13 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
