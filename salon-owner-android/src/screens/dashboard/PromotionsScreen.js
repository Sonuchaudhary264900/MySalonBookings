import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';
import RazorpayCheckout from '../../components/RazorpayCheckout';

const BIZ_NAME_MAP = {
  barbershop:    'Barbershop',
  salon:         'Business',
  spa_wellness:  'Spa',
  makeup_bridal: 'Studio',
  skin_derma:    'Clinic',
};

const STATUS_STYLES = {
  active:          { label: 'Active',    color: '#10b981' },
  expired:         { label: 'Expired',   color: '#9ca3af' },
  cancelled:       { label: 'Cancelled', color: '#ef4444' },
  pending_payment: { label: 'Pending',   color: '#d97706' },
};

/* ── Countdown ───────────────────────────────────────────────── */
function useCountdown(endDate) {
  const calc = () => {
    if (!endDate) return null;
    const ms = new Date(endDate) - new Date();
    if (ms <= 0) return { days: 0, hours: 0, mins: 0 };
    return {
      days: Math.floor(ms / 86400000),
      hours: Math.floor((ms % 86400000) / 3600000),
      mins: Math.floor((ms % 3600000) / 60000),
    };
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 30000);
    return () => clearInterval(t);
  });
  return left;
}

/* ── Active promotion banner ─────────────────────────────────── */
function ActiveBanner({ promotion, bizName, theme, isDark }) {
  const left = useCountdown(promotion?.endDate);
  if (!promotion) return null;
  return (
    <View style={[styles.activeBanner, { backgroundColor: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff', borderColor: isDark ? 'rgba(124,58,237,0.35)' : '#ddd6fe' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={styles.bannerIcon}>
          <Ionicons name="megaphone" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.liveBadge, { alignSelf: 'flex-start' }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>ACTIVE</Text>
          </View>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>Your {bizName} is promoted within {promotion.radiusKm} km</Text>
          <Text style={{ color: theme.subText, fontSize: 12, marginTop: 2 }}>Customers near your {bizName} see you first in search results</Text>
          {left && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
              {[['Days', left.days], ['Hours', left.hours], ['Min', left.mins]].map(([label, val]) => (
                <View key={label} style={{ alignItems: 'center' }}>
                  <Text style={styles.countNum}>{val}</Text>
                  <Text style={styles.countLabel}>{label}</Text>
                </View>
              ))}
              <Text style={{ color: theme.subText, fontSize: 11 }}>remaining</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { salon } = useSalon();
  const { user } = useAuth();

  const [tiers, setTiers] = useState([]);
  const [activePromotion, setActivePromotion] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [pendingPromotionId, setPendingPromotionId] = useState(null);
  const [paying, setPaying] = useState(false);

  const bizName = BIZ_NAME_MAP[salon?.businessType] || 'Business';

  const fetchAll = useCallback(async () => {
    try {
      const [tiersRes, activeRes, historyRes] = await Promise.all([
        api.get('/owner/promotions/pricing'),
        api.get('/owner/promotions/active'),
        api.get('/owner/promotions/history'),
      ]);
      setTiers(tiersRes.data.data?.tiers || []);
      setActivePromotion(activeRes.data.data?.promotion || null);
      setHistory(historyRes.data.data?.promotions || []);
    } catch {
      showError('Failed to load promotion data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const hasActive = !!activePromotion;

  const handlePromote = async () => {
    // Online payments temporarily disabled for launch (cash-only phase). Re-enable with Razorpay Route.
    showError('Online payments are temporarily unavailable. Please try again later.');
    return;
    if (!selectedTier) { showError('Please select a radius first'); return; }
    setPaying(true);
    try {
      const res = await api.post('/owner/promotions/create-order', { pricingTierId: selectedTier._id });
      if (!res.data.success) {
        showError(res.data.message || 'Failed to create order');
        setPaying(false);
        return;
      }
      const { promotionId, razorpayOrderId, amount, razorpayKeyId } = res.data.data;
      setPendingPromotionId(promotionId);
      setCheckoutOrder({
        key: razorpayKeyId,
        amount,
        currency: 'INR',
        orderId: razorpayOrderId,
      });
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setPaying(false);
    }
  };

  const handlePaymentSuccess = async (response) => {
    setCheckoutOrder(null);
    try {
      const vRes = await api.post('/owner/promotions/verify-payment', {
        promotionId: pendingPromotionId,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      if (vRes.data.success) {
        showSuccess('Promotion activated!', `Your ${bizName} now appears at the top.`);
        setSelectedTier(null);
        fetchAll();
      } else {
        showError('Verification failed. Contact support.');
      }
    } catch {
      showError('Payment verification failed. Contact support.');
    } finally {
      setPendingPromotionId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Promote Your Business</Text>
            <Text style={styles.headerSub}>Appear at the top of search results near you</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        >
          {/* How it works */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[
              { icon: 'location-outline', color: '#7c3aed', label: 'Choose Radius', sub: 'Pick your reach' },
              { icon: 'card-outline', color: '#6366f1', label: 'Pay Once', sub: '7-day boost' },
              { icon: 'trending-up-outline', color: '#10b981', label: 'Appear on Top', sub: 'Get seen first' },
            ].map(s => (
              <View key={s.label} style={[styles.howCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.howIcon, { backgroundColor: s.color + '22' }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                </View>
                <Text style={[styles.howLabel, { color: theme.text }]}>{s.label}</Text>
                <Text style={[styles.howSub, { color: theme.subText }]}>{s.sub}</Text>
              </View>
            ))}
          </View>

          {hasActive && <ActiveBanner promotion={activePromotion} bizName={bizName} theme={theme} isDark={isDark} />}

          {/* Tier selection */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Promotion Radius</Text>
          {tiers.length === 0 ? (
            <View style={[styles.emptyTiers, { borderColor: theme.border }]}>
              <Ionicons name="megaphone-outline" size={28} color={theme.subText} />
              <Text style={{ color: theme.subText, fontSize: 13, marginTop: 8 }}>No pricing tiers configured yet.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {tiers.map(tier => {
                const sel = selectedTier?._id === tier._id;
                const popular = tier.radiusKm === 10;
                return (
                  <TouchableOpacity
                    key={tier._id}
                    onPress={() => !hasActive && setSelectedTier(tier)}
                    disabled={hasActive}
                    style={[styles.tierCard, {
                      borderColor: sel ? '#6366f1' : theme.border,
                      backgroundColor: sel ? (isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff') : theme.card,
                      opacity: hasActive ? 0.5 : 1,
                    }]}
                  >
                    {popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Popular</Text>
                      </View>
                    )}
                    <View style={[styles.tierIcon, { backgroundColor: sel ? '#c7d2fe' : (isDark ? '#0f172a' : '#f3f4f6') }]}>
                      <Ionicons name="location" size={16} color={sel ? '#4338ca' : theme.subText} />
                    </View>
                    <Text style={[styles.tierRadius, { color: theme.text }]}>{tier.radiusKm} <Text style={{ fontSize: 12, color: theme.subText }}>km</Text></Text>
                    <Text style={styles.tierPrice}>₹{tier.pricePerWeek}</Text>
                    <Text style={{ color: theme.subText, fontSize: 10 }}>per week</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {hasActive && (
            <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : '#fffbeb', borderColor: isDark ? 'rgba(217,119,6,0.3)' : '#fde68a' }]}>
              <Text style={{ color: '#d97706', fontSize: 12 }}>
                You already have an active promotion. Buy a new one after it expires on {new Date(activePromotion.endDate).toLocaleDateString('en-IN')}.
              </Text>
            </View>
          )}

          {/* Promote button */}
          {!hasActive && tiers.length > 0 && (
            <TouchableOpacity
              onPress={handlePromote}
              disabled={!selectedTier || paying}
              style={[styles.promoteBtn, { opacity: (!selectedTier || paying) ? 0.4 : 1 }]}
            >
              {paying ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="flash" size={16} color="#fff" />
                  <Text style={styles.promoteText}>
                    {selectedTier ? `Promote for ₹${selectedTier.pricePerWeek} — ${selectedTier.radiusKm} km` : 'Select a radius above'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* History */}
          {history.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowHistory(h => !h)} style={styles.historyToggle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={16} color={theme.subText} />
                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Promotion History</Text>
                  <Text style={{ color: theme.subText, fontSize: 12 }}>({history.length})</Text>
                </View>
                <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={theme.subText} />
              </TouchableOpacity>
              {showHistory && history.map(p => {
                const st = STATUS_STYLES[p.status] || { label: p.status, color: theme.subText };
                return (
                  <View key={p._id} style={[styles.historyRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.tierIcon, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : '#f5f3ff', width: 32, height: 32, marginBottom: 0 }]}>
                      <Ionicons name="location" size={14} color="#7c3aed" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{p.radiusKm} km radius</Text>
                      <Text style={{ color: theme.subText, fontSize: 11 }}>
                        {p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}
                        {p.endDate ? ` → ${new Date(p.endDate).toLocaleDateString('en-IN')}` : ''}
                      </Text>
                    </View>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700', marginRight: 8 }}>₹{p.pricePaid}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '22' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={{ color: theme.subText, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 }}>
            Promotions are non-refundable. Your {bizName} appears at the top for customers within the selected radius for 7 days. Only one active promotion at a time.
          </Text>
        </ScrollView>
      )}

      <RazorpayCheckout
        visible={!!checkoutOrder}
        order={checkoutOrder}
        prefill={{ name: user?.name || '', contact: user?.phone || '', email: user?.email || '' }}
        description={selectedTier ? `Business Promotion – ${selectedTier.radiusKm} km for 1 Week` : 'Business Promotion'}
        onSuccess={handlePaymentSuccess}
        onDismiss={() => { setCheckoutOrder(null); setPendingPromotionId(null); }}
        onFailure={() => { setCheckoutOrder(null); setPendingPromotionId(null); showError('Payment failed'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { color: '#ddd6fe', fontSize: 12, marginTop: 2 },

  howCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center' },
  howIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  howLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  howSub: { fontSize: 9, marginTop: 2, textAlign: 'center' },

  activeBanner: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, marginBottom: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  liveText: { color: '#10b981', fontSize: 10, fontWeight: '800' },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  countNum: { fontSize: 18, fontWeight: '900', color: '#7c3aed' },
  countLabel: { fontSize: 9, color: '#9ca3af', textTransform: 'uppercase' },

  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  emptyTiers: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 30 },
  tierCard: { width: '31%', borderWidth: 2, borderRadius: 16, padding: 12, alignItems: 'flex-start' },
  popularBadge: { position: 'absolute', top: -8, right: 6, backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 99 },
  popularText: { color: '#78350f', fontSize: 9, fontWeight: '800' },
  tierIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tierRadius: { fontSize: 22, fontWeight: '900' },
  tierPrice: { fontSize: 16, fontWeight: '900', color: '#6366f1', marginTop: 4 },

  noticeBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  promoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7c3aed', borderRadius: 16, paddingVertical: 15, marginTop: 16 },
  promoteText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
