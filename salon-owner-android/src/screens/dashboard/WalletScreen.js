import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RazorpayCheckout from '../../components/RazorpayCheckout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const SOURCE_LABEL = {
  recharge: 'Wallet Recharge',
  booking_payment: 'Booking Payment',
  booking_refund: 'Booking Refund',
  booking_earning: 'Booking Earning',
  admin_adjustment: 'Adjustment',
};

export default function WalletScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [amount, setAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);

  const loadWallet = useCallback(async () => {
    try {
      const res = await api.get('/owner/wallet');
      setBalance(res.data?.data?.balance ?? 0);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async (p = 1) => {
    try {
      const res = await api.get(`/owner/wallet/transactions?page=${p}&limit=10`);
      const data = res.data?.data;
      setTransactions(prev => (p === 1 ? (data?.transactions || []) : [...prev, ...(data?.transactions || [])]));
      setHasMore((data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1));
      setPage(p);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadWallet(), loadTransactions(1)]);
      setLoading(false);
    })();
  }, [loadWallet, loadTransactions]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadTransactions(page + 1);
    setLoadingMore(false);
  };

  const handleRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    setRecharging(true);
    try {
      const orderRes = await api.post('/owner/wallet/recharge/order', { amount: amt });
      const { order, razorpayKeyId } = orderRes.data?.data || {};
      if (!order?.orderId) throw new Error('Could not create payment order');

      setCheckoutOrder({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
      });
    } catch {
      setRecharging(false);
    }
  };

  const handlePaymentSuccess = async (response) => {
    setCheckoutOrder(null);
    try {
      await api.post('/owner/wallet/recharge/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      setAmount('');
      await Promise.all([loadWallet(), loadTransactions(1)]);
    } catch {
    } finally {
      setRecharging(false);
    }
  };

  const handlePaymentFailure = () => {
    setCheckoutOrder(null);
    setRecharging(false);
  };

  const handlePaymentDismiss = () => {
    setCheckoutOrder(null);
    setRecharging(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Wallet</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceLabelRow}>
            <Ionicons name="wallet-outline" size={16} color="#fff" />
            <Text style={styles.balanceLabel}>GlowLoox Wallet</Text>
          </View>
          {loading ? (
            <View style={styles.balanceSkeleton} />
          ) : (
            <Text style={styles.balanceAmount}>
              ₹{(balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
          <Text style={styles.balanceSub}>Earnings & available balance</Text>
        </View>

        {/* Recharge */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Add Money</Text>

          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(a => {
              const active = amount === String(a);
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => setAmount(String(a))}
                  style={[
                    styles.quickChip,
                    {
                      borderColor: active ? '#7c3aed' : theme.border,
                      backgroundColor: active ? 'rgba(124,58,237,0.1)' : theme.cardAlt,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#7c3aed' : theme.subText }}>₹{a}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.rechargeRow}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: theme.cardAlt, borderColor: theme.border, color: theme.text }]}
            />
            <TouchableOpacity onPress={handleRecharge} disabled={recharging} style={[styles.addBtn, { opacity: recharging ? 0.7 : 1 }]}>
              {recharging ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={18} color="#fff" />}
              <Text style={styles.addBtnText}>{recharging ? '...' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Transaction History</Text>
        <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#7c3aed" />
            </View>
          ) : transactions.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: theme.subText }}>No transactions yet.</Text>
            </View>
          ) : (
            transactions.map((txn, i) => {
              const isCredit = txn.type === 'credit';
              return (
                <View
                  key={txn._id}
                  style={[styles.txnRow, i < transactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                >
                  <View style={[styles.txnIcon, { backgroundColor: isCredit ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)' }]}>
                    <Ionicons
                      name={isCredit ? 'arrow-down' : 'arrow-up'}
                      size={15}
                      color={isCredit ? '#059669' : '#dc2626'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txnLabel, { color: theme.text }]}>{SOURCE_LABEL[txn.source] || txn.source}</Text>
                    <Text style={[styles.txnDate, { color: theme.subText }]}>
                      {new Date(txn.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isCredit ? '#059669' : '#dc2626' }}>
                    {isCredit ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {hasMore && (
          <TouchableOpacity onPress={handleLoadMore} disabled={loadingMore} style={[styles.loadMoreBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.subText }}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <RazorpayCheckout
        visible={!!checkoutOrder}
        order={checkoutOrder}
        prefill={{ name: user?.name || '', contact: user?.phone || '', email: user?.email || '' }}
        description="Wallet Recharge"
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onDismiss={handlePaymentDismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll:      { padding: 16, paddingBottom: 40 },
  balanceCard: { borderRadius: 18, padding: 20, marginBottom: 18, backgroundColor: '#7c3aed' },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, opacity: 0.85 },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
  balanceAmount: { fontSize: 30, fontWeight: '800', color: '#fff' },
  balanceSkeleton: { height: 32, width: 140, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)' },
  balanceSub:  { fontSize: 12, color: '#fff', opacity: 0.75, marginTop: 4 },
  card:        { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 18 },
  cardTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  quickRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  quickChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  rechargeRow: { flexDirection: 'row', gap: 8 },
  input:       { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#7c3aed' },
  addBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle:{ fontSize: 13, fontWeight: '700', marginBottom: 10 },
  listCard:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  txnRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  txnIcon:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnLabel:    { fontSize: 13.5, fontWeight: '600' },
  txnDate:     { fontSize: 11.5, marginTop: 2 },
  loadMoreBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
