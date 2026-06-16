import React, { useState, useCallback } from 'react';
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

const BIZ_TYPES = [
  { key: 'barbershop',   label: 'Barbershop',      sub: 'Haircuts, fades, beard grooming', icon: 'cut',       color: '#3b82f6' },
  { key: 'salon',        label: 'Salon',            sub: 'Hair, nails, skin, bridal',       icon: 'sparkles',  color: '#8b5cf6' },
  { key: 'spa_wellness', label: 'Spa & Wellness',   sub: 'Massage, relaxation, body care',  icon: 'leaf',      color: '#10b981' },
  { key: 'makeup_bridal',label: 'Makeup & Bridal',  sub: 'Bridal looks, party makeup',      icon: 'heart',     color: '#ec4899' },
  { key: 'skin_derma',   label: 'Skin & Derma',     sub: 'Facials, treatments, dermatology',icon: 'star',      color: '#f59e0b' },
];

function SalonCard({ salon, theme, isDark, onPress }) {
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

  const [selBiz, setSelBiz] = useState(null);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSalons = useCallback(async (biz) => {
    setLoading(true);
    setSalons([]);
    try {
      const res = await api.get('/public/salons?limit=50');
      const all = res.data?.data?.salons || res.data?.data || [];
      const filtered = all.filter(s => !biz || s.businessType === biz.key || !s.businessType);
      setSalons(filtered);
    } catch {
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBizSelect = (biz) => {
    setSelBiz(biz);
    setSearch('');
    fetchSalons(biz);
  };

  const goBack = () => {
    if (selBiz) { setSelBiz(null); setSalons([]); setSearch(''); }
    else navigation.goBack();
  };

  const openSalon = (salon) => {
    navigation.navigate(isAuthenticated ? 'SalonDetails' : 'GuestSalonDetails', { salonId: salon._id });
  };

  const visibleSalons = search.trim()
    ? salons.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.locality || s.city || '').toLowerCase().includes(search.toLowerCase()))
    : salons;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>{selBiz ? selBiz.label : 'Explore Services'}</AppText>
          <AppText style={[styles.headerSub, { color: theme.subText }]}>
            {selBiz ? `${visibleSalons.length} salon${visibleSalons.length !== 1 ? 's' : ''}` : 'Choose a business type'}
          </AppText>
        </View>
      </View>

      {!selBiz ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {BIZ_TYPES.map(biz => (
            <TouchableOpacity
              key={biz.key}
              onPress={() => handleBizSelect(biz)}
              activeOpacity={0.85}
              style={[styles.bizCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
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
      ) : (
        <>
          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={[styles.searchBar, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={15} color={theme.subText} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search salons..."
                placeholderTextColor={theme.placeholder}
                style={[styles.searchInput, { color: theme.text }]}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.subText} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
          ) : visibleSalons.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={44} color={theme.border} />
              <AppText style={[styles.emptyTitle, { color: theme.text }]}>No salons found</AppText>
              <AppText style={[styles.emptySub, { color: theme.subText }]}>No {selBiz.label.toLowerCase()} salons nearby right now.</AppText>
            </View>
          ) : (
            <FlatList
              data={visibleSalons}
              keyExtractor={item => item._id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 12 }}
              renderItem={({ item }) => (
                <View style={{ flex: 1, maxWidth: '48.5%' }}>
                  <SalonCard salon={item} theme={theme} isDark={isDark} onPress={() => openSalon(item)} />
                </View>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },

  bizCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
  bizIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bizLabel: { fontSize: 16, fontWeight: '800' },
  bizSub: { fontSize: 12, marginTop: 2 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  salonCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  salonImgWrap: { height: 120, backgroundColor: '#1a1a1a' },
  salonImg: { width: '100%', height: '100%' },
  ratingBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  salonName: { fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6 },
});
