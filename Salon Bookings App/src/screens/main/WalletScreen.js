import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import RazorpayCheckout from '../../components/RazorpayCheckout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { showError, showSuccess } from '../../utils/toast';
import api from '../../services/api';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

const SOURCE_LABEL = {
  recharge: 'Wallet Recharge',
  booking_payment: 'Booking Payment',
  booking_refund: 'Booking Refund',
  booking_earning: 'Booking Earning',
  admin_adjustment: 'Adjustment',
  withdrawal: 'Withdrawal to Bank',
  withdrawal_refund: 'Withdrawal Refund',
};

const WITHDRAWAL_STATUS = {
  pending:  { label: 'Pending',  color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  paid:     { label: 'Paid',     color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
};

const UPI_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

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
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);

  const loadWallet = useCallback(async () => {
    try {
      const res = await api.get('/customer/wallet');
      setBalance(res.data?.data?.balance ?? 0);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async (p = 1) => {
    try {
      const res = await api.get(`/customer/wallet/transactions?page=${p}&limit=10`);
      const data = res.data?.data;
      setTransactions(prev => (p === 1 ? (data?.transactions || []) : [...prev, ...(data?.transactions || [])]));
      setHasMore((data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1));
      setPage(p);
    } catch {}
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try {
      const res = await api.get('/customer/wallet/withdrawals?page=1&limit=5');
      setWithdrawals(res.data?.data?.requests || []);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadWallet(), loadTransactions(1), loadWithdrawals()]);
      setLoading(false);
    })();
  }, [loadWallet, loadTransactions, loadWithdrawals]);

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt < 50) { showError('Invalid Amount', 'Minimum withdrawal amount is ₹50.'); return; }
    if (balance != null && amt > balance) { showError('Invalid Amount', 'Amount exceeds your wallet balance.'); return; }
    if (!UPI_REGEX.test(withdrawUpi.trim())) { showError('Invalid UPI ID', 'Enter a valid UPI ID (e.g. name@upi).'); return; }

    setWithdrawing(true);
    try {
      const res = await api.post('/customer/wallet/withdraw', { amount: amt, upiId: withdrawUpi.trim() });
      setBalance(res.data?.data?.balance ?? balance);
      setWithdrawAmount('');
      showSuccess('Withdrawal Requested', 'Money will reach your account within 1–3 business days.');
      await Promise.all([loadTransactions(1), loadWithdrawals()]);
    } catch (err) {
      showError('Withdrawal Failed', err?.response?.data?.message || err?.message || 'Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadTransactions(page + 1);
    setLoadingMore(false);
  };

  const handleRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showError('Invalid Amount', 'Enter a valid amount');
      return;
    }

    setRecharging(true);
    try {
      const orderRes = await api.post('/customer/wallet/recharge/order', { amount: amt });
      const { order, razorpayKeyId } = orderRes.data?.data || {};
      if (!order?.orderId) throw new Error('Could not create payment order');

      setCheckoutOrder({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
      });
    } catch (err) {
      showError('Recharge Failed', err?.message || 'Something went wrong');
      setRecharging(false);
    }
  };

  const handlePaymentSuccess = async (response) => {
    setCheckoutOrder(null);
    try {
      await api.post('/customer/wallet/recharge/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      showSuccess('Wallet Recharged', `₹${amount} added to your wallet`);
      setAmount('');
      await Promise.all([loadWallet(), loadTransactions(1)]);
    } catch (err) {
      showError('Verification Failed', err?.message || 'Contact support if money was deducted.');
    } finally {
      setRecharging(false);
    }
  };

  const handlePaymentFailure = () => {
    setCheckoutOrder(null);
    setRecharging(false);
    showError('Payment Failed', 'Please try again.');
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
        <AppText style={[styles.headerTitle, { color: theme.text }]}>Wallet</AppText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceLabelRow}>
            <Ionicons name="wallet-outline" size={16} color="#fff" />
            <AppText style={styles.balanceLabel}>GlowLoox Wallet</AppText>
          </View>
          {loading ? (
            <View style={styles.balanceSkeleton} />
          ) : (
            <AppText style={styles.balanceAmount}>
              ₹{(balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </AppText>
          )}
          <AppText style={styles.balanceSub}>Available balance</AppText>
        </View>

        {/* Recharge */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <AppText style={[styles.cardTitle, { color: theme.text }]}>Add Money</AppText>

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
                      borderColor: active ? '#8b5cf6' : theme.border,
                      backgroundColor: active ? 'rgba(139,92,246,0.1)' : theme.cardAlt,
                    },
                  ]}
                >
                  <AppText style={{ fontSize: 13, fontWeight: '600', color: active ? '#8b5cf6' : theme.subText }}>₹{a}</AppText>
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
              <AppText style={styles.addBtnText}>{recharging ? '...' : 'Add'}</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Withdraw */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="business-outline" size={15} color="#8b5cf6" />
            <AppText style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Withdraw to Bank (UPI)</AppText>
          </View>
          <AppText style={{ fontSize: 11, color: theme.subText, marginBottom: 12 }}>
            Transfer wallet money back to your own account. Minimum ₹50 · processed within 1–3 business days.
          </AppText>

          <TextInput
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            placeholder="Amount to withdraw"
            placeholderTextColor={theme.subText}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.cardAlt, borderColor: theme.border, color: theme.text, flex: 0, marginBottom: 8 }]}
          />
          <View style={styles.rechargeRow}>
            <TextInput
              value={withdrawUpi}
              onChangeText={setWithdrawUpi}
              placeholder="Your UPI ID (e.g. name@upi)"
              placeholderTextColor={theme.subText}
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: theme.cardAlt, borderColor: theme.border, color: theme.text }]}
            />
            <TouchableOpacity
              onPress={handleWithdraw}
              disabled={withdrawing}
              style={[styles.withdrawBtn, { borderColor: 'rgba(139,92,246,0.4)', backgroundColor: theme.cardAlt, opacity: withdrawing ? 0.7 : 1 }]}
            >
              {withdrawing ? <ActivityIndicator color="#8b5cf6" size="small" /> : <Ionicons name="arrow-up" size={16} color="#8b5cf6" />}
              <AppText style={{ color: '#8b5cf6', fontSize: 14, fontWeight: '700' }}>{withdrawing ? '...' : 'Withdraw'}</AppText>
            </TouchableOpacity>
          </View>

          {withdrawals.length > 0 && (
            <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.subText, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                Recent Withdrawals
              </AppText>
              {withdrawals.map(w => {
                const st = WITHDRAWAL_STATUS[w.status] || WITHDRAWAL_STATUS.pending;
                return (
                  <View key={w._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>₹{w.amount} → {w.upiId}</AppText>
                      <AppText style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                        {new Date(w.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </AppText>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: st.bg }}>
                      <AppText style={{ fontSize: 11, fontWeight: '700', color: st.color }}>{st.label}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Transactions */}
        <AppText style={[styles.sectionTitle, { color: theme.text }]}>Transaction History</AppText>
        <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#8b5cf6" />
            </View>
          ) : transactions.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: theme.subText }}>No transactions yet.</AppText>
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
                    <AppText style={[styles.txnLabel, { color: theme.text }]}>{SOURCE_LABEL[txn.source] || txn.source}</AppText>
                    <AppText style={[styles.txnDate, { color: theme.subText }]}>
                      {new Date(txn.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </AppText>
                  </View>
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: isCredit ? '#059669' : '#dc2626' }}>
                    {isCredit ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </AppText>
                </View>
              );
            })
          )}
        </View>

        {hasMore && (
          <TouchableOpacity onPress={handleLoadMore} disabled={loadingMore} style={[styles.loadMoreBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <AppText style={{ fontSize: 13, fontWeight: '600', color: theme.subText }}>{loadingMore ? 'Loading...' : 'Load More'}</AppText>
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
  balanceCard: { borderRadius: 18, padding: 20, marginBottom: 18, backgroundColor: '#6d28d9' },
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
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  sectionTitle:{ fontSize: 13, fontWeight: '700', marginBottom: 10 },
  listCard:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  txnRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  txnIcon:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnLabel:    { fontSize: 13.5, fontWeight: '600' },
  txnDate:     { fontSize: 11.5, marginTop: 2 },
  loadMoreBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
