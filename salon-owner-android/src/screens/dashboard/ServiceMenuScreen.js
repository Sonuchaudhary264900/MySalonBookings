import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSalon } from '../../context/SalonContext';

// ── Category Constants ─────────────────────────────────────────
const MALE_CATEGORIES = [
  { key: 'hair_services', label: 'Hair Services (Men)', icon: '✂️',
    subServices: ['Basic Haircut','Fade / Taper / Skin Fade','Designer Haircut','Hair Styling','Hair Wash','Blow Dry','Hair Coloring','Hair Straightening','Hair Smoothening','Hair Spa','Dandruff Treatment','Hair Fall Treatment'] },
  { key: 'beard_grooming', label: 'Beard & Grooming', icon: '🧔',
    subServices: ['Beard Trim','Clean Shave','Beard Styling / Shape','Designer Beard','Beard Coloring','Hot Towel Shave'] },
  { key: 'spa_massage', label: 'Spa & Massage', icon: '💆',
    subServices: ['Head Massage','Neck & Shoulder Massage','Full Body Massage','Foot Massage','Deep Tissue Massage','Relaxation Massage'] },
  { key: 'skin_face', label: 'Skin & Face (Men Grooming)', icon: '🧴',
    subServices: ['Basic Facial','Gold Facial','Diamond Facial','Clean-up','Detan','Face Bleach','Anti-Acne Treatment','Skin Brightening'] },
  { key: 'body_grooming', label: 'Body Grooming', icon: '🧍',
    subServices: ['Chest Waxing','Back Waxing','Full Body Wax','Threading (optional)','Nose Wax','Ear Cleaning'] },
];

const MALE_OPTIONALS = [
  { key: 'kidsHaircut',    label: "Kids' Haircut",    icon: '👶' },
  { key: 'atHomeServices', label: 'At-Home Services', icon: '🏠' },
];

const FEMALE_CATEGORIES = [
  { key: 'hair_services_women', label: 'Hair Services (Women)', icon: '💇',
    subServices: ['Haircut (Layer / Step / Trim)','Advanced Haircut','Hair Styling (Straight / Curl / Party)','Hair Wash','Blow Dry','Hair Coloring','Highlights / Balayage','Hair Smoothening','Rebonding','Keratin Treatment','Hair Spa'] },
  { key: 'nail_services', label: 'Nail Services', icon: '💅',
    subServices: ['Manicure','Pedicure','Nail Art','Gel Nails','Acrylic Nails','Nail Extensions','Nail Repair'] },
  { key: 'skin_beauty', label: 'Skin & Beauty', icon: '🧖',
    subServices: ['Basic Facial','Gold Facial','Diamond Facial','Hydra Facial','Clean-up','Detan','Bleach','Anti-aging Treatment','Skin Brightening'] },
  { key: 'body_grooming_women', label: 'Body Grooming', icon: '🧴',
    subServices: ['Full Body Wax','Half Wax','Bikini Wax','Threading (Eyebrow / Upper Lip / Forehead)','Body Polish','Body Scrub'] },
  { key: 'spa_relaxation', label: 'Spa & Relaxation', icon: '💆',
    subServices: ['Head Massage','Full Body Massage','Aromatherapy','Spa Therapy'] },
  { key: 'bridal_events', label: 'Bridal & Events', icon: '👰',
    subServices: ['Bridal Makeup','Engagement Makeup','Party Makeup','Hairstyling','Saree Draping'] },
];

const FEMALE_OPTIONALS = [
  { key: 'kidsServices',   label: "Kids' Services",   icon: '👶' },
  { key: 'atHomeServices', label: 'At-Home Services', icon: '🏠' },
];

const UNISEX_CATEGORIES = [
  { key: 'hair_services_unisex', label: 'Hair Services', icon: '✂️',
    maleSubServices: ['Basic Haircut','Fade / Taper / Skin Fade','Designer Haircut','Hair Styling','Hair Wash','Blow Dry','Hair Coloring','Hair Straightening','Hair Smoothening','Hair Spa','Dandruff Treatment','Hair Fall Treatment'],
    femaleSubServices: ['Haircut (Layer / Step / Trim)','Advanced Haircut','Hair Styling (Straight / Curl / Party)','Hair Wash','Blow Dry','Hair Coloring','Highlights / Balayage','Hair Smoothening','Rebonding','Keratin Treatment','Hair Spa'] },
  { key: 'beard_grooming_unisex', label: 'Beard & Grooming', icon: '🧔',
    maleSubServices: ['Beard Trim','Clean Shave','Beard Styling / Shape','Designer Beard','Beard Coloring','Hot Towel Shave'],
    femaleSubServices: [] },
  { key: 'nail_services_unisex', label: 'Nail Services', icon: '💅',
    maleSubServices: ['Manicure','Pedicure'],
    femaleSubServices: ['Manicure','Pedicure','Nail Art','Gel Nails','Acrylic Nails','Nail Extensions','Nail Repair'] },
  { key: 'skin_beauty_unisex', label: 'Skin & Face / Beauty', icon: '🧖',
    maleSubServices: ['Basic Facial','Gold Facial','Diamond Facial','Clean-up','Detan','Face Bleach','Anti-Acne Treatment','Skin Brightening'],
    femaleSubServices: ['Basic Facial','Gold Facial','Diamond Facial','Hydra Facial','Clean-up','Detan','Bleach','Anti-aging Treatment','Skin Brightening'] },
  { key: 'spa_massage_unisex', label: 'Spa & Massage', icon: '💆',
    maleSubServices: ['Head Massage','Neck & Shoulder Massage','Full Body Massage','Foot Massage','Deep Tissue Massage','Relaxation Massage'],
    femaleSubServices: ['Head Massage','Full Body Massage','Foot Massage','Aromatherapy','Spa Therapy','Relaxation Massage'] },
  { key: 'body_grooming_unisex', label: 'Body Grooming', icon: '🧴',
    maleSubServices: ['Chest Waxing','Back Waxing','Full Body Wax','Threading (optional)','Nose Wax','Ear Cleaning'],
    femaleSubServices: ['Full Body Wax','Half Wax','Bikini Wax','Threading (Eyebrow / Upper Lip / Forehead)','Body Polish','Body Scrub'] },
  { key: 'bridal_events_unisex', label: 'Bridal & Events', icon: '👰',
    maleSubServices: ['Groom Makeup','Hairstyling (Groom)','Shave & Grooming (Groom)'],
    femaleSubServices: ['Bridal Makeup','Engagement Makeup','Party Makeup','Hairstyling','Saree Draping'] },
  { key: 'kids_services_unisex', label: 'Kids Services', icon: '👶',
    maleSubServices: ["Kids' Haircut (Boys)","Kids' Hair Styling (Boys)","Kids' Hair Wash"],
    femaleSubServices: ["Kids' Haircut (Girls)","Kids' Hair Styling (Girls)","Kids' Hair Wash","Kids' Braiding"] },
  { key: 'at_home_services_unisex', label: 'At-Home Services', icon: '🏠',
    maleSubServices: ['At-Home Haircut (Men)','At-Home Shave','At-Home Massage','At-Home Facial (Men)'],
    femaleSubServices: ['At-Home Haircut (Women)','At-Home Facial','At-Home Waxing','At-Home Massage','At-Home Bridal'] },
];

// ── Helpers ────────────────────────────────────────────────────
const normalizeSubs = (subs, catLabel, catList) => {
  const catDef    = catList.find(c => c.label === catLabel);
  const maleSet   = catDef?.maleSubServices   ? new Set(catDef.maleSubServices)   : new Set();
  const femaleSet = catDef?.femaleSubServices ? new Set(catDef.femaleSubServices) : new Set();
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, price: '', duration: '' };
    let genderContext = null;
    if (s.applicableFor?.length === 1) {
      genderContext = s.applicableFor[0];
    } else if (!s.applicableFor || s.applicableFor.length === 0) {
      const inMale   = maleSet.has(s.name);
      const inFemale = femaleSet.has(s.name);
      if (inMale && !inFemale)      genderContext = 'male';
      else if (inFemale && !inMale) genderContext = 'female';
    }
    return { name: s.name, price: s.price ?? '', duration: s.duration ?? '', genderContext,
      ...(s.applicableFor ? { applicableFor: s.applicableFor } : {}) };
  });
};

const buildSelections = (catList, offeredCategories) =>
  catList.reduce((acc, cat) => {
    const found = (offeredCategories || []).find(c => c.name === cat.label);
    acc[cat.key] = { enabled: !!found, subServices: normalizeSubs(found?.subServices, cat.label, catList) };
    return acc;
  }, {});

// ── Main Screen ────────────────────────────────────────────────
export default function ServiceMenuScreen() {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { salon, updateSalon } = useSalon();
  const st = getSt(theme, isDark);

  const [gender,       setGender]       = useState(salon?.servedGender || '');
  const [expandedKey,  setExpandedKey]  = useState(null);
  const [saving,       setSaving]       = useState(false);

  const [maleSelections,   setMaleSelections]   = useState(() => buildSelections(MALE_CATEGORIES,   salon?.offeredCategories));
  const [femaleSelections, setFemaleSelections] = useState(() => buildSelections(FEMALE_CATEGORIES, salon?.offeredCategories));
  const [unisexSelections, setUnisexSelections] = useState(() => buildSelections(UNISEX_CATEGORIES, salon?.offeredCategories));
  const [maleOptionals,    setMaleOptionals]    = useState({ kidsHaircut: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });
  const [femaleOptionals,  setFemaleOptionals]  = useState({ kidsServices: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });

  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [priceModal, setPriceModal] = useState({ open: false, catKey: '', subName: '', price: '', duration: '', genderContext: null });
  const priceRef    = useRef(null);
  const durationRef = useRef(null);

  const getSels = () => gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : unisexSelections;
  const setSels = (update) => {
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const toggleCat = (key) => {
    const update = (prev) => {
      const enabling = !prev[key].enabled;
      if (enabling) setExpandedKey(key);
      else if (expandedKey === key) setExpandedKey(null);
      return { ...prev, [key]: { ...prev[key], enabled: enabling } };
    };
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const toggleSub = (catKey, subName, genderContext = null) => {
    const subs = getSels()[catKey].subServices;
    const exists = genderContext
      ? subs.find(s => s.name === subName && s.genderContext === genderContext)
      : subs.find(s => s.name === subName);
    if (exists) {
      setSels(prev => ({
        ...prev,
        [catKey]: {
          ...prev[catKey],
          subServices: genderContext
            ? subs.filter(s => !(s.name === subName && s.genderContext === genderContext))
            : subs.filter(s => s.name !== subName),
        },
      }));
    } else {
      setPriceModal({ open: true, catKey, subName, price: '', duration: '', genderContext });
    }
  };

  const confirmSubPrice = () => {
    const { catKey, subName, price, duration, genderContext } = priceModal;
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in minutes');
      return;
    }
    const applicableFor = genderContext === 'male' ? ['male'] : genderContext === 'female' ? ['female'] : null;
    setSels(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        subServices: [
          ...prev[catKey].subServices,
          { name: subName, price, duration, genderContext, ...(applicableFor ? { applicableFor } : {}) },
        ],
      },
    }));
    setPriceModal({ open: false, catKey: '', subName: '', price: '', duration: '', genderContext: null });
  };

  const handleChangeGender = (val) => {
    if (val === gender) return;
    const currentSels = gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : unisexSelections;
    const hasData = gender && Object.values(currentSels).some(s => s.enabled);
    if (hasData) {
      Alert.alert(
        'Change customer type?',
        `You have categories configured for ${gender} customers. Switching to ${val} will replace all saved categories when you save.`,
        [
          { text: 'Keep Current', style: 'cancel' },
          { text: 'Switch', style: 'destructive', onPress: () => { setGender(val); setExpandedKey(null); } },
        ]
      );
    } else {
      setGender(val);
      setExpandedKey(null);
    }
  };

  const handleSave = async () => {
    if (!gender) { Alert.alert('Error', 'Please select who you serve'); return; }
    const toPayload = (subs) => subs.map(s => ({
      name: s.name, price: parseFloat(s.price) || 0, duration: parseInt(s.duration) || 0,
      ...(s.applicableFor ? { applicableFor: s.applicableFor } : {}),
    }));
    let offeredCategories = [], kidsHaircut = false, atHomeServices = false;
    if (gender === 'male') {
      offeredCategories = MALE_CATEGORIES.filter(c => maleSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(maleSelections[c.key].subServices) }));
      kidsHaircut = maleOptionals.kidsHaircut;
      atHomeServices = maleOptionals.atHomeServices;
    } else if (gender === 'female') {
      offeredCategories = FEMALE_CATEGORIES.filter(c => femaleSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(femaleSelections[c.key].subServices) }));
      kidsHaircut = femaleOptionals.kidsServices;
      atHomeServices = femaleOptionals.atHomeServices;
    } else {
      offeredCategories = UNISEX_CATEGORIES.filter(c => unisexSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(unisexSelections[c.key].subServices) }));
      kidsHaircut = unisexSelections['kids_services_unisex']?.enabled || false;
      atHomeServices = unisexSelections['at_home_services_unisex']?.enabled || false;
    }
    if (!offeredCategories.length) { Alert.alert('Error', 'Please select at least one category'); return; }
    setSaving(true);
    try {
      await updateSalon({ servedGender: gender, offeredCategories, kidsHaircut, atHomeServices });
      Alert.alert('Saved!', 'Service menu updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update service menu');
    } finally { setSaving(false); }
  };

  const currentCats = gender === 'male' ? MALE_CATEGORIES : gender === 'female' ? FEMALE_CATEGORIES : gender === 'unisex' ? UNISEX_CATEGORIES : [];
  const currentSels = gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : gender === 'unisex' ? unisexSelections : {};

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* Header */}
      <View style={[st.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[st.headerTitle, { color: theme.text }]}>Service Menu</Text>
            <Text style={[st.headerSub, { color: theme.subText }]}>Configure categories, services & pricing</Text>
          </View>
          <TouchableOpacity style={[st.saveBtn, { backgroundColor: theme.accent }, (saving || !gender) && { opacity: 0.55 }]} onPress={handleSave} disabled={saving || !gender}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="save-outline" size={15} color="#fff" /><Text style={st.saveBtnText}>Save</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 48, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* Gender selector — button that opens popup */}
        <TouchableOpacity
          style={[st.genderPickerBtn, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: isDark ? '#4f46e5' : '#c7d2fe' }]}
          onPress={() => setGenderModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={st.genderPickerIcon}>
            <Ionicons name="people" size={18} color={isDark ? '#a5b4fc' : '#6366f1'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.genderPickerLabel, { color: isDark ? '#a5b4fc' : '#6366f1' }]}>WHO DO YOU SERVE?</Text>
            {gender ? (
              <Text style={[st.genderPickerValue, { color: theme.text }]}>
                {gender === 'male' ? '👨 Male customers' : gender === 'female' ? '👩 Female customers' : '👥 Unisex customers'}
              </Text>
            ) : (
              <Text style={[st.genderPickerValue, { color: theme.subText }]}>Tap to select…</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#6366f1' : '#a5b4fc'} />
        </TouchableOpacity>

        {/* Category list */}
        {gender ? (
          <View style={{ gap: 8 }}>
            <Text style={[st.secLabel, { color: theme.subText, paddingHorizontal: 2 }]}>SELECT CATEGORIES & SUB-SERVICES</Text>

            {currentCats.map(cat => {
              const sel        = currentSels[cat.key] || { enabled: false, subServices: [] };
              const isExpanded = expandedKey === cat.key && sel.enabled;
              const isUnisex   = gender === 'unisex';

              return (
                <View key={cat.key} style={[st.catCard, { backgroundColor: theme.card, borderColor: sel.enabled ? '#3b82f6' : theme.border }]}>
                  {/* Row */}
                  <View style={[st.catRow, sel.enabled && { backgroundColor: theme.bg }]}>
                    <Text style={st.catEmoji}>{cat.icon}</Text>
                    <Text style={[st.catLabel, { color: theme.text }]}>{cat.label}</Text>
                    {sel.enabled && (
                      <TouchableOpacity onPress={() => setExpandedKey(isExpanded ? null : cat.key)} style={st.expandBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={st.expandCount}>{sel.subServices.length}</Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                    <Switch value={sel.enabled} onValueChange={() => toggleCat(cat.key)}
                      trackColor={{ false: '#d1d5db', true: '#93c5fd' }} thumbColor={sel.enabled ? '#6366f1' : '#9ca3af'} />
                  </View>

                  {/* Sub-service chips */}
                  {isExpanded && (
                    <View style={[st.subBody, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                      <Text style={st.subHint}>Tap to select · enter price & duration</Text>

                      {isUnisex && cat.maleSubServices ? (
                        <View style={{ gap: 10 }}>
                          {cat.maleSubServices.length > 0 && (
                            <View>
                              <Text style={st.gTag_m}>👨 Men</Text>
                              <View style={st.chipsWrap}>
                                {cat.maleSubServices.map(sub => {
                                  const active = sel.subServices.find(s => s.name === sub && s.genderContext === 'male');
                                  return (
                                    <TouchableOpacity key={sub} onPress={() => toggleSub(cat.key, sub, 'male')}
                                      style={[st.chip, active && st.chipM]} activeOpacity={0.7}>
                                      <Text style={[st.chipTxt, active && st.chipTxtM]}>{sub}</Text>
                                      {active && parseFloat(active.price) > 0 && <Text style={st.chipPrice}>₹{active.price}</Text>}
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          )}
                          {cat.femaleSubServices.length > 0 && (
                            <View>
                              <Text style={st.gTag_f}>👩 Women</Text>
                              <View style={st.chipsWrap}>
                                {cat.femaleSubServices.map(sub => {
                                  const active = sel.subServices.find(s => s.name === sub && s.genderContext === 'female');
                                  return (
                                    <TouchableOpacity key={sub} onPress={() => toggleSub(cat.key, sub, 'female')}
                                      style={[st.chip, active && st.chipF]} activeOpacity={0.7}>
                                      <Text style={[st.chipTxt, active && st.chipTxtF]}>{sub}</Text>
                                      {active && parseFloat(active.price) > 0 && <Text style={st.chipPrice}>₹{active.price}</Text>}
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={st.chipsWrap}>
                          {cat.subServices.map(sub => {
                            const active = sel.subServices.find(s => s.name === sub);
                            return (
                              <TouchableOpacity key={sub} onPress={() => toggleSub(cat.key, sub)}
                                style={[st.chip, active && st.chipM]} activeOpacity={0.7}>
                                <Text style={[st.chipTxt, active && st.chipTxtM]}>{sub}</Text>
                                {active && parseFloat(active.price) > 0 && <Text style={st.chipPrice}>₹{active.price}</Text>}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      {sel.subServices.length > 0 && (
                        <View style={st.selList}>
                          <Text style={st.selListTitle}>Selected:</Text>
                          {sel.subServices.map((sub, i) => (
                            <View key={i} style={st.selRow}>
                              {sub.genderContext && <Text style={{ fontSize: 12 }}>{sub.genderContext === 'male' ? '👨' : '👩'}</Text>}
                              <Text style={[st.selName, { color: theme.text }]} numberOfLines={1}>{sub.name}</Text>
                              <Text style={st.selPrice}>₹{sub.price}</Text>
                              <Text style={[st.selDur, { color: theme.subText }]}>{sub.duration} min</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Optional add-ons (male / female only) */}
            {(gender === 'male' || gender === 'female') && (
              <View style={[st.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[st.secLabel, { color: theme.subText, marginBottom: 4 }]}>OPTIONAL ADD-ONS</Text>
                {(gender === 'male' ? MALE_OPTIONALS : FEMALE_OPTIONALS).map((opt, i, arr) => (
                  <View key={opt.key} style={[st.optRow, { borderBottomColor: theme.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
                    <Text style={st.optEmoji}>{opt.icon}</Text>
                    <Text style={[st.optLabel, { color: theme.text }]}>{opt.label}</Text>
                    <Switch
                      value={gender === 'male' ? maleOptionals[opt.key] : femaleOptionals[opt.key]}
                      onValueChange={val => gender === 'male' ? setMaleOptionals(p => ({ ...p, [opt.key]: val })) : setFemaleOptionals(p => ({ ...p, [opt.key]: val }))}
                      trackColor={{ false: '#d1d5db', true: '#93c5fd' }} thumbColor="#6366f1"
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[st.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>👥</Text>
            <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center' }}>
              Select who you serve above to configure your service categories
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Gender Selection Modal */}
      <Modal visible={genderModalVisible} transparent animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}>
        <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => setGenderModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[st.genderModalBox, { backgroundColor: theme.card }]}>
            <View style={st.genderModalHeader}>
              <View>
                <Text style={[st.genderModalTitle, { color: theme.text }]}>Who do you serve?</Text>
                <Text style={[st.genderModalSub, { color: theme.subText }]}>Select the type of clients your salon caters to</Text>
              </View>
              <TouchableOpacity onPress={() => setGenderModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={theme.subText} />
              </TouchableOpacity>
            </View>
            {[
              { val: 'male',   emoji: '👨', label: 'Male customers',   desc: 'Men-only salon services' },
              { val: 'female', emoji: '👩', label: 'Female customers',  desc: 'Women-only salon services' },
              { val: 'unisex', emoji: '👥', label: 'Unisex customers',  desc: 'Services for all genders' },
            ].map(({ val, emoji, label, desc }) => {
              const isSelected = gender === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    st.genderOptRow,
                    { borderColor: isSelected ? theme.accent : theme.border, backgroundColor: isSelected ? (isDark ? '#1e1b4b' : '#eef2ff') : theme.bg },
                  ]}
                  onPress={() => { handleChangeGender(val); setGenderModalVisible(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 26, marginRight: 12 }}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.genderOptLabel, { color: theme.text }]}>{label}</Text>
                    <Text style={[st.genderOptDesc, { color: theme.subText }]}>{desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Price / Duration Modal */}
      <Modal visible={priceModal.open} transparent animationType="fade"
        onRequestClose={() => setPriceModal(p => ({ ...p, open: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={st.overlay}>
            <View style={[st.modalBox, { backgroundColor: theme.card }]}>
              <Text style={[st.modalTitle, { color: theme.text }]}>{priceModal.subName}</Text>
              {priceModal.genderContext && (
                <Text style={[st.modalGender, { color: theme.subText }]}>
                  {priceModal.genderContext === 'male' ? '👨 Men' : '👩 Women'}
                </Text>
              )}

              <Text style={[st.modalLabel, { color: theme.subText }]}>Price (₹)</Text>
              <TextInput
                ref={priceRef}
                style={[st.modalInput, { color: theme.text, borderColor: theme.inputBorder, backgroundColor: theme.bg }]}
                value={priceModal.price}
                onChangeText={v => setPriceModal(p => ({ ...p, price: v }))}
                keyboardType="numeric" placeholder="e.g. 299" placeholderTextColor={theme.subText}
                returnKeyType="next" onSubmitEditing={() => durationRef.current?.focus()}
              />

              <Text style={[st.modalLabel, { color: theme.subText }]}>Duration (minutes)</Text>
              <TextInput
                ref={durationRef}
                style={[st.modalInput, { color: theme.text, borderColor: theme.inputBorder, backgroundColor: theme.bg }]}
                value={priceModal.duration}
                onChangeText={v => setPriceModal(p => ({ ...p, duration: v }))}
                keyboardType="numeric" placeholder="e.g. 30" placeholderTextColor={theme.subText}
                returnKeyType="done" onSubmitEditing={confirmSubPrice}
              />

              <View style={st.modalBtns}>
                <TouchableOpacity style={[st.modalCancel, { borderColor: theme.border }]} onPress={() => setPriceModal(p => ({ ...p, open: false }))}>
                  <Text style={[st.modalCancelTxt, { color: theme.subText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalConfirm} onPress={confirmSubPrice}>
                  <Text style={st.modalConfirmTxt}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getSt = (theme, isDark) => StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  card: { borderRadius: 14, padding: 14, borderWidth: 1 },
  secLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },

  genderPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  genderPickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' },
  genderPickerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  genderPickerValue: { fontSize: 14, fontWeight: '700' },

  genderModalBox: { width: '100%', borderRadius: 20, padding: 20, gap: 10 },
  genderModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  genderModalTitle: { fontSize: 16, fontWeight: '800' },
  genderModalSub: { fontSize: 12, marginTop: 2 },
  genderOptRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  genderOptLabel: { fontSize: 14, fontWeight: '700' },
  genderOptDesc: { fontSize: 12, marginTop: 1 },

  catCard: { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  catEmoji: { fontSize: 18 },
  catLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  expandCount: { fontSize: 12, color: theme.subText },

  subBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14, gap: 10, borderTopWidth: 1 },
  subHint: { fontSize: 11, color: theme.subText },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipM: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipF: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  chipTxt: { fontSize: 12, color: theme.text },
  chipTxtM: { color: '#fff', fontWeight: '600' },
  chipTxtF: { color: '#fff', fontWeight: '600' },
  chipPrice: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  gTag_m: { fontSize: 12, fontWeight: '700', color: theme.accent, marginBottom: 6 },
  gTag_f: { fontSize: 12, fontWeight: '700', color: '#be185d', marginBottom: 6 },

  selList: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border, gap: 5 },
  selListTitle: { fontSize: 11, fontWeight: '600', color: theme.subText, marginBottom: 2 },
  selRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selName: { flex: 1, fontSize: 12, fontWeight: '500' },
  selPrice: { fontSize: 12, color: theme.accent, fontWeight: '600' },
  selDur: { fontSize: 11 },

  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  optEmoji: { fontSize: 18 },
  optLabel: { flex: 1, fontSize: 14, fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  modalGender: { fontSize: 12, marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  modalInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalCancelTxt: { fontSize: 14, fontWeight: '600' },
  modalConfirm: { flex: 2, height: 46, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  modalConfirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
