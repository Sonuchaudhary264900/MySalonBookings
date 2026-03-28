import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, Switch, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
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

function classifyMenuSub(s, catName) {
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

// ── Stats Bar ───────────────────────────────────────────────────
function StatsBar({ total, active, inactive, theme }) {
  const stats = [
    { label: 'Total',    value: total,    icon: 'layers-outline',       iconColor: '#6366f1', bg: '#eef2ff' },
    { label: 'Active',   value: active,   icon: 'checkmark-circle-outline', iconColor: '#16a34a', bg: '#dcfce7' },
    { label: 'Inactive', value: inactive, icon: 'close-circle-outline', iconColor: '#9ca3af', bg: '#f3f4f6' },
  ];
  return (
    <View style={styles.statsRow}>
      {stats.map(({ label, value, icon, iconColor, bg }) => (
        <View key={label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <View>
            <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Service Menu Sub Chip ───────────────────────────────────────
function SubChip({ sub, theme }) {
  const name  = typeof sub === 'string' ? sub : sub.name;
  const price = typeof sub === 'object' ? sub.price : null;
  return (
    <View style={[styles.subChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.subChipText, { color: theme.subText }]}>{name}</Text>
      {price > 0 && <Text style={[styles.subChipPrice, { color: theme.accent }]}>₹{price}</Text>}
    </View>
  );
}

// ── Service Menu Section (collapsible preview) ──────────────────
function ServiceMenuSection({ salon, theme }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (!salon?.offeredCategories?.length) return null;

  const isUnisex = salon.servedGender === 'unisex';

  const sortedCategories = [...salon.offeredCategories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.name), bi = CATEGORY_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <View style={[styles.menuSectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header */}
      <View style={[styles.menuSectionHeader, { borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13 }}>✨</Text>
            <Text style={[styles.menuSectionTitle, { color: theme.text }]}>Service Menu</Text>
          </View>
          <Text style={[styles.menuSectionSub, { color: theme.subText }]}>
            Serves{' '}
            <Text style={{ color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}>
              {salon.servedGender}
            </Text>{' '}
            customers
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {salon.kidsHaircut && (
            <View style={styles.optBadge}>
              <Text style={styles.optBadgeText}>👶 Kids</Text>
            </View>
          )}
          {salon.atHomeServices && (
            <View style={[styles.optBadge, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
              <Text style={[styles.optBadgeText, { color: '#166534' }]}>🏠 At-Home</Text>
            </View>
          )}
        </View>
      </View>

      {/* Category accordion */}
      {sortedCategories.map((cat, idx) => {
        const subs = cat.subServices || [];
        const isOpen = expandedIdx === idx;
        const isMaleOnly   = MALE_ONLY_CATS.includes(cat.name);
        const isFemaleOnly = FEMALE_ONLY_CATS.includes(cat.name);
        const showSplit = isUnisex && !isMaleOnly && !isFemaleOnly;

        const menSubs   = showSplit ? subs.filter(s => classifyMenuSub(s, cat.name) === 'male')   : [];
        const womenSubs = showSplit ? subs.filter(s => classifyMenuSub(s, cat.name) === 'female') : [];
        const bothSubs  = showSplit ? subs.filter(s => classifyMenuSub(s, cat.name) === 'both')   : [];

        return (
          <View key={idx}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            <TouchableOpacity
              style={[styles.menuCatRow, { backgroundColor: theme.card }]}
              onPress={() => setExpandedIdx(isOpen ? null : idx)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuCatEmoji}>{CAT_ICON[cat.name] || '✨'}</Text>
              <Text style={[styles.menuCatName, { color: theme.text }]}>{cat.name}</Text>
              {isUnisex && isMaleOnly   && <Text style={styles.genderTagM}>👨 Men</Text>}
              {isUnisex && isFemaleOnly && <Text style={styles.genderTagF}>👩 Women</Text>}
              <Text style={[styles.menuCatCount, { color: theme.subText }]}>{subs.length}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.subText} />
            </TouchableOpacity>

            {isOpen && (
              <View style={[styles.menuCatBody, { backgroundColor: theme.bg }]}>
                {subs.length === 0 ? (
                  <Text style={[styles.noSubsText, { color: theme.subText }]}>No sub-services selected</Text>
                ) : showSplit ? (
                  <View style={{ gap: 10 }}>
                    {bothSubs.length > 0 && (
                      <View style={styles.subChipsWrap}>
                        {bothSubs.map((s, i) => <SubChip key={i} sub={s} theme={theme} />)}
                      </View>
                    )}
                    {menSubs.length > 0 && (
                      <View>
                        <Text style={styles.gTagM}>👨 Men</Text>
                        <View style={styles.subChipsWrap}>
                          {menSubs.map((s, i) => <SubChip key={i} sub={s} theme={theme} />)}
                        </View>
                      </View>
                    )}
                    {womenSubs.length > 0 && (
                      <View>
                        <Text style={styles.gTagF}>👩 Women</Text>
                        <View style={styles.subChipsWrap}>
                          {womenSubs.map((s, i) => <SubChip key={i} sub={s} theme={theme} />)}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.subChipsWrap}>
                    {subs.map((s, i) => <SubChip key={i} sub={s} theme={theme} />)}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Service Card ────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onDelete, onToggle, theme }) {
  const isActive = service.isActive !== false;

  const handleToggle = () => {
    if (isActive) {
      Alert.alert(
        'Disable Service?',
        `"${service.name}" will be hidden from customers and cannot be booked.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Disable', style: 'destructive', onPress: () => onToggle(service._id, false) },
        ]
      );
    } else {
      onToggle(service._id, true);
    }
  };

  return (
    <View style={[
      styles.serviceCard,
      { backgroundColor: theme.card, borderColor: isActive ? theme.border : theme.border },
      !isActive && { opacity: 0.65 },
    ]}>
      {/* Top row: name + toggle */}
      <View style={styles.serviceCardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={[styles.serviceCardName, { color: isActive ? theme.text : theme.subText }]} numberOfLines={1}>
              {service.name}
            </Text>
            {!isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
          {service.category && (
            <View style={styles.categoryRow}>
              <Ionicons name="pricetag-outline" size={11} color="#6366f1" />
              <Text style={styles.categoryText}>{service.category}</Text>
            </View>
          )}
        </View>
        <Switch
          value={isActive}
          onValueChange={handleToggle}
          trackColor={{ false: '#d1d5db', true: '#6366f1' }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      </View>

      {/* Price + Duration */}
      <View style={styles.serviceCardMeta}>
        <View style={styles.priceRow}>
          <Ionicons name="logo-usd" size={13} color="#16a34a" />
          <Text style={styles.priceText}>₹{service.basePrice ?? service.price ?? '—'}</Text>
        </View>
        {!!service.duration && (
          <>
            <View style={styles.metaDivider} />
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={13} color={theme.subText} />
              <Text style={[styles.durationText, { color: theme.subText }]}>{service.duration} min</Text>
            </View>
          </>
        )}
      </View>

      {/* Action buttons */}
      <View style={[styles.serviceCardActions, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
          onPress={() => onEdit(service)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={14} color={theme.subText} />
          <Text style={[styles.actionBtnText, { color: theme.subText }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
          onPress={() => onDelete(service)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color="#dc2626" />
          <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ onAdd, theme }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="cut-outline" size={36} color="#a5b4fc" />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No services added yet</Text>
      <Text style={[styles.emptyDesc, { color: theme.subText }]}>
        Start by adding the services your salon offers to attract customers and enable bookings.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Add Your First Service</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Service Modal ───────────────────────────────────────────────
function ServiceModal({ visible, service, salon, onClose, onSaved }) {
  const editing = !!service?._id;
  const { theme } = useTheme();
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

  const availableCategories = salon?.offeredCategories?.length > 0
    ? salon.offeredCategories.map(c => c.name)
    : CATEGORY_ORDER;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Service' : 'Add Service'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.subText} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {[
            { label: 'Service Name *', value: name, setter: setName, placeholder: 'e.g. Basic Haircut', keyboard: 'default' },
            { label: 'Description', value: description, setter: setDescription, placeholder: 'Brief description…', keyboard: 'default' },
            { label: 'Price (₹) *', value: basePrice, setter: setBasePrice, placeholder: '0', keyboard: 'numeric' },
            { label: 'Duration (minutes) *', value: duration, setter: setDuration, placeholder: '30', keyboard: 'numeric' },
          ].map((f) => (
            <View style={styles.field} key={f.label}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                placeholder={f.placeholder}
                placeholderTextColor={theme.subText}
                keyboardType={f.keyboard}
                value={f.value}
                onChangeText={f.setter}
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Category</Text>
            <View style={styles.chipsRow}>
              {availableCategories.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, { borderColor: theme.border, backgroundColor: theme.bg }, category === c && styles.catChipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={styles.catChipEmoji}>{CAT_ICON[c] || '✨'}</Text>
                  <Text style={[styles.catChipText, { color: theme.text }, category === c && styles.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#d1d5db', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Service'}</Text>
            }
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
  const [search, setSearch]             = useState('');
  const [showMenuSection, setShowMenuSection] = useState(false);

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
    Alert.alert('Delete Service', `Delete "${service.name}"?\nThis cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/services/${service._id}`);
            setServices(prev => prev.filter(s => s._id !== service._id));
          } catch (err) {
            Alert.alert('Error', err.message || 'Something went wrong');
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (serviceId, isActive) => {
    try {
      await api.put(`/owner/services/${serviceId}`, { isActive });
      setServices(prev => prev.map(s => s._id === serviceId ? { ...s, isActive } : s));
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    }
  };

  // ── Derived data ──────────────────────────────────────────────
  const activeCount   = services.filter(s => s.isActive !== false).length;
  const inactiveCount = services.length - activeCount;

  const filteredServices = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
  }, [services, search]);

  // Group by category
  const grouped = useMemo(() => {
    const g = filteredServices.reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});
    return Object.entries(g).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  }, [filteredServices]);

  const isUnisex = salon?.servedGender === 'unisex';

  const renderAccordionGroup = ([cat, svcs]) => {
    const isOpen = expandedCat === cat;
    const isMaleOnly   = MALE_ONLY_CATS.includes(cat);
    const isFemaleOnly = FEMALE_ONLY_CATS.includes(cat);
    const showSplit = isUnisex && !isMaleOnly && !isFemaleOnly;

    const menSvcs   = showSplit ? svcs.filter(s => classifySvc(s) === 'male')   : [];
    const womenSvcs = showSplit ? svcs.filter(s => classifySvc(s) === 'female') : [];
    const bothSvcs  = showSplit ? svcs.filter(s => classifySvc(s) === 'both')   : [];

    const renderCards = (list) => list.map(svc => (
      <ServiceCard
        key={svc._id}
        service={svc}
        theme={theme}
        onEdit={s => { setEditingService(s); setModalVisible(true); }}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
      />
    ));

    return (
      <View key={cat} style={[styles.accordionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Category header */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setExpandedCat(isOpen ? null : cat)}
          activeOpacity={0.7}
        >
          <Text style={styles.accordionEmoji}>{CAT_ICON[cat] || '✨'}</Text>
          <Text style={[styles.accordionTitle, { color: theme.text }]}>{cat}</Text>
          {isUnisex && isMaleOnly   && <Text style={styles.genderTagM}>👨 Men</Text>}
          {isUnisex && isFemaleOnly && <Text style={styles.genderTagF}>👩 Women</Text>}
          <View style={[styles.countBadge, { backgroundColor: theme.bg }]}>
            <Text style={[styles.countBadgeText, { color: theme.subText }]}>{svcs.length}</Text>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
        </TouchableOpacity>

        {/* Expanded services */}
        {isOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
            {!showSplit ? (
              renderCards(svcs)
            ) : (
              <View style={{ gap: 12 }}>
                {bothSvcs.length > 0 && renderCards(bothSvcs)}
                {menSvcs.length > 0 && (
                  <View>
                    <View style={styles.genderSeparator}>
                      <View style={[styles.genderLine, { backgroundColor: '#bfdbfe' }]} />
                      <Text style={styles.genderSepTextM}>👨 Men</Text>
                      <View style={[styles.genderLine, { backgroundColor: '#bfdbfe' }]} />
                    </View>
                    {renderCards(menSvcs)}
                  </View>
                )}
                {womenSvcs.length > 0 && (
                  <View>
                    <View style={styles.genderSeparator}>
                      <View style={[styles.genderLine, { backgroundColor: '#fbcfe8' }]} />
                      <Text style={styles.genderSepTextF}>👩 Women</Text>
                      <View style={[styles.genderLine, { backgroundColor: '#fbcfe8' }]} />
                    </View>
                    {renderCards(womenSvcs)}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cut" size={14} color="#fff" />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Services</Text>
            </View>
            <Text style={[styles.headerSub, { color: theme.subText, marginTop: 1, marginLeft: 36 }]}>Manage your salon services and pricing</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.menuBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
              onPress={() => navigation.navigate('ServiceMenu')}
              activeOpacity={0.8}
            >
              <Ionicons name="list-outline" size={14} color={theme.text} />
              <Text style={[styles.menuBtnText, { color: theme.text }]}>Service Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setEditingService(null); setModalVisible(true); }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats bar */}
          {services.length > 0 && (
            <StatsBar total={services.length} active={activeCount} inactive={inactiveCount} theme={theme} />
          )}

          {/* View offered service categories toggle */}
          {salon?.offeredCategories?.length > 0 && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={styles.menuToggleBtn}
                onPress={() => setShowMenuSection(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12 }}>✨</Text>
                <Text style={styles.menuToggleText}>
                  {showMenuSection ? 'Hide' : 'View'} offered service categories
                </Text>
                <Ionicons name={showMenuSection ? 'chevron-up' : 'chevron-down'} size={13} color="#6366f1" />
              </TouchableOpacity>
              {showMenuSection && <ServiceMenuSection salon={salon} theme={theme} />}
            </View>
          )}

          {/* Search bar */}
          {services.length > 0 && (
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={16} color={theme.subText} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search services by name or category…"
                placeholderTextColor={theme.subText}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={theme.subText} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          {services.length === 0 ? (
            <EmptyState onAdd={() => { setEditingService(null); setModalVisible(true); }} theme={theme} />
          ) : filteredServices.length === 0 ? (
            <View style={styles.noResultsWrap}>
              <Ionicons name="search-outline" size={40} color={theme.border} />
              <Text style={[styles.noResultsText, { color: theme.subText }]}>No services match "{search}"</Text>
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearSearchText}>Clear search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {grouped.map(renderAccordionGroup)}
            </View>
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

const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 14, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  menuBtnText: { fontSize: 12, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#6366f1' },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Stats bar
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1 },
  statIconCircle: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statValue: { fontSize: 17, fontWeight: '800', lineHeight: 20 },
  statLabel: { fontSize: 10, fontWeight: '500', marginTop: 1 },

  // Menu toggle
  menuToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  menuToggleText: { fontSize: 12, fontWeight: '600', color: '#6366f1', flex: 1 },

  // Menu section card
  menuSectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  menuSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  menuSectionTitle: { fontSize: 13, fontWeight: '700' },
  menuSectionSub: { fontSize: 11, marginTop: 2 },
  optBadge: { backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  optBadgeText: { fontSize: 11, fontWeight: '600', color: '#854d0e' },
  divider: { height: 1 },
  menuCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuCatEmoji: { fontSize: 15 },
  menuCatName: { flex: 1, fontSize: 13, fontWeight: '600' },
  menuCatCount: { fontSize: 12, fontWeight: '500' },
  menuCatBody: { paddingHorizontal: 14, paddingVertical: 10 },
  noSubsText: { fontSize: 12 },
  subChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  subChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  subChipText: { fontSize: 11 },
  subChipPrice: { fontSize: 11, fontWeight: '700' },
  gTagM: { fontSize: 11, fontWeight: '700', color: '#3b82f6', marginBottom: 5 },
  gTagF: { fontSize: 11, fontWeight: '700', color: '#be185d', marginBottom: 5 },
  genderTagM: { fontSize: 11, fontWeight: '600', color: '#3b82f6' },
  genderTagF: { fontSize: 11, fontWeight: '600', color: '#be185d' },

  // Search bar
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  // Accordion
  accordionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  accordionEmoji: { fontSize: 18 },
  accordionTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countBadgeText: { fontSize: 11, fontWeight: '600' },
  accordionBody: { borderTopWidth: 1, padding: 12, gap: 10 },

  // Gender separator
  genderSeparator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  genderLine: { flex: 1, height: 1 },
  genderSepTextM: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  genderSepTextF: { fontSize: 11, fontWeight: '700', color: '#be185d' },

  // Service card
  serviceCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  serviceCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  serviceCardName: { fontSize: 14, fontWeight: '700' },
  inactiveBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: '#9ca3af' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#6366f1' },
  serviceCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  priceText: { fontSize: 16, fontWeight: '800', color: '#16a34a' },
  metaDivider: { width: 1, height: 12, backgroundColor: '#e5e7eb' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationText: { fontSize: 12 },
  serviceCardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 7 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  // Empty state
  emptyCard: { borderRadius: 14, borderWidth: 1, alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // No results
  noResultsWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  noResultsText: { fontSize: 14, fontWeight: '500' },
  clearSearchText: { fontSize: 13, color: '#6366f1', fontWeight: '500' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  catChipEmoji: { fontSize: 13 },
  catChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  catChipText: { fontSize: 12 },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
