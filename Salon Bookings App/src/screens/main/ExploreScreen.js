import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, ActivityIndicator, Image, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import {
  getCategoryOrderForBusinessType, resolveSubServices, resolveCategoryIcon,
  CATEGORY_CARD_IMAGE_MAP,
} from '../../constants/salonCategories';

const BIZ_TYPES = [
  { key: 'barbershop',    label: 'Barbershop',     sub: 'Haircuts, fades, beard grooming',  icon: 'cut',      color: '#3b82f6' },
  { key: 'salon',         label: 'Salon',           sub: 'Hair, nails, skin, bridal',        icon: 'sparkles', color: '#8b5cf6' },
  { key: 'spa_wellness',  label: 'Spa & Wellness',  sub: 'Massage, relaxation, body care',   icon: 'leaf',     color: '#10b981' },
  { key: 'makeup_bridal', label: 'Makeup & Bridal', sub: 'Bridal looks, party makeup',       icon: 'heart',    color: '#ec4899' },
  { key: 'skin_derma',    label: 'Skin & Derma',    sub: 'Facials, treatments, dermatology', icon: 'star',     color: '#f59e0b' },
];

function SalonCard({ salon, theme, onPress }) {
  const photo = salon.photos?.[0] || salon.coverPhoto || salon.logo;
  return (
    <TouchableOpacity style={[styles.salonCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.salonImgWrap}>
        {photo
          ? <Image source={{ uri: photo }} style={styles.salonImg} />
          : <View style={[styles.salonImg, { backgroundColor: '#312e81', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="cut" size={26} color="#6366f1" /></View>
        }
        {salon.averageRating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color="#fbbf24" />
            <AppText style={styles.ratingText}>{salon.averageRating.toFixed(1)}</AppText>
          </View>
        )}
      </View>
      <View style={{ padding: 12 }}>
        <AppText style={[styles.salonName, { color: theme.text }]} numberOfLines={1}>{salon.name}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={11} color={theme.subText} />
          <AppText style={{ fontSize: 12, color: theme.subText }} numberOfLines={1}>{salon.locality || salon.city || '—'}</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();

  const [step, setStep]       = useState('biz');   // biz | cats | subs | salons
  const [selBiz, setSelBiz]   = useState(null);
  const [selCat, setSelCat]   = useState(null);
  const [selSub, setSelSub]   = useState(null);
  const [cats, setCats]       = useState([]);
  const [subs, setSubs]       = useState([]);
  const [salons, setSalons]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');

  // biz selected → build categories
  useEffect(() => {
    if (!selBiz) return;
    const order = getCategoryOrderForBusinessType(selBiz.key, 'unisex');
    const seen = new Set();
    const built = order.filter(l => { if (seen.has(l)) return false; seen.add(l); return true; })
      .map(label => ({ key: label, label, icon: resolveCategoryIcon(label), subs: resolveSubServices(label) }));
    setCats(built);
  }, [selBiz]);

  useEffect(() => { if (selCat) setSubs(selCat.subs || []); }, [selCat]);

  const fetchSalons = useCallback(async (subLabel) => {
    setLoading(true);
    setSalons([]);
    try {
      const res = await api.get('/public/salons?limit=50');
      const all = res.data?.data?.salons || res.data?.data || [];
      const q = subLabel.toLowerCase();
      const filtered = all.filter(s => {
        const bizMatch = !selBiz || s.businessType === selBiz.key || !s.businessType;
        const offNames = (s.offeredCategories || []).flatMap(c => [c.name, ...((c.subServices || []).map(ss => ss.name))]);
        const svcMatch = offNames.length === 0 || offNames.some(n => n && (n.toLowerCase().includes(q) || q.includes(n.toLowerCase())));
        return bizMatch && svcMatch;
      });
      setSalons(filtered);
    } catch {
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [selBiz]);

  const goBack = () => {
    setSearch('');
    if (step === 'salons') { setStep('subs'); setSalons([]); }
    else if (step === 'subs') { setStep('cats'); setSelCat(null); }
    else if (step === 'cats') { setStep('biz'); setSelBiz(null); }
    else navigation.goBack();
  };

  const openSalon = (salon) => navigation.navigate(isAuthenticated ? 'SalonDetails' : 'GuestSalonDetails', { salonId: salon._id });

  const filterText = (items, getName) => !search.trim() ? items : items.filter(it => getName(it).toLowerCase().includes(search.toLowerCase()));

  const title = step === 'biz' ? 'Explore Services' : step === 'cats' ? selBiz?.label : step === 'subs' ? selCat?.label : selSub;
  const subtitle = step === 'biz' ? 'Choose a business type' : step === 'cats' ? 'Select a category' : step === 'subs' ? 'Choose a service' : `${salons.length} salon${salons.length !== 1 ? 's' : ''} found`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <AppText style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{title}</AppText>
          <AppText style={[styles.headerSub, { color: theme.subText }]}>{subtitle}</AppText>
        </View>
      </View>

      {/* Search (cats + subs) */}
      {(step === 'cats' || step === 'subs') && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={15} color={theme.subText} />
            <TextInput value={search} onChangeText={setSearch}
              placeholder={step === 'cats' ? 'Search categories…' : 'Search services…'}
              placeholderTextColor={theme.placeholder} style={[styles.searchInput, { color: theme.text }]} />
            {!!search && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={theme.subText} /></TouchableOpacity>}
          </View>
        </View>
      )}

      {/* STEP biz */}
      {step === 'biz' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {BIZ_TYPES.map(biz => (
            <TouchableOpacity key={biz.key} activeOpacity={0.85}
              onPress={() => { setSelBiz(biz); setSelCat(null); setSelSub(null); setStep('cats'); }}
              style={[styles.bizCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.bizIcon, { backgroundColor: biz.color + '1a', borderColor: biz.color + '33' }]}>
                <Ionicons name={biz.icon} size={20} color={biz.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.bizLabel, { color: theme.text }]}>{biz.label}</AppText>
                <AppText style={[styles.bizSub, { color: theme.subText }]}>{biz.sub}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.subText} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* STEP cats */}
      {step === 'cats' && (
        <FlatList
          data={filterText(cats, c => c.label)}
          keyExtractor={c => c.key}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 12 }}
          renderItem={({ item }) => {
            const img = CATEGORY_CARD_IMAGE_MAP[item.label];
            return (
              <TouchableOpacity style={{ flex: 1, maxWidth: '48.5%' }} activeOpacity={0.85}
                onPress={() => { setSelCat(item); setSelSub(null); setStep('subs'); setSearch(''); }}>
                <View style={[styles.catCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.catImgWrap}>
                    {img ? <Image source={{ uri: img }} style={styles.catImg} />
                      : <View style={[styles.catImg, { backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name={item.icon} size={26} color={theme.subText} /></View>}
                  </View>
                  <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 13, fontWeight: '700', color: theme.text }} numberOfLines={1}>{item.label}</AppText>
                      <AppText style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>{item.subs.length} services</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={theme.subText} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* STEP subs */}
      {step === 'subs' && (
        <FlatList
          data={filterText(subs, x => x)}
          keyExtractor={(x, i) => x + i}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
          ListEmptyComponent={<AppText style={{ textAlign: 'center', color: theme.subText, marginTop: 40 }}>No services match "{search}"</AppText>}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => { setSelSub(item); setStep('salons'); fetchSalons(item); }}
              style={[styles.subRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.subIcon, { backgroundColor: theme.cardAlt }]}>
                <Ionicons name={selCat?.icon || 'cut-outline'} size={16} color={theme.accent} />
              </View>
              <AppText style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text }}>{item}</AppText>
              <Ionicons name="chevron-forward" size={16} color={theme.subText} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* STEP salons */}
      {step === 'salons' && (
        loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
        ) : salons.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={44} color={theme.border} />
            <AppText style={[styles.emptyTitle, { color: theme.text }]}>No salons found</AppText>
            <AppText style={[styles.emptySub, { color: theme.subText }]}>No salons currently offer "{selSub}".</AppText>
            <TouchableOpacity style={styles.tryBtn} onPress={goBack}>
              <AppText style={styles.tryBtnText}>Try another service</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={salons}
            keyExtractor={item => item._id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 12 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: '48.5%' }}>
                <SalonCard salon={item} theme={theme} onPress={() => openSalon(item)} />
              </View>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  bizCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
  bizIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bizLabel: { fontSize: 16, fontWeight: '800' },
  bizSub: { fontSize: 12, marginTop: 2 },

  catCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  catImgWrap: { height: 90, backgroundColor: '#1a1a1a' },
  catImg: { width: '100%', height: '100%' },

  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  subIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  salonCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  salonImgWrap: { height: 120, backgroundColor: '#1a1a1a' },
  salonImg: { width: '100%', height: '100%' },
  ratingBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  salonName: { fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6 },
  tryBtn: { marginTop: 18, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12 },
  tryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
