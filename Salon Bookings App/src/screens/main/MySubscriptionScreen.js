import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#10b981', icon: 'checkmark-circle' },
  pending:  { label: 'Pending',  color: '#f59e0b', icon: 'hourglass-outline' },
  expired:  { label: 'Expired',  color: '#9ca3af', icon: 'time-outline' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: 'close-circle' },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

function PurchaseCard({ p, theme, isDark }) {
  const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
  const pkg = p.packageId || {};
  const isPackage = pkg.type === 'package' || p.type === 'package';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)' }]}>
          <Ionicons name={isPackage ? 'gift' : 'card'} size={20} color="#6366f1" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText style={[styles.cardName, { color: theme.text }]}>
              {p.packageName || pkg.name || (isPackage ? 'Package' : 'Membership')}
            </AppText>
            <View style={[styles.statusBadge, { backgroundColor: st.color + '22' }]}>
              <Ionicons name={st.icon} size={10} color={st.color} />
              <AppText style={[styles.statusText, { color: st.color }]}>{st.label}</AppText>
            </View>
          </View>
          {p.salonName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Ionicons name="location-outline" size={11} color={theme.subText} />
              <AppText style={{ fontSize: 12, color: theme.subText }}>{p.salonName}</AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {(p.purchaseDate || p.createdAt) ? (
          <View style={[styles.chip, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
            <AppText style={[styles.chipText, { color: theme.subText }]}>Purchased {fmt(p.purchaseDate || p.createdAt)}</AppText>
          </View>
        ) : null}
        {p.endDate && p.status === 'active' ? (
          <View style={[styles.chip, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
            <AppText style={[styles.chipText, { color: theme.subText }]}>Expires {fmt(p.endDate)}</AppText>
          </View>
        ) : null}
        {pkg.discountPercent > 0 ? (
          <View style={[styles.chip, { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'transparent' }]}>
            <AppText style={[styles.chipText, { color: '#6366f1', fontWeight: '700' }]}>{pkg.discountPercent}% off</AppText>
          </View>
        ) : null}
      </View>

      {pkg.benefits?.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {pkg.benefits.slice(0, 3).map((b, i) => (
            <View key={i} style={[styles.chip, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
              <AppText style={[styles.chipText, { color: theme.subText }]}>{b}</AppText>
            </View>
          ))}
          {pkg.benefits.length > 3 && (
            <AppText style={{ fontSize: 11, color: theme.subText, paddingHorizontal: 4, alignSelf: 'center' }}>+{pkg.benefits.length - 3} more</AppText>
          )}
        </View>
      )}

      {p.status === 'pending' && (
        <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 10, marginTop: 10 }}>
          <AppText style={{ fontSize: 12, color: '#f59e0b' }}>Awaiting confirmation from the salon owner.</AppText>
        </View>
      )}
    </View>
  );
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'expired', label: 'Expired' },
];

export default function MySubscriptionScreen() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/customer/my-packages');
      setPurchases(res.data?.data?.purchases || []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
    else setLoading(false);
  }, [isAuthenticated, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = filter === 'all' ? purchases : purchases.filter(p => p.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: theme.text }]}>My Subscription</AppText>
        <View style={{ width: 38 }} />
      </View>

      {!isAuthenticated ? (
        <View style={styles.empty}>
          <Ionicons name="ribbon-outline" size={44} color="rgba(99,102,241,0.4)" />
          <AppText style={[styles.emptyTitle, { color: theme.text }]}>Sign in to view your subscriptions</AppText>
          <AppText style={[styles.emptySub, { color: theme.subText }]}>Log in to see packages and memberships you've purchased from salons.</AppText>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Login')}>
            <AppText style={styles.ctaText}>Sign In</AppText>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {FILTERS.map(f => {
              const active = filter === f.key;
              const count = f.key !== 'all' ? purchases.filter(p => p.status === f.key).length : 0;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[styles.filterChip, { backgroundColor: active ? '#6366f1' : theme.cardAlt, borderColor: active ? '#6366f1' : theme.border }]}
                >
                  <AppText style={[styles.filterText, { color: active ? '#fff' : theme.subText }]}>
                    {f.label}{f.key !== 'all' && count > 0 ? `  ${count}` : ''}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={{ gap: 12 }}>
              {[1, 2].map(i => <View key={i} style={[styles.skeleton, { backgroundColor: theme.card, borderColor: theme.border }]} />)}
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="ribbon-outline" size={44} color="rgba(99,102,241,0.3)" />
              <AppText style={[styles.emptyTitle, { color: theme.text }]}>
                {filter === 'all' ? 'No packages yet' : `No ${filter} packages`}
              </AppText>
              <AppText style={[styles.emptySub, { color: theme.subText }]}>Browse salons and subscribe to packages or memberships to save more.</AppText>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('HomeMain')}>
                <AppText style={styles.ctaText}>Explore Salons</AppText>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map(p => <PurchaseCard key={p._id} p={p} theme={theme} isDark={isDark} />)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: '700' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  chipText: { fontSize: 11 },

  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '700' },
  skeleton: { height: 130, borderRadius: 18, borderWidth: 1 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
