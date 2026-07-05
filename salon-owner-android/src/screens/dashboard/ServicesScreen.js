import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, Switch, ScrollView, Animated, Image, BackHandler,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSalon } from '../../context/SalonContext';
import { showSuccess, showError } from '../../utils/toast';
import {
  getCategoriesForSalonType, CATEGORY_CARD_IMAGE_MAP, SUBCATEGORY_IMAGE_MAP,
} from '../../data/salonCategoriesFull';

// ── Category circle images — same resolution order as the website ──
const isUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);
const getCatImg = (label, salon, catalogMap) => {
  const saved = salon?.categoryImages;
  if (saved && isUrl(saved[label])) return saved[label];
  if (isUrl(catalogMap?.categoryImages?.[label])) return catalogMap.categoryImages[label];
  return CATEGORY_CARD_IMAGE_MAP[label] || null;
};

const getSubImg = (catLabel, subLabel, salon, catalogMap) => {
  const key = `${catLabel}::${subLabel}`;
  const saved = salon?.categoryImages;
  if (saved && isUrl(saved[key])) return saved[key];
  if (isUrl(catalogMap?.subCategoryImages?.[subLabel])) return catalogMap.subCategoryImages[subLabel];
  if (isUrl(catalogMap?.serviceImages?.[subLabel])) return catalogMap.serviceImages[subLabel];
  return SUBCATEGORY_IMAGE_MAP[subLabel] || null;
};

// ── CircleButton — RN port of the website's 54px category circle ──
function CircleButton({ label, imgSrc, isSelected, isAll, isAdd, uploading, onSelect, onLongPress }) {
  const { theme } = useTheme();
  const [broken, setBroken] = useState(false);
  const showImg = !isAll && !isAdd && !!imgSrc && !broken;
  return (
    <TouchableOpacity onPress={onSelect} onLongPress={onLongPress} delayLongPress={450} activeOpacity={0.8}
      style={{ alignItems: 'center', paddingHorizontal: 5, opacity: isSelected || isAdd ? 1 : 0.7, transform: [{ translateY: isSelected ? -4 : 0 }, { scale: isSelected ? 1.05 : 1 }] }}>
      <View style={[
        cb.circle,
        isSelected ? cb.circleSelected : { borderColor: 'rgba(128,128,160,0.25)' },
        !showImg && !isAll && !isAdd && { backgroundColor: isSelected ? '#6366f1' : theme.cardAlt },
        isAdd && { backgroundColor: 'rgba(99,102,241,0.08)', borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(129,140,248,0.55)' },
      ]}>
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : isAdd ? (
          <Ionicons name="add" size={26} color="#818cf8" />
        ) : isAll ? (
          <Ionicons name="grid-outline" size={21} color="#fff" />
        ) : showImg ? (
          <Image source={{ uri: imgSrc }} style={{ width: '100%', height: '100%' }} onError={() => setBroken(true)} />
        ) : (
          <Text style={{ fontSize: 18, fontWeight: '800', color: isSelected ? '#fff' : theme.subText }}>{label.charAt(0)}</Text>
        )}
      </View>
      <Text numberOfLines={2} style={[cb.label, { color: isAdd ? '#818cf8' : isSelected ? theme.accent : theme.subText, fontWeight: isSelected || isAdd ? '800' : '600' }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  circle: {
    width: 68, height: 68, borderRadius: 34, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4f46e5', borderWidth: 1.5,
  },
  circleSelected: {
    borderWidth: 3, borderColor: '#818cf8',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  label: { fontSize: 11, marginTop: 5, textAlign: 'center', maxWidth: 82 },
});

// Derive who a service is for, from its category label (category defines gender)
function genderForCategory(catLabel, salon) {
  if (/\(men\)/i.test(catLabel) || /\bmen\b/i.test(catLabel) || /beard|barber/i.test(catLabel)) return ['male'];
  if (/\(women\)/i.test(catLabel) || /\bwomen\b/i.test(catLabel) || /bridal|ladies/i.test(catLabel)) return ['female'];
  if (salon?.servedGender === 'male') return ['male'];
  if (salon?.servedGender === 'female') return ['female'];
  return ['male', 'female'];
}

// ── Menu-style row: round photo · name · sub-line · toggle ─────────
function MenuServiceRow({ img, name, subline, value, disabled, onToggle, onPress, onLongPress, uploading }) {
  const { theme } = useTheme();
  const [broken, setBroken] = useState(false);
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} onLongPress={onLongPress} delayLongPress={450}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 12 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
        {uploading ? (
          <ActivityIndicator size="small" color="#818cf8" />
        ) : img && !broken ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} onError={() => setBroken(true)} />
        ) : (
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.subText }}>{(name || '?').charAt(0)}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '700', color: theme.text }}>{name}</Text>
        {!!subline && <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.subText, marginTop: 2 }}>{subline}</Text>}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(128,128,160,0.3)', true: 'rgba(99,102,241,0.6)' }}
        thumbColor={value ? '#6366f1' : '#9ca3af'}
      />
    </TouchableOpacity>
  );
}

// Flat wide "+ Add" button under a group — like the reference design
function FlatAddButton({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(129,140,248,0.5)', backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: 16, paddingVertical: 13 }}>
      <Ionicons name="add-circle" size={18} color="#818cf8" />
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#818cf8' }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Toggle a service ON: just price & time, then it goes live
function QuickAddModal({ visible, title, initialPrice, initialDuration, onClose, onSave, saving }) {
  const { theme } = useTheme();
  const [price, setPrice]       = useState('');
  const [duration, setDuration] = useState('30');
  useEffect(() => {
    if (visible) { setPrice(initialPrice != null ? String(initialPrice) : ''); setDuration(initialDuration != null ? String(initialDuration) : '30'); }
  }, [visible]);
  const valid = price !== '' && Number(price) >= 0 && Number(duration) >= 1;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>{title}</Text>
          <Text style={{ fontSize: 12.5, color: theme.subText, marginTop: 2, marginBottom: 16 }}>Set the price and time — then customers can book it</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.subText, marginBottom: 6 }}>Price (₹) *</Text>
          <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 200" placeholderTextColor={theme.placeholder}
            style={{ borderWidth: 1.5, borderColor: theme.inputBorder, borderRadius: 12, paddingHorizontal: 13, height: 46, fontSize: 15, color: theme.text, backgroundColor: theme.input, marginBottom: 12 }} autoFocus />
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.subText, marginBottom: 6 }}>Time (minutes) *</Text>
          <TextInput value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={theme.placeholder}
            style={{ borderWidth: 1.5, borderColor: theme.inputBorder, borderRadius: 12, paddingHorizontal: 13, height: 46, fontSize: 15, color: theme.text, backgroundColor: theme.input, marginBottom: 18 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: theme.inputBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.subText }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => valid && onSave(Number(price), Number(duration))} disabled={!valid || saving}
              style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', opacity: valid && !saving ? 1 : 0.5 }}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '800' }}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Round + circle → create a category or subcategory with name + image
function CreateBucketModal({ visible, kind, onClose, onCreate, creating }) {
  const { theme } = useTheme();
  const [name, setName]     = useState('');
  const [imgUri, setImgUri] = useState(null);
  useEffect(() => { if (visible) { setName(''); setImgUri(null); } }, [visible]);
  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission denied', 'Gallery access is required'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (!r.canceled) setImgUri(r.assets[0].uri);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 14 }}>
            New {kind === 'category' ? 'Category' : 'Service'}
          </Text>
          <TouchableOpacity onPress={pick} activeOpacity={0.8} style={{ alignSelf: 'center', marginBottom: 14 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, overflow: 'hidden', backgroundColor: theme.cardAlt, borderWidth: 2, borderStyle: imgUri ? 'solid' : 'dashed', borderColor: 'rgba(129,140,248,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              {imgUri ? <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="camera-outline" size={26} color="#818cf8" />}
            </View>
            <Text style={{ fontSize: 11, color: '#818cf8', fontWeight: '700', textAlign: 'center', marginTop: 5 }}>{imgUri ? 'Change photo' : 'Add photo (optional)'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.subText, marginBottom: 6 }}>Name *</Text>
          <TextInput value={name} onChangeText={setName} placeholder={kind === 'category' ? 'e.g. Nail Art' : 'e.g. Premium Haircut'} placeholderTextColor={theme.placeholder}
            style={{ borderWidth: 1.5, borderColor: theme.inputBorder, borderRadius: 12, paddingHorizontal: 13, height: 46, fontSize: 15, color: theme.text, backgroundColor: theme.input, marginBottom: 18 }} autoFocus />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: theme.inputBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.subText }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => name.trim() && onCreate(name.trim(), imgUri)} disabled={!name.trim() || creating}
              style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', opacity: name.trim() && !creating ? 1 : 0.5 }}>
              {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '800' }}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Category constants ──────────────────────────────────────────
const CATEGORY_ORDER = [
  'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
  'Beard & Grooming', 'Nail Services',
  'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
  'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
  'Bridal & Events', 'Kids Services', 'At-Home Services',
];

const CAT_IONICON = {
  'Hair Services': 'cut-outline',       'Hair Services (Men)': 'cut-outline',   'Hair Services (Women)': 'cut-outline',
  'Beard & Grooming': 'person-outline', 'Nail Services': 'color-palette-outline',
  'Skin & Face / Beauty': 'water-outline', 'Skin & Face (Men Grooming)': 'water-outline', 'Skin & Beauty': 'water-outline',
  'Spa & Massage': 'leaf-outline',      'Spa & Relaxation': 'leaf-outline',     'Body Grooming': 'body-outline',
  'Bridal & Events': 'star-outline',    'Kids Services': 'happy-outline',       'At-Home Services': 'home-outline',
  'Men Dermatology': 'medkit-outline',  'Skin Dermatology': 'medkit-outline',
  'Makeup & Styling': 'brush-outline',
};
const getCatIcon = (label) => CAT_IONICON[label] || 'sparkles-outline';

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
            <Ionicons name="sparkles-outline" size={14} color={theme.accent} />
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
              <Ionicons name="happy-outline" size={11} color="#92400e" />
              <Text style={styles.optBadgeText}> Kids</Text>
            </View>
          )}
          {salon.atHomeServices && (
            <View style={[styles.optBadge, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
              <Ionicons name="home-outline" size={11} color="#166534" />
              <Text style={[styles.optBadgeText, { color: '#166534' }]}> At-Home</Text>
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
              <View style={styles.menuCatIconBox}>
                <Ionicons name={getCatIcon(cat.name)} size={16} color={theme.accent} />
              </View>
              <Text style={[styles.menuCatName, { color: theme.text }]}>{cat.name}</Text>
              {isUnisex && isMaleOnly   && <View style={styles.genderTagM}><Ionicons name="person-outline" size={10} color="#2563eb" /><Text style={styles.genderTagMTxt}> Men</Text></View>}
              {isUnisex && isFemaleOnly && <View style={styles.genderTagF}><Ionicons name="woman-outline" size={10} color="#db2777" /><Text style={styles.genderTagFTxt}> Women</Text></View>}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}><Ionicons name="person-outline" size={10} color="#2563eb" /><Text style={styles.gTagM}>Men</Text></View>
                        <View style={styles.subChipsWrap}>
                          {menSubs.map((s, i) => <SubChip key={i} sub={s} theme={theme} />)}
                        </View>
                      </View>
                    )}
                    {womenSubs.length > 0 && (
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}><Ionicons name="woman-outline" size={10} color="#db2777" /><Text style={styles.gTagF}>Women</Text></View>
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
        Start by adding the services your business offers to attract customers and enable bookings.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Add Your First Service</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Category options by gender (mirrors website ServiceModal) ───
const MALE_CAT_OPTIONS = [
  { label: 'Hair Services (Men)' }, { label: 'Beard & Grooming' },
  { label: 'Spa & Massage' }, { label: 'Skin & Face (Men Grooming)' }, { label: 'Body Grooming' },
];
const FEMALE_CAT_OPTIONS = [
  { label: 'Hair Services (Women)' }, { label: 'Nail Services' },
  { label: 'Skin & Beauty' }, { label: 'Body Grooming' },
  { label: 'Spa & Relaxation' }, { label: 'Bridal & Events' },
];
const UNISEX_CAT_OPTIONS = [
  { label: 'Hair Services' }, { label: 'Beard & Grooming' },
  { label: 'Nail Services' }, { label: 'Skin & Face / Beauty' },
  { label: 'Spa & Massage' }, { label: 'Body Grooming' },
  { label: 'Bridal & Events' }, { label: 'Kids Services' }, { label: 'At-Home Services' },
];

function getCategoryOptions(servedGender, offeredCategories) {
  if (offeredCategories && offeredCategories.length > 0) {
    return offeredCategories.map(c => ({ label: c.name }));
  }
  if (servedGender === 'male')   return MALE_CAT_OPTIONS;
  if (servedGender === 'female') return FEMALE_CAT_OPTIONS;
  return UNISEX_CAT_OPTIONS;
}

// ── Service Modal ───────────────────────────────────────────────
function ServiceModal({ visible, service, salon, onClose, onSaved }) {
  const editing = !!service?._id;
  const { theme } = useTheme();
  const servedGender = salon?.servedGender || 'male';
  const categoryOptions = getCategoryOptions(servedGender, salon?.offeredCategories);

  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [basePrice, setBasePrice]         = useState('');
  const [duration, setDuration]           = useState('30');
  const [category, setCategory]           = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [catExpanded, setCatExpanded]     = useState(false);
  const [applicableFor, setApplicableFor] = useState(
    servedGender === 'unisex' ? 'both' : servedGender
  );
  const [isActive, setIsActive]           = useState(true);
  const [loading, setLoading]             = useState(false);
  const [errors, setErrors]               = useState({});
  const [photoUri, setPhotoUri]           = useState(null);
  const [photoUrl, setPhotoUrl]           = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setBasePrice(String(service.basePrice ?? ''));
      setDuration(String(service.duration ?? '30'));
      const cat = service.category || '';
      const isCustom = cat && !categoryOptions.find(o => o.label === cat);
      setCustomCategory(isCustom ? cat : '');
      setCategory(cat);
      setIsActive(service.isActive !== false);
      const af = service.applicableFor || [];
      if (servedGender !== 'unisex') {
        setApplicableFor(servedGender);
      } else if (af.length === 1) {
        setApplicableFor(af[0]);
      } else {
        setApplicableFor('both');
      }
      setPhotoUrl(service.photos?.[0] || '');
      setPhotoUri(null);
    } else {
      setName(''); setDescription(''); setBasePrice(''); setDuration('30');
      setCategory(''); setCustomCategory(''); setIsActive(true);
      setApplicableFor(servedGender === 'unisex' ? 'both' : servedGender);
      setPhotoUrl('');
      setPhotoUri(null);
    }
    setErrors({});
    setCatExpanded(false);
  }, [service, visible]);

  const handleSave = async () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Service name is required';
    if (servedGender === 'unisex' && !applicableFor) errs.applicableFor = 'Please select who this service is for';
    if (!category || category === '__other__') errs.category = 'Please select a category';
    if (!basePrice) errs.basePrice = 'Price is required';
    else if (isNaN(Number(basePrice)) || Number(basePrice) < 0) errs.basePrice = 'Price must be a positive number';
    if (!duration) errs.duration = 'Duration is required';
    else if (isNaN(Number(duration)) || Number(duration) < 1) errs.duration = 'Duration must be at least 1 min';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setLoading(true);
    try {
      const applicableForArr =
        applicableFor === 'both' ? ['male', 'female'] : [applicableFor];

      let photos = photoUrl ? [photoUrl] : [];
      if (photoUri) {
        setPhotoUploading(true);
        try {
          const filename = photoUri.split('/').pop();
          const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
          const formData = new FormData();
          formData.append('photo', { uri: photoUri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
          const uploadRes = await api.post('/owner/services/upload-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });
          const url = uploadRes.data.data?.url;
          if (url) photos = [url];
        } catch { /* non-blocking */ } finally {
          setPhotoUploading(false);
        }
      } else if (!photoUrl) {
        photos = [];
      }

      const payload = {
        name: name.trim(),
        description: description.trim(),
        basePrice: Number(basePrice),
        duration: Number(duration),
        category,
        isActive,
        applicableFor: applicableForArr,
        photos,
      };
      if (editing) {
        await api.put(`/owner/services/${service._id}`, payload);
      } else {
        await api.post('/owner/services', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ general: err.message || 'Failed to save service' });
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
    setPhotoUrl('');
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
    setPhotoUrl('');
  };

  const isCatCustom = category && !categoryOptions.find(o => o.label === category);

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
          {!!errors.general && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* Service Name */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Service Name *</Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.text, borderColor: errors.name ? '#dc2626' : theme.border, backgroundColor: theme.bg }]}
              placeholder="e.g. Basic Haircut"
              placeholderTextColor={theme.subText}
              value={name}
              onChangeText={t => { setName(t); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
            />
            {!!errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
          </View>

          {/* Applicable For — unisex salons only */}
          {servedGender === 'unisex' && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Applicable For *</Text>
              <View style={styles.applicableRow}>
                {[['male', 'person-outline', 'Men'], ['female', 'woman-outline', 'Women'], ['both', 'people-outline', 'Both']].map(([val, iconName, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.applicableBtn,
                      { borderColor: errors.applicableFor ? '#dc2626' : theme.border },
                      applicableFor === val && styles.applicableBtnActive,
                    ]}
                    onPress={() => { setApplicableFor(val); if (errors.applicableFor) setErrors(p => ({ ...p, applicableFor: '' })); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={iconName} size={12} color={applicableFor === val ? '#fff' : theme.subText} />
                    <Text style={[styles.applicableBtnText, { color: theme.subText }, applicableFor === val && styles.applicableBtnTextActive]}>
                      {' '}{label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!errors.applicableFor && <Text style={styles.fieldError}>{errors.applicableFor}</Text>}
            </View>
          )}

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Category *</Text>
            <TouchableOpacity
              style={[
                styles.catTrigger,
                {
                  borderColor: errors.category ? '#dc2626' : (category && category !== '__other__' ? '#6366f1' : theme.border),
                  backgroundColor: category && category !== '__other__' ? '#eef2ff' : theme.bg,
                },
              ]}
              onPress={() => setCatExpanded(o => !o)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                {category && category !== '__other__' && (
                  <Ionicons name={getCatIcon(category)} size={14} color="#4338ca" />
                )}
                {category === '__other__' && (
                  <Ionicons name="pencil-outline" size={14} color={theme.subText} />
                )}
                <Text style={[styles.catTriggerText, { color: (category && category !== '__other__') ? '#4338ca' : theme.subText }]}>
                  {category && category !== '__other__' ? category : category === '__other__' ? 'Other…' : 'Select category…'}
                </Text>
              </View>
              <Ionicons name={catExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
            </TouchableOpacity>

            {catExpanded && (
              <View style={[styles.catGrid, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                {categoryOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.catGridItem,
                      { borderColor: theme.border, backgroundColor: theme.card },
                      category === opt.label && styles.catGridItemActive,
                    ]}
                    onPress={() => {
                      setCustomCategory('');
                      setCategory(opt.label);
                      if (errors.category) setErrors(p => ({ ...p, category: '' }));
                      setCatExpanded(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={getCatIcon(opt.label)} size={18} color={category === opt.label ? '#4338ca' : theme.subText} />
                    <Text
                      style={[styles.catGridItemText, { color: theme.text }, category === opt.label && { color: '#4338ca', fontWeight: '700' }]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Other option */}
                <TouchableOpacity
                  style={[
                    styles.catGridItem,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    (category === '__other__' || isCatCustom) && styles.catGridItemActive,
                  ]}
                  onPress={() => { setCategory('__other__'); if (errors.category) setErrors(p => ({ ...p, category: '' })); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={18} color={(category === '__other__' || isCatCustom) ? '#4338ca' : theme.subText} />
                  <Text style={[styles.catGridItemText, { color: theme.text }, (category === '__other__' || isCatCustom) && { color: '#4338ca', fontWeight: '700' }]}>
                    Other
                  </Text>
                </TouchableOpacity>

                {/* Custom category input */}
                {(category === '__other__' || (isCatCustom && customCategory)) && (
                  <View style={styles.customCatRow}>
                    <TextInput
                      style={[styles.customCatInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      placeholder="Type category name…"
                      placeholderTextColor={theme.subText}
                      value={customCategory}
                      onChangeText={setCustomCategory}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.customCatBtn, !customCategory.trim() && { opacity: 0.5 }]}
                      onPress={() => {
                        const val = customCategory.trim();
                        if (!val) return;
                        setCategory(val);
                        if (errors.category) setErrors(p => ({ ...p, category: '' }));
                        setCatExpanded(false);
                      }}
                      disabled={!customCategory.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.customCatBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            {!!errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Optional description…"
              placeholderTextColor={theme.subText}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Price (₹) *</Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.text, borderColor: errors.basePrice ? '#dc2626' : theme.border, backgroundColor: theme.bg }]}
              placeholder="e.g. 200"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
              value={basePrice}
              onChangeText={t => { setBasePrice(t); if (errors.basePrice) setErrors(p => ({ ...p, basePrice: '' })); }}
            />
            {!!errors.basePrice && <Text style={styles.fieldError}>{errors.basePrice}</Text>}
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Duration (minutes) *</Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.text, borderColor: errors.duration ? '#dc2626' : theme.border, backgroundColor: theme.bg }]}
              placeholder="e.g. 30"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
              value={duration}
              onChangeText={t => { setDuration(t); if (errors.duration) setErrors(p => ({ ...p, duration: '' })); }}
            />
            {!!errors.duration && <Text style={styles.fieldError}>{errors.duration}</Text>}
          </View>

          {/* Service Photo — optional */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>
              Service Photo <Text style={{ color: theme.subText, fontWeight: '400' }}>(optional)</Text>
            </Text>
            {(photoUri || photoUrl) ? (
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: photoUri || photoUrl }}
                  style={{ width: '100%', height: 140, borderRadius: 10 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={handleRemovePhoto}
                  style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 10, height: 100, alignItems: 'center', justifyContent: 'center', gap: 6 }}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={28} color={theme.subText} />
                <Text style={{ color: theme.subText, fontSize: 13 }}>Add a photo</Text>
              </TouchableOpacity>
            )}
            {photoUploading
              ? <Text style={{ color: '#6366f1', fontSize: 12, marginTop: 4 }}>Uploading photo…</Text>
              : <Text style={{ color: theme.subText, fontSize: 12, marginTop: 4 }}>Adding a photo improves bookings</Text>
            }
          </View>

          {/* Active toggle */}
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
            style={[styles.saveBtn, (loading || photoUploading) && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading || photoUploading}
          >
            {(loading || photoUploading)
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
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { salon, updateSalon } = useSalon();

  const [services, setServices]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedCatLabel, setSelectedCatLabel] = useState(null);
  const [selectedSubLabel, setSelectedSubLabel] = useState(null);
  const [catalogMap, setCatalogMap]     = useState(null);
  const [search, setSearch]             = useState('');
  const [showMenuSection, setShowMenuSection] = useState(false);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [dismissedPricing, setDismissedPricing]     = useState([]);
  const [showBulk,     setShowBulk]     = useState(false);
  const [bulkEnabled,  setBulkEnabled]  = useState(new Set(['status']));
  const [bulkPrice,    setBulkPrice]    = useState('');
  const [bulkDuration, setBulkDuration] = useState('');
  const [bulkActive,   setBulkActive]   = useState(true);
  const [bulkGender,   setBulkGender]   = useState('both');
  const [bulkSaving,   setBulkSaving]   = useState(false);
  const [quickAdd,     setQuickAdd]     = useState(null); // { name, category, existing } | null
  const [quickSaving,  setQuickSaving]  = useState(false);
  const [createBucket, setCreateBucket] = useState(null); // { kind } | null
  const [bucketSaving, setBucketSaving] = useState(false);

  const toggleBulkField = (key) => setBulkEnabled(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  const handleBulkSet = async () => {
    if (bulkSaving) return;
    const targets = displayedServices.filter(s => s._id || s.id);
    if (!targets.length) { showError('No services', 'Nothing to update in this category'); return; }
    const patch = {};
    if (bulkEnabled.has('price')    && bulkPrice    !== '' && Number(bulkPrice)    >= 0) patch.basePrice = Number(bulkPrice);
    if (bulkEnabled.has('duration') && bulkDuration !== '' && Number(bulkDuration) >= 1) patch.duration  = Number(bulkDuration);
    if (bulkEnabled.has('status'))  patch.isActive      = bulkActive;
    if (bulkEnabled.has('gender'))  patch.applicableFor = bulkGender === 'both' ? ['male', 'female'] : [bulkGender];
    if (!Object.keys(patch).length) { showError('Nothing selected', 'Enable at least one field to apply'); return; }
    const ids = targets.map(s => s._id || s.id);
    setBulkSaving(true);
    try {
      const res = await api.patch('/owner/services/bulk', { ids, patch });
      if (!res?.data?.success && res?.data?.success !== undefined) throw new Error('Failed');
      await fetchServices();
      setShowBulk(false);
      setBulkEnabled(new Set(['status'])); setBulkPrice(''); setBulkDuration(''); setBulkActive(true); setBulkGender('both');
      showSuccess('Updated', `${ids.length} service${ids.length !== 1 ? 's' : ''} updated`);
    } catch (err) {
      showError('Failed', err.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

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

  // Smart pricing suggestions + dismissed list (persisted)
  useEffect(() => {
    api.get('/owner/analytics/smart-pricing')
      .then(res => setPricingSuggestions(res.data?.data?.suggestions || []))
      .catch(() => {});
    AsyncStorage.getItem('msb_dismissed_pricing')
      .then(v => { if (v) { try { setDismissedPricing(JSON.parse(v)); } catch {} } })
      .catch(() => {});
  }, []);

  const dismissPricing = (serviceId) => {
    const next = [...dismissedPricing, String(serviceId)];
    setDismissedPricing(next);
    AsyncStorage.setItem('msb_dismissed_pricing', JSON.stringify(next)).catch(() => {});
  };

  const activeSuggestions = pricingSuggestions.filter(s => !dismissedPricing.includes(String(s.serviceId)));

  // Admin catalog images (same endpoint as web useCatalogImages)
  useEffect(() => {
    if (!salon?.businessType) return;
    api.get('/public/catalog-images', { params: { businessType: salon.businessType } })
      .then(res => setCatalogMap({
        categoryImages:    res.data?.data?.categoryImages    || {},
        subCategoryImages: res.data?.data?.subCategoryImages || {},
        serviceImages:     res.data?.data?.serviceImages     || {},
      }))
      .catch(() => {});
  }, [salon?.businessType]);

  useEffect(() => {
    const onBack = () => {
      if (selectedSubLabel) { setSelectedSubLabel(null); return true; }
      if (selectedCatLabel) { setSelectedCatLabel(null); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [selectedCatLabel, selectedSubLabel]);

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

  // ── Web-parity drill-down data (Level 1 → 2 → 3) ────────────────
  const categoriesWithServices = useMemo(() => {
    const fromDefs = getCategoriesForSalonType(salon?.businessType, salon?.servedGender).map(c => c.label);
    const fromSvcs = grouped.map(([label]) => label);
    const seen = new Set(fromDefs);
    return [...fromDefs, ...fromSvcs.filter(l => !seen.has(l))];
  }, [salon?.businessType, salon?.servedGender, grouped]);

  const subcategoriesForSelected = useMemo(() => {
    if (!selectedCatLabel) return [];
    const catDef = getCategoriesForSalonType(salon?.businessType, salon?.servedGender)
      .find(d => d.label === selectedCatLabel);
    return catDef?.sections?.length ? catDef.sections.map(sec => sec.label) : [];
  }, [selectedCatLabel, salon?.businessType, salon?.servedGender]);

  const displayedServices = useMemo(() => {
    let base = filteredServices;
    if (selectedCatLabel) base = base.filter(s => s.category === selectedCatLabel);
    if (selectedSubLabel && selectedCatLabel) {
      const catDef = getCategoriesForSalonType(salon?.businessType, salon?.servedGender)
        .find(d => d.label === selectedCatLabel);
      const secDef = catDef?.sections?.find(s => s.label === selectedSubLabel);
      if (secDef) {
        const sectionNames = new Set(secDef.services);
        const allSecNames  = new Set((catDef.sections || []).flatMap(s => s.services));
        base = base.filter(s => sectionNames.has(s.name) || !allSecNames.has(s.name));
      } else {
        base = base.filter(s => s.name === selectedSubLabel);
      }
    }
    return base;
  }, [filteredServices, selectedCatLabel, selectedSubLabel, salon?.businessType, salon?.servedGender]);

  const displayedGrouped = useMemo(() => {
    const g = displayedServices.reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});
    return Object.entries(g);
  }, [displayedServices]);

  const handleCatSelect = (label) => { setSelectedCatLabel(label); setSelectedSubLabel(null); };

  // Long-press a circle -> pick an image -> save to salon.categoryImages
  // (key = category label, or "Cat::Sub" for subcategories — same as web)
  const [circleUploading, setCircleUploading] = useState({});
  const handleCircleImage = async (key) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showError('Permission denied', 'Gallery access is required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    setCircleUploading(prev => ({ ...prev, [key]: true }));
    try {
      const sigRes = await api.get('/owner/gallery/upload-signature?resource_type=image');
      const { signature, timestamp, api_key, cloud_name, folder } = sigRes.data.data;
      const fd = new FormData();
      fd.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'circle.jpg' });
      fd.append('signature', signature);
      fd.append('timestamp', String(timestamp));
      fd.append('api_key', api_key);
      fd.append('folder', folder);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: fd });
      const data = await up.json();
      if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
      await updateSalon({ categoryImages: { ...(salon?.categoryImages || {}), [key]: data.secure_url } });
      showSuccess('Image updated', 'Circle photo saved — visible to customers too');
    } catch (err) {
      showError('Error', err.message || 'Failed to upload image');
    } finally {
      setCircleUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Open the Add Service modal prefilled from the catalog (no _id -> create)
  const openAddPrefilled = (name, category) => {
    setEditingService(name || category ? { name: name || '', category: category || '' } : null);
    setModalVisible(true);
  };

  // Catalog suggestions for the current selection: menu services not yet added
  const catalogSuggestions = useMemo(() => {
    if (!selectedCatLabel) return [];
    const catDef = getCategoriesForSalonType(salon?.businessType, salon?.servedGender)
      .find(d => d.label === selectedCatLabel);
    if (!catDef) return [];
    let names = [];
    if (selectedSubLabel) {
      const secDef = catDef.sections?.find(sec => sec.label === selectedSubLabel);
      names = secDef ? secDef.services : [];
    } else if (catDef.sections?.length) {
      names = catDef.sections.flatMap(sec => sec.services);
    } else {
      names = catDef.subServices || [];
    }
    const owned = new Set(services.filter(sv => sv.category === selectedCatLabel).map(sv => sv.name));
    return [...new Set(names)].filter(n => !owned.has(n));
  }, [selectedCatLabel, selectedSubLabel, salon?.businessType, salon?.servedGender, services]);

  // ── Menu-driven data ────────────────────────────────────────────
  const customCats = useMemo(
    () => Object.keys(salon?.categoryImages || {}).filter(k => !k.includes('::')),
    [salon?.categoryImages]
  );
  const allCategories = useMemo(() => {
    const seen = new Set(); const out = [];
    [...categoriesWithServices, ...customCats].forEach(c => { if (c && !seen.has(c)) { seen.add(c); out.push(c); } });
    return out;
  }, [categoriesWithServices, customCats]);

  // Every menu item (service name) for a category
  const menuNamesForCat = useCallback((catLabel) => {
    const def = getCategoriesForSalonType(salon?.businessType, salon?.servedGender).find(d => d.label === catLabel);
    let names = [];
    if (def?.sections?.length) names = def.sections.flatMap(sec => sec.services);
    else if (def?.subServices) names = def.subServices;
    const customSubs = Object.keys(salon?.categoryImages || {})
      .filter(k => k.startsWith(catLabel + '::')).map(k => k.slice(catLabel.length + 2));
    const ownerNames = services.filter(sv => sv.category === catLabel).map(sv => sv.name);
    const seen = new Set(); const out = [];
    [...names, ...customSubs, ...ownerNames].forEach(n => { if (n && !seen.has(n)) { seen.add(n); out.push(n); } });
    return out;
  }, [salon, services]);

  const serviceByNameCat = useCallback(
    (name, cat) => services.find(sv => sv.category === cat && sv.name === name),
    [services]
  );
  const activeCountInCat = useCallback(
    (cat) => services.filter(sv => sv.category === cat && sv.isActive !== false).length,
    [services]
  );

  // Names to show inside the current category (respecting section + search)
  const menuNamesShown = useMemo(() => {
    if (!selectedCatLabel) return [];
    let names = menuNamesForCat(selectedCatLabel);
    if (selectedSubLabel) {
      const def = getCategoriesForSalonType(salon?.businessType, salon?.servedGender).find(d => d.label === selectedCatLabel);
      const sec = def?.sections?.find(x => x.label === selectedSubLabel);
      if (sec) { const set = new Set(sec.services); names = names.filter(n => set.has(n)); }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      names = names.filter(n => n.toLowerCase().includes(q));
    }
    return names;
  }, [selectedCatLabel, selectedSubLabel, menuNamesForCat, search, salon?.businessType, salon?.servedGender]);

  const uploadImage = async (uri) => {
    const sigRes = await api.get('/owner/gallery/upload-signature?resource_type=image');
    const { signature, timestamp, api_key, cloud_name, folder } = sigRes.data.data;
    const fd = new FormData();
    fd.append('file', { uri, type: 'image/jpeg', name: 'circle.jpg' });
    fd.append('signature', signature); fd.append('timestamp', String(timestamp));
    fd.append('api_key', api_key); fd.append('folder', folder);
    const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: fd });
    const data = await up.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
    return data.secure_url;
  };

  // Toggle a service row on/off (create when turning on and not yet added)
  const handleRowToggle = (name, cat, on) => {
    const existing = serviceByNameCat(name, cat);
    if (on) {
      if (existing) handleToggleActive(existing._id, true);
      else setQuickAdd({ name, category: cat, existing: null });
    } else if (existing) {
      handleToggleActive(existing._id, false);
    }
  };
  const handleRowPress = (name, cat) => {
    const existing = serviceByNameCat(name, cat);
    setQuickAdd({ name, category: cat, existing: existing || null });
  };
  const handleQuickSave = async (price, duration) => {
    if (!quickAdd) return;
    setQuickSaving(true);
    try {
      const payload = {
        name: quickAdd.name, category: quickAdd.category,
        basePrice: price, duration,
        applicableFor: genderForCategory(quickAdd.category, salon),
        isActive: true,
      };
      if (quickAdd.existing?._id) await api.put(`/owner/services/${quickAdd.existing._id}`, payload);
      else await api.post('/owner/services', payload);
      await fetchServices();
      setQuickAdd(null);
      showSuccess('Saved', `${quickAdd.name} is live`);
    } catch (err) {
      showError('Error', err.response?.data?.message || 'Failed to save');
    } finally { setQuickSaving(false); }
  };

  // Category-level toggle: on -> drill in, off -> deactivate all in category
  const handleCatToggle = (cat, on) => {
    if (on) { handleCatSelect(cat); return; }
    const ids = services.filter(sv => sv.category === cat && sv.isActive !== false).map(sv => sv._id);
    if (!ids.length) return;
    Alert.alert('Turn off category', `Deactivate all ${ids.length} service${ids.length !== 1 ? 's' : ''} in "${cat}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Turn Off', style: 'destructive', onPress: async () => {
        try { await api.patch('/owner/services/bulk', { ids, patch: { isActive: false } }); await fetchServices(); } catch {}
      } },
    ]);
  };

  // Create a category or a service bucket (name + optional image)
  const handleCreateBucket = async (name, imgUri) => {
    setBucketSaving(true);
    try {
      let url = '';
      if (imgUri) url = await uploadImage(imgUri);
      const kind = createBucket.kind;
      const key = kind === 'category' ? name : `${selectedCatLabel}::${name}`;
      const next = { ...(salon?.categoryImages || {}) };
      next[key] = url || next[key] || '_'; // sentinel keeps the bucket even without a photo
      await updateSalon({ categoryImages: next });
      setCreateBucket(null);
      if (kind === 'category') handleCatSelect(name);
      showSuccess('Created', kind === 'category' ? `Category "${name}" added` : `"${name}" added — toggle it on to set price`);
    } catch (err) {
      showError('Error', err.message || 'Failed to create');
    } finally { setBucketSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          {(
            <>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="cut" size={14} color="#fff" />
                  </View>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>Services</Text>
                </View>
                <Text style={[styles.headerSub, { color: theme.subText, marginTop: 1, marginLeft: 36 }]}>Manage your business services and pricing</Text>
              </View>

            </>
          )}
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

          {/* ── Level 1: category circles ── */}
          {allCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
              <CircleButton label="All" isAll isSelected={!selectedCatLabel} onSelect={() => handleCatSelect(null)} />
              {allCategories.map(label => (
                <CircleButton key={label} label={label}
                  imgSrc={getCatImg(label, salon, catalogMap)}
                  isSelected={selectedCatLabel === label}
                  uploading={!!circleUploading[label]}
                  onLongPress={() => handleCircleImage(label)}
                  onSelect={() => handleCatSelect(selectedCatLabel === label ? null : label)} />
              ))}
              <CircleButton label="New" isAdd onSelect={() => setCreateBucket({ kind: 'category' })} />
            </ScrollView>
          )}

          {/* ── Level 2: subcategory circles (only when catalog defines sections) ── */}
          {selectedCatLabel && subcategoriesForSelected.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
              <CircleButton label="All" imgSrc={getCatImg(selectedCatLabel, salon, catalogMap)}
                isSelected={!selectedSubLabel} onSelect={() => setSelectedSubLabel(null)} />
              {subcategoriesForSelected.map(sub => (
                <CircleButton key={sub} label={sub}
                  imgSrc={getSubImg(selectedCatLabel, sub, salon, catalogMap)}
                  isSelected={selectedSubLabel === sub}
                  uploading={!!circleUploading[`${selectedCatLabel}::${sub}`]}
                  onLongPress={() => handleCircleImage(`${selectedCatLabel}::${sub}`)}
                  onSelect={() => setSelectedSubLabel(selectedSubLabel === sub ? null : sub)} />
              ))}
              <CircleButton label="New" isAdd onSelect={() => setCreateBucket({ kind: 'subcategory' })} />
            </ScrollView>
          )}

          {/* ── Breadcrumb ── */}
          {selectedCatLabel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2, marginTop: -6 }}>
              <Ionicons name="chevron-forward" size={11} color={theme.subText} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subText }}>{selectedCatLabel}</Text>
              {selectedSubLabel && (
                <>
                  <Ionicons name="chevron-forward" size={11} color={theme.subText} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>{selectedSubLabel}</Text>
                </>
              )}
              <Text style={{ marginLeft: 'auto', fontSize: 12, color: theme.subText }}>
                {menuNamesShown.length} service{menuNamesShown.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Smart pricing suggestions */}
          {activeSuggestions.length > 0 && (
            <View style={[styles.smartCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.10)' : '#ecfdf5', borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#a7f3d0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={styles.smartIcon}>
                  <Ionicons name="trending-up" size={14} color="#fff" />
                </View>
                <Text style={[styles.smartTitle, { color: theme.text }]}>Smart Pricing Suggestions</Text>
                <View style={styles.smartBadge}>
                  <Text style={styles.smartBadgeText}>{activeSuggestions.length}</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {activeSuggestions.map(s => (
                  <View key={s.serviceId} style={[styles.smartRow, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5' }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.smartSvc, { color: theme.text }]} numberOfLines={1}>{s.serviceName}</Text>
                      <Text style={{ color: theme.subText, fontSize: 11 }}>Booked {s.bookingsLast30}× · Current ₹{s.currentPrice}</Text>
                    </View>
                    <Text style={styles.smartPrice}>→ ₹{s.suggestedPrice}</Text>
                    <TouchableOpacity onPress={() => dismissPricing(s.serviceId)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={14} color={theme.subText} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
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
              {selectedSubLabel && (
                <TouchableOpacity onPress={() => setShowBulk(true)} style={[styles.menuBtn, { borderColor: 'rgba(99,102,241,0.4)', backgroundColor: 'rgba(99,102,241,0.08)' }]}>
                  <Ionicons name="options-outline" size={13} color="#818cf8" />
                  <Text style={[styles.menuBtnText, { color: '#818cf8' }]}>Bulk</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Content: the whole service menu as toggle rows ── */}
          {!selectedCatLabel ? (
            /* ALL: every category as a menu row (photo · name · count · toggle) */
            allCategories.length === 0 ? (
              <EmptyState onAdd={() => setCreateBucket({ kind: 'category' })} theme={theme} />
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.subText, letterSpacing: 0.5, marginBottom: 2 }}>SERVICE MENU</Text>
                {allCategories
                  .filter(cat => !search.trim() || cat.toLowerCase().includes(search.toLowerCase()))
                  .map(cat => {
                    const active = activeCountInCat(cat);
                    const total  = menuNamesForCat(cat).length;
                    return (
                      <MenuServiceRow
                        key={cat}
                        img={getCatImg(cat, salon, catalogMap)}
                        name={cat}
                        subline={active > 0 ? `${active} active · ${total} in menu` : `${total} in menu · tap to set up`}
                        value={active > 0}
                        onToggle={(v) => handleCatToggle(cat, v)}
                        onPress={() => handleCatSelect(cat)}
                        uploading={!!circleUploading[cat]}
                        onLongPress={() => handleCircleImage(cat)}
                      />
                    );
                  })}
                <FlatAddButton label="Add Category" onPress={() => setCreateBucket({ kind: 'category' })} />
              </View>
            )
          ) : (
            /* CATEGORY: each service as a photo · name · toggle row + add */
            <View style={{ gap: 8 }}>
              {menuNamesShown.length === 0 ? (
                <Text style={{ fontSize: 13, color: theme.subText, textAlign: 'center', paddingVertical: 10 }}>
                  {search ? `No services match "${search}"` : 'No services here yet — add your first one below.'}
                </Text>
              ) : (
                menuNamesShown.map(name => {
                  const svc = serviceByNameCat(name, selectedCatLabel);
                  const on  = svc && svc.isActive !== false;
                  return (
                    <MenuServiceRow
                      key={name}
                      img={getSubImg(selectedCatLabel, name, salon, catalogMap)}
                      name={name}
                      subline={svc ? `₹${svc.basePrice} · ${svc.duration} min${on ? '' : ' · turned off'}` : 'Tap to set price & time'}
                      value={!!on}
                      onToggle={(v) => handleRowToggle(name, selectedCatLabel, v)}
                      onPress={() => handleRowPress(name, selectedCatLabel)}
                      uploading={!!circleUploading[`${selectedCatLabel}::${name}`]}
                      onLongPress={() => handleCircleImage(`${selectedCatLabel}::${name}`)}
                    />
                  );
                })
              )}
              <FlatAddButton label="Add Service" onPress={() => setCreateBucket({ kind: 'subcategory' })} />
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

      {/* Toggle-on / edit a service: price + time */}
      <QuickAddModal
        visible={!!quickAdd}
        title={quickAdd?.name || ''}
        initialPrice={quickAdd?.existing?.basePrice}
        initialDuration={quickAdd?.existing?.duration ?? 30}
        saving={quickSaving}
        onClose={() => setQuickAdd(null)}
        onSave={handleQuickSave}
      />

      {/* Create a category or a service (name + optional photo) */}
      <CreateBucketModal
        visible={!!createBucket}
        kind={createBucket?.kind}
        creating={bucketSaving}
        onClose={() => setCreateBucket(null)}
        onCreate={handleCreateBucket}
      />

      {/* Bulk control panel */}
      <Modal visible={showBulk} transparent animationType="slide" onRequestClose={() => setShowBulk(false)}>
        <View style={styles.bulkOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowBulk(false)} />
          <View style={[styles.bulkSheet, { backgroundColor: theme.bg }]}>
            <View style={styles.bulkHeader}>
              <Text style={[styles.bulkTitle, { color: theme.text }]}>Bulk edit · {selectedSubLabel || selectedCatLabel || 'All'}</Text>
              <TouchableOpacity onPress={() => setShowBulk(false)}>
                <Ionicons name="close" size={22} color={theme.subText} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.bulkHint, { color: theme.subText }]}>
              Applies to all {displayedServices.length} services shown. Enable only the fields you want to change.
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Price */}
              <BulkField label="Set price (₹)" enabled={bulkEnabled.has('price')} onToggle={() => toggleBulkField('price')} theme={theme}>
                <TextInput
                  style={[styles.bulkInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. 300" placeholderTextColor={theme.placeholder}
                  keyboardType="number-pad" value={bulkPrice} onChangeText={setBulkPrice} editable={bulkEnabled.has('price')}
                />
              </BulkField>
              {/* Duration */}
              <BulkField label="Set duration (min)" enabled={bulkEnabled.has('duration')} onToggle={() => toggleBulkField('duration')} theme={theme}>
                <TextInput
                  style={[styles.bulkInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. 30" placeholderTextColor={theme.placeholder}
                  keyboardType="number-pad" value={bulkDuration} onChangeText={setBulkDuration} editable={bulkEnabled.has('duration')}
                />
              </BulkField>
              {/* Status */}
              <BulkField label="Set availability" enabled={bulkEnabled.has('status')} onToggle={() => toggleBulkField('status')} theme={theme}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[{ v: true, l: 'Active' }, { v: false, l: 'Inactive' }].map(o => (
                    <TouchableOpacity key={o.l} disabled={!bulkEnabled.has('status')} onPress={() => setBulkActive(o.v)}
                      style={[styles.bulkChip, { borderColor: bulkActive === o.v ? '#6366f1' : theme.border, backgroundColor: bulkActive === o.v ? 'rgba(99,102,241,0.1)' : 'transparent', opacity: bulkEnabled.has('status') ? 1 : 0.4 }]}>
                      <Text style={{ color: bulkActive === o.v ? '#6366f1' : theme.subText, fontSize: 12, fontWeight: '600' }}>{o.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </BulkField>
              {/* Gender */}
              <BulkField label="Set available for" enabled={bulkEnabled.has('gender')} onToggle={() => toggleBulkField('gender')} theme={theme}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[{ v: 'both', l: 'Both' }, { v: 'male', l: 'Men' }, { v: 'female', l: 'Women' }].map(o => (
                    <TouchableOpacity key={o.v} disabled={!bulkEnabled.has('gender')} onPress={() => setBulkGender(o.v)}
                      style={[styles.bulkChip, { borderColor: bulkGender === o.v ? '#6366f1' : theme.border, backgroundColor: bulkGender === o.v ? 'rgba(99,102,241,0.1)' : 'transparent', opacity: bulkEnabled.has('gender') ? 1 : 0.4 }]}>
                      <Text style={{ color: bulkGender === o.v ? '#6366f1' : theme.subText, fontSize: 12, fontWeight: '600' }}>{o.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </BulkField>

              <TouchableOpacity style={[styles.bulkApply, { opacity: bulkSaving ? 0.6 : 1 }]} onPress={handleBulkSet} disabled={bulkSaving}>
                {bulkSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.bulkApplyText}>Apply to category</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BulkField({ label, enabled, onToggle, theme, children }) {
  return (
    <View style={styles.bulkFieldRow}>
      <TouchableOpacity onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name={enabled ? 'checkbox' : 'square-outline'} size={20} color={enabled ? '#6366f1' : theme.subText} />
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      </TouchableOpacity>
      {enabled && <View style={{ paddingLeft: 28 }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bulk panel
  bulkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bulkSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  bulkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bulkTitle: { fontSize: 17, fontWeight: '800' },
  bulkHint: { fontSize: 12, marginBottom: 16, lineHeight: 17 },
  bulkFieldRow: { marginBottom: 16 },
  bulkInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  bulkChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  bulkApply: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 10 },
  bulkApplyText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Smart pricing
  smartCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  smartIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  smartTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  smartBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  smartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  smartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 10 },
  smartSvc: { fontSize: 13, fontWeight: '600' },
  smartPrice: { fontSize: 14, fontWeight: '800', color: '#10b981' },

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
  optBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  optBadgeText: { fontSize: 11, fontWeight: '600', color: '#854d0e' },
  divider: { height: 1 },
  menuCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuCatIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' },
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
  genderTagM: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#eff6ff' },
  genderTagMTxt: { fontSize: 10, fontWeight: '600', color: '#2563eb' },
  genderTagF: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#fdf2f8' },
  genderTagFTxt: { fontSize: 10, fontWeight: '600', color: '#db2777' },

  // Search bar
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  // Category nav cards (replaces accordion)
  catNavCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  catNavIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' },
  catNavTitle: { fontSize: 14, fontWeight: '700' },
  catNavSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  backBtn: { padding: 4, marginRight: 2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countBadgeText: { fontSize: 11, fontWeight: '600' },

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

  // Field error
  fieldError: { fontSize: 11, color: '#dc2626', marginTop: 4 },

  // Applicable For buttons
  applicableRow: { flexDirection: 'row', gap: 8 },
  applicableBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  applicableBtnActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  applicableBtnText: { fontSize: 13, fontWeight: '600' },
  applicableBtnTextActive: { color: '#4338ca' },

  // Category trigger button
  catTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  catTriggerText: { fontSize: 14, flex: 1 },

  // Category expandable grid
  catGrid: { marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catGridItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  catGridItemActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  catGridItemEmoji: { fontSize: 16 },
  catGridItemText: { fontSize: 12, flex: 1 },

  // Custom category input row
  customCatRow: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 4 },
  customCatInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  customCatBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  customCatBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
