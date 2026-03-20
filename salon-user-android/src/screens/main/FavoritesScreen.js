import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

function StarRating({ rating }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={11} color="#f59e0b" />
      ))}
    </View>
  );
}

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { isAuthenticated } = useAuth();
  const [salons, setSalons]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving]   = useState(null);

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) loadFavorites();
  }, [isAuthenticated]));

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customer/favorites');
      const data = res.data.data?.salons || res.data.data || [];
      setSalons(Array.isArray(data) ? data : []);
    } catch {
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites().catch(() => {});
    setRefreshing(false);
  };

  const handleRemove = (salonId, salonName) => {
    Alert.alert('Remove Saved', `Remove ${salonName} from your saved salons?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setRemoving(salonId);
        try {
          await api.post(`/customer/favorites/${salonId}`);
          setSalons(prev => prev.filter(s => s._id !== salonId));
        } catch (err) {
          showError('Error', err?.message || 'Failed to remove. Try again.');
        } finally {
          setRemoving(null);
        }
      }},
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="heart-outline" size={56} color="#d1d5db" />
        <Text style={styles.guestTitle}>Sign in to save salons</Text>
        <Text style={styles.guestText}>Keep track of your favourite salons in one place</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const photo    = item.photos?.[0] || item.coverPhoto;
    const rating   = item.rating || item.averageRating || 0;
    const reviews  = item.reviewCount || item.totalReviews || 0;
    const isRemoving = removing === item._id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SalonDetails', { salonId: item._id })}
        activeOpacity={0.92}
      >
        {/* Image */}
        <View style={styles.imgWrapper}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.img} />
          ) : (
            <View style={[styles.img, styles.imgPlaceholder]}>
              <Ionicons name="cut" size={32} color="#93c5fd" />
            </View>
          )}
          {/* Remove button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => handleRemove(item._id, item.name)}
            disabled={isRemoving}
          >
            {isRemoving
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Ionicons name="heart" size={18} color="#ef4444" />}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardCategory}>{(item.category || '').replace('_', ' ')}</Text>

          {rating > 0 && (
            <View style={styles.cardRow}>
              <StarRating rating={rating} />
              <Text style={styles.cardRating}>{rating.toFixed(1)}</Text>
              {reviews > 0 && <Text style={styles.cardReviews}>({reviews})</Text>}
            </View>
          )}

          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={13} color="#6b7280" />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.address || [item.city, item.state].filter(Boolean).join(', ') || 'Address not listed'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('SalonDetails', { salonId: item._id })}
          >
            <Text style={styles.bookBtnText}>View & Book</Text>
            <Ionicons name="arrow-forward" size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Saved Salons</Text>
            <Text style={styles.headerSub}>{salons.length} salon{salons.length !== 1 ? 's' : ''} saved</Text>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.getParent('DrawerNav')?.openDrawer()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : salons.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={52} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No saved salons yet</Text>
          <Text style={styles.emptyText}>Tap the heart icon on any salon to save it here</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('HomeTab')}>
            <Text style={styles.exploreBtnText}>Explore Salons</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={salons}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
        />
      )}
    </View>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -30 },
  decorCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  menuBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  emptyText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginTop: 16 },
  guestText: { fontSize: 14, color: t.subText, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  signInBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: t.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: t.border },
  imgWrapper: { position: 'relative' },
  img: { width: '100%', height: 150 },
  imgPlaceholder: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  heartBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardBody: { padding: 12, gap: 5 },
  cardName: { fontSize: 16, fontWeight: '700', color: t.text },
  cardCategory: { fontSize: 12, color: t.subText, textTransform: 'capitalize' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardRating: { fontSize: 12, fontWeight: '700', color: t.text },
  cardReviews: { fontSize: 12, color: t.subText },
  cardAddress: { fontSize: 12, color: t.subText, flex: 1 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
});
