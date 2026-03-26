import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useSalon } from '../../context/SalonContext';
import api from '../../services/api';

const BillingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { subscription, fetchSubscription } = useSalon();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        api.get('/owner/subscription/status'),
        api.get('/owner/subscription/billing-history'),
      ]);
      if (statusRes.data.success) setData(statusRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelectPlan = async (planType) => {
    try {
      setActionLoading(true);
      await api.post('/owner/subscription/select-plan', { planType });
      await load();
      await fetchSubscription();
      Alert.alert('Plan Selected', `You have selected the ${planType === 'starter' ? 'Starter' : 'Per Booking'} plan.`);
    } catch {
      Alert.alert('Error', 'Failed to select plan. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayNow = async (planType) => {
    try {
      setActionLoading(true);
      const res = await api.post('/owner/subscription/create-order', { planType: planType || data?.planType });
      if (!res.data.success) { Alert.alert('Error', 'Failed to create payment order'); return; }

      const { orderId, amount, invoiceId, razorpayKeyId, ownerName, ownerEmail, ownerPhone } = res.data.data;

      // Open Razorpay checkout page in browser
      // After payment, user returns to app; they can confirm payment manually
      const checkoutUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${razorpayKeyId}&order_id=${orderId}&amount=${amount * 100}&currency=INR&name=MySalonBookings&prefill[name]=${encodeURIComponent(ownerName || '')}&prefill[email]=${encodeURIComponent(ownerEmail || '')}&prefill[contact]=${encodeURIComponent(ownerPhone || '')}`;

      Alert.alert(
        'Complete Payment',
        `Pay ₹${amount} for your subscription. You will be redirected to the payment page.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay Now',
            onPress: async () => {
              try {
                await Linking.openURL(`https://razorpay.com/payment-link/?key=${razorpayKeyId}&order_id=${orderId}`);
              } catch {
                Alert.alert('Payment', 'Please complete payment in your browser and then refresh this screen.');
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to initiate payment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <DrawerMenuButton />
          <Text style={styles.headerTitle}>Billing & Plan</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  const isTrialActive = data?.trialActive;
  const isPaid = data?.paymentStatus === 'paid';
  const isPerBooking = data?.planType === 'per_booking';
  const showPlanSelection = !isPaid;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <DrawerMenuButton />
        <Text style={styles.headerTitle}>Billing & Plan</Text>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          {isTrialActive ? (
            <View style={styles.statusRow}>
              <Ionicons name="time-outline" size={22} color="#3b82f6" />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>Free Trial Active</Text>
                <Text style={styles.statusSub}>{data.trialDaysRemaining} day{data.trialDaysRemaining !== 1 ? 's' : ''} remaining</Text>
              </View>
              <View style={styles.badgeTrial}><Text style={styles.badgeText}>Trial</Text></View>
            </View>
          ) : isPaid ? (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {data.planType === 'starter' ? 'Starter — ₹150/month' : 'Per Booking — ₹1/booking'}
                </Text>
                {data.lastPaymentDate && (
                  <Text style={styles.statusSub}>Last paid: {new Date(data.lastPaymentDate).toLocaleDateString()}</Text>
                )}
              </View>
              <View style={styles.badgeActive}><Text style={styles.badgeText}>Active</Text></View>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="warning-outline" size={22} color="#ef4444" />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>Trial Expired</Text>
                <Text style={styles.statusSub}>Please select a plan to continue</Text>
              </View>
              <View style={styles.badgeOverdue}><Text style={styles.badgeText}>Overdue</Text></View>
            </View>
          )}
        </View>

        {/* Plan Selection */}
        {showPlanSelection && (
          <>
            <Text style={styles.sectionLabel}>CHOOSE A PLAN</Text>

            {/* Starter Plan */}
            <View style={[styles.card, styles.planCard, { borderColor: '#a5b4fc' }]}>
              <Text style={styles.planName}>Starter</Text>
              <Text style={styles.planPrice}>₹150<Text style={styles.planPriceSub}>/month</Text></Text>
              <Text style={styles.planFeature}>✓  Unlimited bookings</Text>
              <Text style={styles.planFeature}>✓  Fixed monthly cost</Text>
              <Text style={styles.planFeature}>✓  All features included</Text>
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: '#6366f1' }]}
                onPress={() => handlePayNow('starter')}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.planBtnText}>Pay ₹150</Text>}
              </TouchableOpacity>
            </View>

            {/* Per Booking Plan */}
            <View style={[styles.card, styles.planCard, { borderColor: '#6ee7b7' }]}>
              <Text style={styles.planName}>Per Booking</Text>
              <Text style={[styles.planPrice, { color: '#10b981' }]}>₹1<Text style={styles.planPriceSub}>/booking</Text></Text>
              <Text style={styles.planFeature}>✓  Pay only for what you use</Text>
              <Text style={styles.planFeature}>✓  Billed at end of month</Text>
              <Text style={styles.planFeature}>✓  All features included</Text>
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: '#10b981' }]}
                onPress={() => handleSelectPlan('per_booking')}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.planBtnText}>Select Plan</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Usage (per_booking) */}
        {isPerBooking && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>THIS MONTH'S USAGE</Text>
            <Text style={styles.usageCount}>{data.monthlyBookingCount} bookings</Text>
            <Text style={styles.usageSub}>Estimated bill: ₹{data.estimatedBill}</Text>
            {data.accessStatus === 'overdue' && (
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: '#ef4444', marginTop: 12 }]}
                onPress={() => handlePayNow('per_booking')}
                disabled={actionLoading}
              >
                <Text style={styles.planBtnText}>Pay Now ₹{data.estimatedBill}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Billing History */}
        {history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>BILLING HISTORY</Text>
            {history.map((inv) => (
              <View key={inv._id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyMonth}>{inv.billingMonth}</Text>
                  <Text style={styles.historySub}>{inv.planType === 'starter' ? 'Starter' : 'Per Booking'}</Text>
                </View>
                <Text style={styles.historyAmount}>₹{inv.amount}</Text>
                <View style={[
                  styles.historyBadge,
                  inv.paymentStatus === 'paid' ? styles.badgeActive : inv.paymentStatus === 'pending' ? styles.badgePending : styles.badgeOverdue,
                ]}>
                  <Text style={styles.badgeText}>{inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0f172a', marginLeft: 12 },
  refreshBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { flex: 1, marginLeft: 4 },
  statusTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  statusSub: { fontSize: 13, color: '#64748b', marginTop: 1 },
  planCard: { borderWidth: 2 },
  planName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  planPrice: { fontSize: 28, fontWeight: '800', color: '#6366f1', marginBottom: 10 },
  planPriceSub: { fontSize: 14, fontWeight: '400', color: '#64748b' },
  planFeature: { fontSize: 14, color: '#374151', marginBottom: 4 },
  planBtn: { marginTop: 14, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  usageCount: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  usageSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  historyMonth: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  historySub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  historyAmount: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginRight: 10 },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeTrial: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeActive: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeOverdue: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgePending: { backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
});

export default BillingScreen;
