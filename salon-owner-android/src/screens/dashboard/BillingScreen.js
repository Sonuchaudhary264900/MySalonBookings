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

const PLAN_INFO = {
  starter:     { label: 'Starter',     price: '₹150/month',   color: '#6366f1', border: '#a5b4fc' },
  per_booking: { label: 'Per Booking', price: '₹1/booking',   color: '#10b981', border: '#6ee7b7' },
};

const BillingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { fetchSubscription } = useSalon();
  const [data, setData]       = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false); // true when user taps "Change Plan" to swap a confirmed pre-selection

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        api.get('/owner/subscription/status'),
        api.get('/owner/subscription/billing-history'),
      ]);
      if (statusRes.data.success)  setData(statusRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Pre-select plan during trial ───────────────────────────────────────────
  const handlePreSelect = (planType) => {
    const info = PLAN_INFO[planType];
    const msg = planType === 'starter'
      ? 'You\'ll be charged ₹150/month when your trial ends.'
      : 'You\'ll be charged ₹1 per booking at the end of each month.';
    Alert.alert(
      `Pre-select ${info.label}?`,
      `${msg}\n\nThis plan will activate automatically when your free trial ends. You can change it anytime during the trial.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.post('/owner/subscription/select-plan', { planType });
              setChangingPlan(false); // collapse back to confirmation card
              await Promise.all([load(), fetchSubscription()]);
              Alert.alert('Plan Selected', `${info.label} will activate when your trial ends.`);
            } catch {
              Alert.alert('Error', 'Failed to pre-select plan. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Select plan post-trial (no active paid plan) ───────────────────────────
  const handleSelectPlan = (planType) => {
    const info = PLAN_INFO[planType];
    const msg = planType === 'starter'
      ? 'You\'ll be charged ₹150/month. Payment is required to activate.'
      : 'You\'ll be charged ₹1 per booking each month.';
    Alert.alert(
      `Select ${info.label}?`,
      msg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.post('/owner/subscription/select-plan', { planType });
              await Promise.all([load(), fetchSubscription()]);
            } catch {
              Alert.alert('Error', 'Failed to select plan. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Request plan switch (anti-abuse: one per cycle) ────────────────────────
  const handleRequestSwitch = (planType) => {
    if (data?.planChangeRequested) {
      Alert.alert(
        'Switch Already Pending',
        `You already have a scheduled switch to ${PLAN_INFO[data.nextPlan]?.label || data.nextPlan} at the end of this billing cycle. Cancel it first to request a different switch.`
      );
      return;
    }
    const info = PLAN_INFO[planType];
    const cycleEnd = data?.billingCycleEndDate
      ? new Date(data.billingCycleEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'end of billing cycle';
    Alert.alert(
      `Switch to ${info.label}?`,
      `The switch will apply on ${cycleEnd}. You can cancel this request before that date.\n\nOnly one plan change is allowed per billing cycle.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Switch',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.post('/owner/subscription/request-plan-change', { planType });
              await Promise.all([load(), fetchSubscription()]);
              Alert.alert('Switch Scheduled', `Your plan will switch to ${info.label} on ${cycleEnd}.`);
            } catch (err) {
              const msg = err?.response?.data?.message || 'Failed to request plan change.';
              Alert.alert('Error', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Cancel pending plan switch ─────────────────────────────────────────────
  const handleCancelChange = () => {
    Alert.alert(
      'Cancel Scheduled Switch?',
      `Your plan will stay on ${PLAN_INFO[data?.planType]?.label || data?.planType} at renewal.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Switch',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.post('/owner/subscription/cancel-plan-change');
              await Promise.all([load(), fetchSubscription()]);
              Alert.alert('Cancelled', 'Your scheduled plan switch has been cancelled.');
            } catch {
              Alert.alert('Error', 'Failed to cancel plan change.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Pay now ────────────────────────────────────────────────────────────────
  const handlePayNow = async (planType) => {
    try {
      setActionLoading(true);
      const res = await api.post('/owner/subscription/create-order', { planType: planType || data?.planType });
      if (!res.data.success) { Alert.alert('Error', 'Failed to create payment order'); return; }

      const { orderId, amount, razorpayKeyId, ownerName, ownerEmail, ownerPhone } = res.data.data;

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

  // ── Loading ────────────────────────────────────────────────────────────────
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

  const isTrialActive   = data?.trialActive;
  const isPaid          = data?.paymentStatus === 'paid';
  const isOverdue       = data?.paymentStatus === 'overdue';
  const hasPlan         = data?.planType && data?.planType !== 'free_trial';
  const isPerBooking    = data?.planType === 'per_booking';
  const preSelected     = data?.planSelectedDuringTrial;
  const hasScheduled    = data?.planChangeRequested;
  const showSwitchGrid  = isPaid && !isTrialActive;

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

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

        {/* ── Status Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          {isTrialActive ? (
            <>
              <View style={styles.statusRow}>
                <Ionicons name="time-outline" size={22} color="#3b82f6" />
                <View style={styles.statusText}>
                  <Text style={styles.statusTitle}>Free Trial Active</Text>
                  <Text style={styles.statusSub}>{data.trialDaysRemaining} day{data.trialDaysRemaining !== 1 ? 's' : ''} remaining</Text>
                </View>
                <View style={styles.badgeTrial}><Text style={styles.badgeText}>Trial</Text></View>
              </View>
              {/* Trial progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${Math.max(0, Math.min(100, ((30 - (data.trialDaysRemaining || 0)) / 30) * 100))}%`,
                }]} />
              </View>
              <Text style={styles.progressLabel}>{data.trialDaysRemaining} / 30 days left</Text>
            </>
          ) : isPaid ? (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {data.planType === 'starter' ? 'Starter — ₹150/month' : 'Per Booking — ₹1/booking'}
                </Text>
                {data.billingCycleEndDate && (
                  <Text style={styles.statusSub}>Renews {fmtDate(data.billingCycleEndDate)}</Text>
                )}
              </View>
              <View style={styles.badgeActive}><Text style={styles.badgeText}>Active</Text></View>
            </View>
          ) : isOverdue && hasPlan ? (
            <View style={styles.statusRow}>
              <Ionicons name="card-outline" size={22} color="#ef4444" />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {data.planType === 'starter' ? 'Starter — ₹150/month' : 'Per Booking — ₹1/booking'}
                </Text>
                <Text style={styles.statusSub}>Payment overdue — tap Pay Now below</Text>
              </View>
              <View style={styles.badgeOverdue}><Text style={styles.badgeText}>Overdue</Text></View>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="warning-outline" size={22} color="#ef4444" />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>Trial Expired</Text>
                <Text style={styles.statusSub}>Please select a plan to continue</Text>
              </View>
              <View style={styles.badgeOverdue}><Text style={styles.badgeText}>Expired</Text></View>
            </View>
          )}
        </View>

        {/* ── Scheduled Plan Change Banner ── */}
        {hasScheduled && data?.nextPlan && (
          <View style={styles.scheduledBanner}>
            <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.scheduledTitle}>Switch Scheduled</Text>
              <Text style={styles.scheduledSub}>
                Switching to <Text style={{ fontWeight: '700' }}>{PLAN_INFO[data.nextPlan]?.label}</Text> on {fmtDate(data.billingCycleEndDate)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancelChange}
              disabled={actionLoading}
              style={styles.cancelSwitchBtn}
            >
              <Text style={styles.cancelSwitchText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pre-selection: confirmation card (plan chosen, not changing) ── */}
        {isTrialActive && preSelected && !changingPlan && (
          <View style={styles.confirmedCard}>
            <View style={styles.confirmedRow}>
              <View style={styles.confirmedIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmedLabel}>PLAN SELECTED</Text>
                <Text style={styles.confirmedPlan}>
                  {PLAN_INFO[preSelected]?.label}
                  <Text style={styles.confirmedPrice}> · {PLAN_INFO[preSelected]?.price}</Text>
                </Text>
                <Text style={styles.confirmedNote}>Activates automatically when your trial ends</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.changePlanBtn}
              onPress={() => setChangingPlan(true)}
              disabled={actionLoading}
            >
              <Text style={styles.changePlanText}>Change Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pre-selection: plan picker (no plan yet, or user tapped "Change Plan") ── */}
        {isTrialActive && (!preSelected || changingPlan) && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              {preSelected ? 'CHOOSE A DIFFERENT PLAN' : 'PRE-SELECT A PLAN (OPTIONAL)'}
            </Text>
            <Text style={styles.preSelectInfo}>
              {preSelected
                ? 'Pick a different plan — no charges until your trial ends.'
                : 'Lock in a plan now. It activates automatically when your trial ends.'}
            </Text>
            <View style={styles.planRow}>
              {Object.entries(PLAN_INFO).map(([planKey, info]) => (
                <TouchableOpacity
                  key={planKey}
                  style={[
                    styles.planRowBtn,
                    { borderColor: info.border },
                    preSelected === planKey && { backgroundColor: info.border + '22' },
                    actionLoading && { opacity: 0.6 },
                  ]}
                  onPress={() => handlePreSelect(planKey)}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator color={info.color} size="small" />
                    : <Text style={[styles.planRowBtnText, { color: info.color }]}>
                        {planKey === 'starter' ? 'Starter · ₹150/month' : 'Per Booking · ₹1/booking'}
                      </Text>
                  }
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Plan Selection (post-trial, no paid plan) ── */}
        {!isTrialActive && !isPaid && (
          <>
            <Text style={styles.sectionHeader}>CHOOSE A PLAN</Text>

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

        {/* ── Usage (per_booking active) ── */}
        {isPerBooking && isPaid && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>THIS MONTH'S USAGE</Text>
            <Text style={styles.usageCount}>{data.monthlyBookingCount} bookings</Text>
            <Text style={styles.usageSub}>Estimated bill: ₹{data.estimatedBill}</Text>
          </View>
        )}

        {/* ── Pay Now (overdue) ── */}
        {!isTrialActive && !isPaid && data?.planType && data?.planType !== 'free_trial' && (
          <TouchableOpacity
            style={[styles.payNowBtn, actionLoading && styles.disabled]}
            onPress={() => handlePayNow(data.planType)}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.payNowText}>Pay Now</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* ── Switch Plan (active paid plan) ── */}
        {showSwitchGrid && !hasScheduled && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>SWITCH PLAN</Text>
            <Text style={styles.switchInfo}>One plan change is allowed per billing cycle.</Text>
            {Object.entries(PLAN_INFO).filter(([k]) => k !== data?.planType).map(([planKey, info]) => (
              <TouchableOpacity
                key={planKey}
                style={[styles.switchBtn, { borderColor: info.border, opacity: actionLoading ? 0.6 : 1 }]}
                onPress={() => handleRequestSwitch(planKey)}
                disabled={actionLoading}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchBtnTitle, { color: info.color }]}>{info.label}</Text>
                  <Text style={styles.switchBtnSub}>{info.price} · Applied at renewal</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={info.color} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Billing History ── */}
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
                  inv.paymentStatus === 'paid'    ? styles.badgeActive  :
                  inv.paymentStatus === 'pending' ? styles.badgePending :
                  styles.badgeOverdue,
                ]}>
                  <Text style={styles.badgeText}>
                    {inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}
                  </Text>
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
  container:         { flex: 1, backgroundColor: '#f8fafc' },
  header:            {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle:       { flex: 1, fontSize: 18, fontWeight: '700', color: '#0f172a', marginLeft: 12 },
  refreshBtn:        { padding: 4 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:           { padding: 16, paddingBottom: 32, gap: 12 },
  card:              {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionLabel:      { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 10 },
  sectionHeader:     { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 2, paddingHorizontal: 2 },
  statusRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText:        { flex: 1, marginLeft: 4 },
  statusTitle:       { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  statusSub:         { fontSize: 13, color: '#64748b', marginTop: 1 },
  progressBg:        { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill:      { height: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  progressLabel:     { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  scheduledBanner:   {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3e8ff',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#d8b4fe',
  },
  scheduledTitle:    { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  scheduledSub:      { fontSize: 12, color: '#6d28d9', marginTop: 1 },
  cancelSwitchBtn:   { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#ede9fe', borderRadius: 8 },
  cancelSwitchText:  { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  confirmedCard:     {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16,
    borderWidth: 1.5, borderColor: '#86efac',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  confirmedRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  confirmedIcon:     {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmedLabel:    { fontSize: 10, fontWeight: '700', color: '#86efac', letterSpacing: 0.8, marginBottom: 2 },
  confirmedPlan:     { fontSize: 15, fontWeight: '700', color: '#14532d' },
  confirmedPrice:    { fontWeight: '400', color: '#166534' },
  confirmedNote:     { fontSize: 12, color: '#4ade80', marginTop: 2 },
  changePlanBtn:     {
    borderWidth: 1, borderColor: '#86efac', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff',
  },
  changePlanText:    { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  preSelectInfo:     { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 19 },
  preSelectedRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  preSelectedText:   { fontSize: 14, color: '#374151' },
  preSelectChangeTip:{ fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  planRow:           { gap: 8 },
  planRowBtn:        {
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 11,
    paddingHorizontal: 14, alignItems: 'center',
  },
  planRowBtnText:    { fontSize: 14, fontWeight: '600' },
  planCard:          { borderWidth: 2 },
  planName:          { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  planPrice:         { fontSize: 28, fontWeight: '800', color: '#6366f1', marginBottom: 10 },
  planPriceSub:      { fontSize: 14, fontWeight: '400', color: '#64748b' },
  planFeature:       { fontSize: 14, color: '#374151', marginBottom: 4 },
  planBtn:           { marginTop: 14, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  planBtnText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  payNowBtn:         {
    backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  payNowText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled:          { opacity: 0.6 },
  switchBtn:         {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 8,
  },
  switchBtnTitle:    { fontSize: 14, fontWeight: '700' },
  switchBtnSub:      { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  switchInfo:        { fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  usageCount:        { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  usageSub:          { fontSize: 14, color: '#64748b', marginTop: 4 },
  historyRow:        {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  historyMonth:      { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  historySub:        { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  historyAmount:     { fontSize: 15, fontWeight: '700', color: '#0f172a', marginRight: 10 },
  historyBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeTrial:        { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeActive:       { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeOverdue:      { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgePending:      { backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText:         { fontSize: 11, fontWeight: '700', color: '#374151' },
});

export default BillingScreen;
