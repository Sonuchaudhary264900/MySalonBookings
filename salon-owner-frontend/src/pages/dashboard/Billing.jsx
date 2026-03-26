import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard, RefreshCw, TrendingUp, Zap, Star, AlertTriangle,
  CheckCircle, Clock, BarChart3, ArrowRight, Sparkles, Shield,
  CalendarDays, IndianRupee, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout  from '../../components/layout/DashboardLayout';
import { useSalon }     from '../../hooks/useSalon';
import billingService   from '../../services/billingService';
import BillingHistory   from '../../components/billing/BillingHistory';
import PlanModal        from '../../components/billing/PlanModal';
import PaymentModal     from '../../components/billing/PaymentModal';

/* ─── helpers ───────────────────────────────────────────────── */
const fmt = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const EST_REV = 200; // estimated ₹ per booking

const PLAN_LABELS = { free_trial: 'Free Trial', starter: 'Starter Plan', per_booking: 'Pay Per Booking' };
const PLAN_PRICE  = { starter: '₹150/month', per_booking: '₹1/booking' };

/* ─── Mini usage bar chart (last 6 months from history) ──────── */
const UsageChart = ({ history }) => {
  const months = useMemo(() => {
    const map = {};
    history.forEach(inv => {
      const key = inv.billingMonth || new Date(inv.createdAt || Date.now()).toISOString().slice(0, 7);
      map[key] = (map[key] || 0) + (inv.bookingCount || 0);
    });
    const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.map(([k, v]) => ({
      label: new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short' }),
      value: v,
      pct:   Math.round((v / max) * 100),
    }));
  }, [history]);

  if (!months.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Booking Trend</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Last 6 months</span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {months.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end" style={{ height: 60 }}>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-500 opacity-80 transition-all duration-500 hover:opacity-100"
                style={{ height: `${Math.max(m.pct, 8)}%` }}
                title={`${m.value} bookings`}
              />
            </div>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Revenue chart ──────────────────────────────────────────── */
const RevenueChart = ({ history }) => {
  const months = useMemo(() => {
    const map = {};
    history.forEach(inv => {
      const key = inv.billingMonth || new Date(inv.createdAt || Date.now()).toISOString().slice(0, 7);
      map[key] = (map[key] || 0) + (inv.amount || 0);
    });
    const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.map(([k, v]) => ({
      label: new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short' }),
      value: v,
      pct:   Math.round((v / max) * 100),
    }));
  }, [history]);

  if (!months.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Revenue Trend</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Billing amounts</span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {months.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end" style={{ height: 60 }}>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400 opacity-80 transition-all duration-500 hover:opacity-100"
                style={{ height: `${Math.max(m.pct, 8)}%` }}
                title={`₹${m.value}`}
              />
            </div>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color, bg, sub }) => (
  <div className={`${bg} rounded-2xl p-4 border border-white/50 dark:border-gray-800`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 dark:bg-gray-900/60 shrink-0">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
  </div>
);

/* ─── Trial progress card ────────────────────────────────────── */
const TrialCard = ({ daysRemaining, onUpgrade }) => {
  const pct  = Math.round(((30 - daysRemaining) / 30) * 100);
  const used = 30 - daysRemaining;
  const isUrgent = daysRemaining <= 7;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border-2 ${
      isUrgent
        ? 'border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20'
        : 'border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/80 to-violet-50/80 dark:from-indigo-950/30 dark:to-violet-950/20'
    }`}>
      {/* Background glow */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-30 ${
        isUrgent ? 'bg-amber-400' : 'bg-indigo-400'
      }`} />

      <div className="relative">
        {/* Badge + days */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full
                ${isUrgent
                  ? 'bg-amber-500 text-white'
                  : 'bg-indigo-600 text-white'
                }`}>
                <Sparkles className="w-2.5 h-2.5" />
                Free Trial
              </span>
              {isUrgent && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> Expiring soon
                </span>
              )}
            </div>
            <h3 className={`text-xl font-black ${isUrgent ? 'text-amber-700 dark:text-amber-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
              {daysRemaining} days remaining
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isUrgent
                ? `Trial ends soon — choose a plan to avoid interruption`
                : `Your free trial is active — explore all features`
              }
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0
              transition-all shadow-md hover:scale-[1.02]
              ${isUrgent
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/30'
              }`}>
            Upgrade <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
            <span>Day 0</span>
            <span>Day {used} of 30</span>
            <span>Day 30</span>
          </div>
          <div className="h-2 rounded-full bg-white/60 dark:bg-gray-800/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isUrgent
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className={`font-semibold ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {pct}% used
            </span>
            <span className={`font-semibold ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {daysRemaining} days left
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Active plan card ───────────────────────────────────────── */
const ActivePlanCard = ({ planType, paymentStatus, billingCycleEndDate, onChangePlan, onPayNow }) => {
  const isOverdue = paymentStatus === 'overdue';
  const isPaid    = paymentStatus === 'paid';
  const planIcon  = planType === 'starter' ? Star : Zap;
  const PlanIcon  = planIcon;

  return (
    <div className={`rounded-2xl border-2 p-5 ${
      isOverdue
        ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
        : 'border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isOverdue ? 'bg-red-100 dark:bg-red-950' : 'bg-indigo-100 dark:bg-indigo-950'
        }`}>
          <PlanIcon className={`w-5 h-5 ${isOverdue ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {PLAN_LABELS[planType] || planType}
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isOverdue
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800'
            }`}>
              {isOverdue ? 'Payment Overdue' : 'Active'}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {PLAN_PRICE[planType] || ''}
            {billingCycleEndDate && ` · renews ${fmt(billingCycleEndDate)}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {planType === 'starter'
              ? 'Unlimited bookings at one flat monthly rate'
              : 'Charged only for confirmed bookings'
            }
          </p>
        </div>
      </div>

      {isOverdue && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-red-100 dark:bg-red-950/40 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">
            Your payment is overdue. Pay now to restore full access.
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {isOverdue && (
          <button onClick={onPayNow}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
              bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20">
            <CreditCard className="w-3.5 h-3.5" /> Pay Now
          </button>
        )}
        <button onClick={onChangePlan}
          className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold
            transition-all border ${isOverdue ? '' : 'flex-1'}
            border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400
            hover:bg-indigo-50 dark:hover:bg-indigo-950/50`}>
          Change Plan <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/* ─── Plan pre-selected card (during trial) ─────────────────── */
const PreSelectedCard = ({ planKey, onChange }) => {
  const isStarter = planKey === 'starter';
  return (
    <div className={`rounded-2xl border-2 p-4 flex items-center gap-3
      ${isStarter
        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30'
        : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
      }`}>
      <CheckCircle className={`w-5 h-5 shrink-0 ${isStarter ? 'text-indigo-500' : 'text-emerald-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 dark:text-white">
          {PLAN_LABELS[planKey]} selected for after trial
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          Will activate automatically · {PLAN_PRICE[planKey]}
        </p>
      </div>
      <button onClick={onChange}
        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
        Change
      </button>
    </div>
  );
};

/* ─── Restricted banner ─────────────────────────────────────── */
const RestrictedBanner = ({ onChoosePlan }) => (
  <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-2xl p-5">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Trial Ended — Action Required</h3>
        <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
          Your free trial has expired. Choose a plan to continue accepting bookings.
        </p>
      </div>
    </div>
    <button onClick={onChoosePlan}
      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
        bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow-md shadow-red-500/20">
      Choose a Plan Now <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

/* ─── Scheduled plan change card ────────────────────────────── */
const PlanChangeCard = ({ nextPlan, billingCycleEndDate, onCancel, cancelling }) => (
  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3">
    <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Plan Change Scheduled</p>
      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
        Switching to <strong>{PLAN_LABELS[nextPlan]}</strong> ({PLAN_PRICE[nextPlan]})
        {billingCycleEndDate ? ` on ${fmt(billingCycleEndDate)}` : ' at the start of your next billing cycle'}.
      </p>
    </div>
    <button onClick={onCancel} disabled={cancelling}
      className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900
        dark:hover:text-amber-200 transition-colors shrink-0 disabled:opacity-50 whitespace-nowrap">
      {cancelling ? 'Cancelling…' : 'Cancel'}
    </button>
  </div>
);

/* ─── Loading skeleton ───────────────────────────────────────── */
const LoadingSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-32 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" />)}
    </div>
    <div className="h-48 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" />
  </div>
);

/* ─── Main Billing page ──────────────────────────────────────── */
const Billing = () => {
  const { fetchSubscription } = useSalon();

  const [data,        setData]        = useState(null);
  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [histLoading, setHistLoading] = useState(true);
  const [planModal,   setPlanModal]   = useState(false);
  const [payModal,    setPayModal]    = useState(false);
  const [payPlanKey,  setPayPlanKey]  = useState(null);
  const [actionLoad,  setActionLoad]  = useState(false);
  const [cancelLoad,  setCancelLoad]  = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setHistLoading(true);
    try {
      const [sRes, hRes] = await Promise.all([
        billingService.getSubscriptionStatus(),
        billingService.getBillingHistory(),
      ]);
      if (sRes?.success || sRes?.data)  setData(sRes.data || sRes);
      if (hRes?.success || hRes?.data)  setHistory(Array.isArray(hRes.data) ? hRes.data : (hRes.data?.invoices || []));
    } catch {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derived ── */
  const {
    trialActive        = false,
    trialDaysRemaining = 0,
    accessStatus,
    planType           = 'free_trial',
    paymentStatus,
    planSelectedDuringTrial,
    planChangeRequested,
    nextPlan,
    billingCycleEndDate,
    monthlyBookingCount = 0,
    estimatedBill       = 0,
  } = data || {};

  const isRestricted = accessStatus === 'restricted';
  const isPaid       = paymentStatus === 'paid';
  const isOverdue    = paymentStatus === 'overdue';
  const estRevenue   = monthlyBookingCount * EST_REV;

  /* ── Handlers ── */
  const handlePlanConfirm = async (selectedKey) => {
    if (trialActive) {
      // During trial: just pre-select, no payment yet
      setActionLoad(true);
      try {
        const res = await billingService.selectPlan(selectedKey);
        if (res?.success || res?.message) {
          toast.success(res.message || 'Plan selected!');
          setData(prev => prev ? { ...prev, planSelectedDuringTrial: selectedKey } : prev);
          setPlanModal(false);
          load(true);
          fetchSubscription();
        }
      } catch { toast.error('Failed to save plan selection'); }
      finally { setActionLoad(false); }
    } else if (isPaid) {
      // Already on a paid plan: schedule change for next billing cycle
      setActionLoad(true);
      try {
        const res = await billingService.requestPlanChange(selectedKey);
        if (res?.success) {
          toast.success(res.message || 'Plan change scheduled!');
          setPlanModal(false);
          load(true);
          fetchSubscription();
        } else {
          toast.error(res?.message || 'Failed to schedule plan change');
        }
      } catch { toast.error('Failed to schedule plan change'); }
      finally { setActionLoad(false); }
    } else {
      // Post-trial or overdue: need payment
      setPlanModal(false);
      setPayPlanKey(selectedKey);
      setPayModal(true);
    }
  };

  const handleCancelPlanChange = async () => {
    setCancelLoad(true);
    try {
      const res = await billingService.cancelPlanChange();
      if (res?.success) {
        toast.success(res.message || 'Plan change cancelled');
        load(true);
        fetchSubscription();
      } else {
        toast.error(res?.message || 'Failed to cancel plan change');
      }
    } catch { toast.error('Failed to cancel plan change'); }
    finally { setCancelLoad(false); }
  };

  const handlePayNow = () => {
    setPayPlanKey(planType);
    setPayModal(true);
  };

  const handlePaySuccess = async () => {
    toast.success('Payment successful! Plan activated.');
    await load(true);
    await fetchSubscription();
  };

  const handleChangePlan = async () => {
    if (isPaid && !trialActive) {
      // Already on paid plan — request a plan switch
      setPlanModal(true);
    } else {
      setPlanModal(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                Billing & Subscription
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Manage your plan, usage and payments
              </p>
            </div>
            <button onClick={() => load()} disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 self-start" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? <LoadingSkeleton /> : (
            <>
              {/* ── Restricted alert ── */}
              {isRestricted && <RestrictedBanner onChoosePlan={() => setPlanModal(true)} />}

              {/* ── Trial card ── */}
              {trialActive && (
                <TrialCard
                  daysRemaining={trialDaysRemaining}
                  onUpgrade={() => setPlanModal(true)}
                />
              )}

              {/* ── Plan pre-selected (during trial) ── */}
              {trialActive && planSelectedDuringTrial && (
                <PreSelectedCard
                  planKey={planSelectedDuringTrial}
                  onChange={() => setPlanModal(true)}
                />
              )}

              {/* ── Active plan card (not on trial) ── */}
              {!trialActive && !isRestricted && planType !== 'free_trial' && (
                <ActivePlanCard
                  planType={planType}
                  paymentStatus={paymentStatus}
                  billingCycleEndDate={billingCycleEndDate}
                  onChangePlan={handleChangePlan}
                  onPayNow={handlePayNow}
                />
              )}

              {/* ── Scheduled plan change ── */}
              {!trialActive && planChangeRequested && nextPlan && (
                <PlanChangeCard
                  nextPlan={nextPlan}
                  billingCycleEndDate={billingCycleEndDate}
                  onCancel={handleCancelPlanChange}
                  cancelling={cancelLoad}
                />
              )}

              {/* ── Stats ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={Activity} label="This Month" value={monthlyBookingCount}
                  sub="bookings" color="text-indigo-600 dark:text-indigo-400"
                  bg="bg-indigo-50 dark:bg-indigo-950/40"
                />
                <StatCard
                  icon={IndianRupee} label="Est. Revenue" value={`₹${estRevenue.toLocaleString()}`}
                  sub={`₹${EST_REV}/booking`} color="text-emerald-600 dark:text-emerald-400"
                  bg="bg-emerald-50 dark:bg-emerald-950/40"
                />
                <StatCard
                  icon={IndianRupee} label="Est. Bill" value={`₹${estimatedBill}`}
                  sub={planType === 'per_booking' ? `${monthlyBookingCount} × ₹1` : 'monthly flat'}
                  color="text-violet-600 dark:text-violet-400"
                  bg="bg-violet-50 dark:bg-violet-950/40"
                />
                <StatCard
                  icon={CalendarDays} label="Trial Days" value={trialActive ? trialDaysRemaining : '—'}
                  sub={trialActive ? 'remaining' : 'trial ended'}
                  color="text-amber-600 dark:text-amber-400"
                  bg="bg-amber-50 dark:bg-amber-950/40"
                />
              </div>

              {/* ── Plan info + upgrade CTA (if on trial without pre-selection) ── */}
              {trialActive && !planSelectedDuringTrial && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">No plan selected yet</h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                        Choose a plan now to ensure uninterrupted service when your trial ends.
                        You won't be charged until the trial expires.
                      </p>
                    </div>
                    <button onClick={() => setPlanModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0
                        bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                        hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20">
                      <Sparkles className="w-4 h-4" /> Choose a Plan
                    </button>
                  </div>
                </div>
              )}

              {/* ── Charts row ── */}
              {history.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UsageChart history={history} />
                  <RevenueChart history={history} />
                </div>
              )}

              {/* ── Billing History ── */}
              <BillingHistory history={history} loading={histLoading} />

              {/* ── Security footer note ── */}
              <div className="flex items-center justify-center gap-3 py-2">
                <Shield className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Payments secured by Razorpay · 256-bit SSL
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Plan modal ── */}
      <PlanModal
        isOpen={planModal}
        onClose={() => setPlanModal(false)}
        currentPlan={trialActive ? planSelectedDuringTrial : planType}
        trialActive={trialActive}
        onConfirm={handlePlanConfirm}
        loading={actionLoad}
        isChangePlan={isPaid && !trialActive}
      />

      {/* ── Payment modal ── */}
      <PaymentModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        planKey={payPlanKey}
        onSuccess={handlePaySuccess}
      />
    </DashboardLayout>
  );
};

export default Billing;
