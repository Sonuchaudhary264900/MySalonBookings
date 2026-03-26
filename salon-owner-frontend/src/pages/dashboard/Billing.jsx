import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSalon } from '../../hooks/useSalon';
import billingService from '../../services/billingService';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, Zap,
  RefreshCw, ArrowRight, X, TrendingUp, Users, Star,
  Shield, ChevronRight, Sparkles, Lock,
} from 'lucide-react';

// ─── Razorpay loader ─────────────────────────────────────────────────────────
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ─── Constants ───────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Estimated salon revenue per booking (conservative)
const EST_REVENUE_PER_BOOKING = 200;

// ─── Design tokens ───────────────────────────────────────────────────────────
const BG      = '#09090f';
const CARD    = '#111118';
const CARD2   = '#16161f';
const BORDER  = 'rgba(255,255,255,0.07)';
const PURPLE  = '#7c3aed';
const PURPLE_LIGHT = '#a78bfa';
const PURPLE_DIM   = 'rgba(124,58,237,0.15)';
const PURPLE_GLOW  = '0 0 0 1px rgba(124,58,237,0.4), 0 0 40px rgba(124,58,237,0.2), 0 4px 24px rgba(0,0,0,0.4)';
const GREEN   = '#10b981';
const GREEN_DIM    = 'rgba(16,185,129,0.12)';
const GREEN_GLOW   = '0 0 0 1px rgba(16,185,129,0.3), 0 0 24px rgba(16,185,129,0.12), 0 4px 16px rgba(0,0,0,0.4)';
const CARD_SHADOW  = '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ type, msg, onClose }) => {
  const isSuccess = type === 'success';
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
      borderRadius: 14, padding: '14px 18px', maxWidth: 360,
      display: 'flex', alignItems: 'center', gap: 10,
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {isSuccess
        ? <CheckCircle size={16} color={GREEN} />
        : <AlertTriangle size={16} color="#ef4444" />}
      <span style={{ color: '#fff', fontSize: 13, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none' }}>
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, onConfirm, loading, title, body, confirmLabel = 'Confirm', danger = false }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: CARD2, borderRadius: 20, maxWidth: 420, width: '100%',
        border: `1px solid ${BORDER}`, boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>
        {/* Modal header gradient */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, transparent 60%)',
          padding: '24px 24px 20px',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', marginTop: 1 }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65 }}>
          {body}
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: `1px solid ${BORDER}`, background: 'transparent',
              color: 'rgba(255,255,255,0.65)', fontWeight: 600, cursor: 'pointer',
              fontSize: 14, transition: 'all 0.15s',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: danger ? '#dc2626' : `linear-gradient(135deg, ${PURPLE} 0%, #6d28d9 100%)`,
              border: 'none', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, opacity: loading ? 0.6 : 1,
              boxShadow: danger ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
            }}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stat Pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon, label, value, accent }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px',
    border: `1px solid rgba(255,255,255,0.06)`, flex: 1, minWidth: 100,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <span style={{ color: accent, opacity: 0.9 }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
    </div>
    <p style={{ color: '#fff', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Billing = () => {
  const { fetchSubscription } = useSalon();
  const [data, setData]                 = useState(null);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]               = useState(null);
  const [modal, setModal]               = useState(null);
  const [selectedInline, setSelectedInline] = useState(null); // plan selected via card, shows confirm UI
  const [changingPlan, setChangingPlan]     = useState(false); // true when user wants to swap a confirmed pre-selection

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, hRes] = await Promise.all([
        billingService.getSubscriptionStatus(),
        billingService.getBillingHistory(),
      ]);
      if (sRes.success) setData(sRes.data);
      if (hRes.success) setHistory(hRes.data);
    } catch {
      showToast('error', 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePayNow = async (planType) => {
    const ok = await loadRazorpay();
    if (!ok) { showToast('error', 'Payment gateway failed to load'); return; }
    try {
      setActionLoading(true);
      const res = await billingService.createPaymentOrder(planType || data?.planType);
      if (!res.success) { showToast('error', 'Failed to create payment order'); return; }
      const { orderId, amount, invoiceId, razorpayKeyId, ownerName, ownerEmail, ownerPhone } = res.data;
      const options = {
        key: razorpayKeyId, amount: amount * 100, currency: 'INR',
        name: 'MySalonBookings',
        description: planType === 'starter' ? 'Starter Plan — ₹150/month' : 'Per Booking Plan',
        order_id: orderId,
        prefill: { name: ownerName, email: ownerEmail, contact: ownerPhone },
        handler: async (pd) => {
          try {
            const vRes = await billingService.verifyPayment({
              razorpayOrderId:   pd.razorpay_order_id,
              razorpayPaymentId: pd.razorpay_payment_id,
              razorpaySignature: pd.razorpay_signature,
              invoiceId,
            });
            if (vRes.success) {
              showToast('success', '🎉 Payment successful! Subscription activated.');
              setSelectedInline(null);
              await load();
              await fetchSubscription();
            }
          } catch { showToast('error', 'Payment verification failed. Contact support.'); }
        },
        modal: { ondismiss: () => setActionLoading(false) },
        theme: { color: PURPLE },
      };
      new window.Razorpay(options).open();
    } catch {
      showToast('error', 'Failed to initiate payment');
      setActionLoading(false);
    }
  };

  const confirmPreSelect = async (planKey) => {
    try {
      setActionLoading(true);
      const res = await billingService.selectPlan(planKey);
      if (res.success) {
        showToast('success', res.message);
        // Optimistic update — immediately show confirmed card, no flash
        setData(prev => prev ? { ...prev, planSelectedDuringTrial: planKey } : prev);
        setSelectedInline(null);
        setChangingPlan(false);
        load();           // background refresh (don't await — state already correct)
        fetchSubscription();
      } else {
        showToast('error', res.message || 'Failed to save plan selection');
      }
    } catch { showToast('error', 'Failed to save plan selection'); }
    finally { setActionLoading(false); }
  };

  const confirmPostTrialSelect = async (planKey) => {
    try {
      setActionLoading(true);
      const res = await billingService.selectPlan(planKey);
      if (res.success) {
        showToast('success', res.message);
        setSelectedInline(null);
        await load();
        await fetchSubscription();
      }
    } catch { showToast('error', 'Failed to select plan'); }
    finally { setActionLoading(false); }
  };

  const handleRequestSwitch = (planKey) => {
    if (data?.planChangeRequested) {
      showToast('warning', `A switch to ${data.nextPlan === 'starter' ? 'Starter' : 'Per Booking'} is already scheduled.`);
      return;
    }
    setModal({ type: 'switch', planKey });
  };

  const confirmSwitch = async () => {
    try {
      setActionLoading(true);
      const res = await billingService.requestPlanChange(modal.planKey);
      if (res.success) { showToast('success', res.message); await load(); await fetchSubscription(); }
      else showToast('error', res.message || 'Failed');
    } catch (err) { showToast('error', err?.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); setModal(null); }
  };

  const confirmCancelChange = async () => {
    try {
      setActionLoading(true);
      const res = await billingService.cancelPlanChange();
      if (res.success) { showToast('success', res.message); await load(); await fetchSubscription(); }
    } catch { showToast('error', 'Failed to cancel plan change'); }
    finally { setActionLoading(false); setModal(null); }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const {
    trialActive, trialDaysRemaining = 0, accessStatus,
    planType, paymentStatus,
    planSelectedDuringTrial,
    nextPlan, planChangeRequested, billingCycleEndDate,
    monthlyBookingCount = 0, estimatedBill = 0,
  } = data || {};

  const isPaid      = paymentStatus === 'paid';
  const isOverdue   = paymentStatus === 'overdue';
  const trialPct    = Math.round(((30 - trialDaysRemaining) / 30) * 100);
  const isUrgent    = trialActive && trialPct >= 50;
  const estRevenue  = monthlyBookingCount * EST_REVENUE_PER_BOOKING;
  const trialTotalBookings = history.reduce((sum, inv) => sum + (inv.bookingCount || 0), 0);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
              border: `3px solid ${PURPLE}`, borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading your subscription…</p>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </DashboardLayout>
    );
  }

  // ── Inline plan confirmation (for trial pre-selection and post-trial selection) ──
  const renderInlineConfirm = (context) => {
    if (!selectedInline) return null;
    const isPurple  = selectedInline === 'starter';
    const accent    = isPurple ? PURPLE : GREEN;
    const name      = isPurple ? 'Starter' : 'Per Booking';
    const price     = isPurple ? '₹150 / month' : '₹1 / booking';
    const note      = context === 'trial'
      ? 'This plan will activate automatically when your free trial ends.'
      : 'Complete payment to activate your plan and restore full access.';
    const ctaLabel  = context === 'trial' ? 'Confirm — Activate After Trial' : 'Continue to Payment';

    return (
      <div style={{
        background: CARD2, borderRadius: 20, padding: 28,
        border: `1px solid ${accent}40`, boxShadow: CARD_SHADOW,
        background: `linear-gradient(135deg, ${accent}0d 0%, ${CARD2} 50%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={22} color={accent} />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              You selected
            </p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>
              {name} Plan — <span style={{ color: accent }}>{price}</span>
            </p>
          </div>
        </div>

        <div style={{
          background: `${accent}10`, border: `1px solid ${accent}25`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{note}</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setSelectedInline(null)}
            style={{
              flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${BORDER}`,
              background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 600,
              cursor: 'pointer', fontSize: 14,
            }}
          >
            Change Plan
          </button>
          <button
            onClick={() => context === 'trial' ? confirmPreSelect(selectedInline) : (isPaid ? handlePayNow(selectedInline) : confirmPostTrialSelect(selectedInline))}
            disabled={actionLoading}
            style={{
              flex: 2, padding: '13px', borderRadius: 12, border: 'none', color: '#fff',
              fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: 14,
              background: `linear-gradient(135deg, ${accent} 0%, ${isPurple ? '#5b21b6' : '#059669'} 100%)`,
              boxShadow: `0 4px 20px ${accent}40`, opacity: actionLoading ? 0.6 : 1,
            }}
          >
            {actionLoading ? <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /> : ctaLabel}
          </button>
        </div>
      </div>
    );
  };

  // ── Plan Cards ────────────────────────────────────────────────────────────
  const renderPlanCards = (context) => {
    if (selectedInline) return renderInlineConfirm(context);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── Starter — PRIMARY ─────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          {/* Most Popular badge */}
          <div style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            background: `linear-gradient(90deg, ${PURPLE} 0%, #6d28d9 100%)`,
            borderRadius: 20, padding: '4px 14px', zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: `0 4px 12px ${PURPLE}60`,
          }}>
            <Star size={10} color="#fde68a" fill="#fde68a" />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
              MOST POPULAR
            </span>
          </div>

          <button
            onClick={() => setSelectedInline('starter')}
            disabled={actionLoading || (context === 'switch' && planType === 'starter')}
            style={{
              width: '100%', textAlign: 'left', background: CARD2, borderRadius: 18,
              border: `1px solid ${PURPLE}50`, padding: '28px 20px 20px',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: PURPLE_GLOW, display: 'block',
              opacity: (context === 'switch' && planType === 'starter') ? 0.4 : 1,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: PURPLE_DIM,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Zap size={19} color={PURPLE_LIGHT} />
            </div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 6px' }}>Starter</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ color: PURPLE_LIGHT, fontWeight: 900, fontSize: 32, letterSpacing: '-0.03em' }}>₹150</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>/month</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 18px', lineHeight: 1.5 }}>
              Unlimited bookings, one flat price. The smarter choice as you grow.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['Unlimited bookings every month', 'Zero surprises — fixed cost', 'All features unlocked'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={13} color={PURPLE_LIGHT} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{f}</span>
                </li>
              ))}
            </ul>
            <div style={{
              background: `linear-gradient(135deg, ${PURPLE} 0%, #6d28d9 100%)`,
              borderRadius: 12, padding: '13px', textAlign: 'center',
              boxShadow: `0 4px 16px ${PURPLE}50`,
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {context === 'trial' ? 'Start After Free Trial →' : context === 'switch' ? 'Switch to Starter →' : 'Activate Starter →'}
              </span>
            </div>
          </button>
        </div>

        {/* ── Per Booking — SECONDARY ───────────────────────── */}
        <button
          onClick={() => setSelectedInline('per_booking')}
          disabled={actionLoading || (context === 'switch' && planType === 'per_booking')}
          style={{
            width: '100%', textAlign: 'left', background: CARD2, borderRadius: 18,
            border: `1px solid rgba(16,185,129,0.2)`, padding: '28px 20px 20px',
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: CARD_SHADOW,
            opacity: (context === 'switch' && planType === 'per_booking') ? 0.4 : 1,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: GREEN_DIM,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <TrendingUp size={19} color={GREEN} />
          </div>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 6px' }}>Per Booking</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
            <span style={{ color: '#34d399', fontWeight: 900, fontSize: 32, letterSpacing: '-0.03em' }}>₹1</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>/booking</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 18px', lineHeight: 1.5 }}>
            Pay only for what you use. Perfect if you're just getting started.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {['No monthly commitment', 'Bill based on actual bookings', 'All features unlocked'].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={13} color={GREEN} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{f}</span>
              </li>
            ))}
          </ul>
          <div style={{
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 12, padding: '13px', textAlign: 'center',
          }}>
            <span style={{ color: '#34d399', fontWeight: 700, fontSize: 14 }}>
              {context === 'trial' ? 'Choose Pay-As-You-Go →' : context === 'switch' ? 'Switch to Per Booking →' : 'Activate Pay-As-You-Go →'}
            </span>
          </div>
        </button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER — TRIAL ACTIVE
  // ═══════════════════════════════════════════════════════════
  const renderTrialActive = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Trial Hero ──────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, #111128 0%, #0d0d1a 100%)`,
        borderRadius: 24, padding: '32px 28px',
        border: `1px solid rgba(124,58,237,0.2)`,
        boxShadow: '0 0 0 1px rgba(124,58,237,0.08), 0 24px 48px rgba(0,0,0,0.6)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow orb */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 240, height: 240,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                background: 'rgba(124,58,237,0.2)', borderRadius: 8, padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Sparkles size={11} color={PURPLE_LIGHT} />
                <span style={{ color: PURPLE_LIGHT, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Free Trial
                </span>
              </div>
            </div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 28, margin: 0, letterSpacing: '-0.03em' }}>
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '6px 0 0' }}>
              Your free trial is active — explore every feature.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Day {30 - trialDaysRemaining}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Day 30</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, transition: 'width 0.6s ease',
              width: `${trialPct}%`,
              background: isUrgent
                ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                : `linear-gradient(90deg, ${PURPLE} 0%, #a78bfa 100%)`,
              boxShadow: isUrgent ? '0 0 12px rgba(245,158,11,0.5)' : `0 0 12px ${PURPLE}80`,
            }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatPill
            icon={<Users size={14} />}
            label="This Month"
            value={`${monthlyBookingCount} bookings`}
            accent={PURPLE_LIGHT}
          />
          <StatPill
            icon={<TrendingUp size={14} />}
            label="Est. Revenue"
            value={`₹${estRevenue.toLocaleString('en-IN')}`}
            accent="#34d399"
          />
        </div>

        {/* Value line */}
        {monthlyBookingCount > 0 && (
          <div style={{
            marginTop: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Shield size={15} color={PURPLE_LIGHT} style={{ shrink: 0 }} />
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0 }}>
              You've already managed{' '}
              <strong style={{ color: '#fff' }}>{monthlyBookingCount} customers</strong>{' '}
              using MySalonBookings this month.
            </p>
          </div>
        )}
      </div>

      {/* ── Urgency banner (after 50% trial used) ──────────── */}
      {isUrgent && !planSelectedDuringTrial && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.08) 100%)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ color: '#fde68a', fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>
              Your trial is ending soon
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
              Choose a plan below so your bookings continue without interruption.
            </p>
          </div>
        </div>
      )}

      {/* ── Pre-selection confirmed state ───────────────────── */}
      {planSelectedDuringTrial && !selectedInline && !changingPlan && (
        <div style={{
          background: `linear-gradient(135deg, ${PURPLE}10 0%, ${CARD2} 60%)`,
          border: `1px solid ${PURPLE}35`, borderRadius: 20, padding: '22px 24px',
          boxShadow: CARD_SHADOW,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: `${PURPLE}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CheckCircle size={18} color={PURPLE_LIGHT} />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Plan Selected
                </p>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>
                  {planSelectedDuringTrial === 'starter' ? 'Starter · ₹150/month' : 'Per Booking · ₹1/booking'}
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: 13 }}>
                    {' '}— activates when trial ends
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedInline(null); setChangingPlan(true); }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Change Plan
            </button>
          </div>
        </div>
      )}

      {/* ── Inline confirm: shown solo when user tapped a card (no heading, no grid behind it) ── */}
      {selectedInline && renderInlineConfirm('trial')}

      {/* ── Plan grid: only when no card is being confirmed AND no plan is locked in yet ── */}
      {!selectedInline && (!planSelectedDuringTrial || changingPlan) && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {changingPlan ? 'Change Your Plan' : 'Choose Your Plan'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
              {changingPlan
                ? 'Pick a different plan — no charges until your trial ends.'
                : 'Lock in a plan now — it activates automatically. No payment needed today.'}
            </p>
          </div>
          {renderPlanCards('trial')}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER — POST-TRIAL GATE (trial expired, no paid plan)
  // ═══════════════════════════════════════════════════════════
  const renderPostTrialGate = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Lock card ──────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, #1a0a0a 0%, ${CARD} 60%)`,
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 24, padding: '36px 28px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(239,68,68,0.08), 0 24px 48px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Lock size={24} color="#f87171" />
        </div>

        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 24, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Your free trial has ended
        </h2>

        {/* Trial recap stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '20px 0 24px' }}>
          {[
            { label: 'Bookings during trial', value: monthlyBookingCount || trialTotalBookings },
            { label: 'Est. revenue earned', value: `₹${((monthlyBookingCount || 0) * EST_REVENUE_PER_BOOKING).toLocaleString('en-IN')}` },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 26, margin: '0 0 4px', letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.06)`,
          borderRadius: 14, padding: '14px 20px', marginBottom: 24, textAlign: 'left',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            New bookings are paused. Choose a plan to reactivate your account —{' '}
            <strong style={{ color: '#fff' }}>all your existing data is safe.</strong>
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(99,102,241,0.08) 100%)',
          border: `1px solid ${PURPLE}30`, borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 2px' }}>Most Popular</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>
              Continue for just <span style={{ color: PURPLE_LIGHT }}>₹150/month</span>
            </p>
          </div>
          <ChevronRight size={18} color={PURPLE_LIGHT} />
        </div>
      </div>

      {/* Plan cards to activate */}
      <div>
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Activate Your Plan
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 16px' }}>
          Select a plan to restore access and continue managing bookings.
        </p>
        {renderPlanCards('activate')}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER — ACTIVE / OVERDUE PLAN
  // ═══════════════════════════════════════════════════════════
  const renderActivePlan = () => {
    const isPurplePlan = planType === 'starter';
    const accent = isPurplePlan ? PURPLE : GREEN;
    const accentLight = isPurplePlan ? PURPLE_LIGHT : '#34d399';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Current plan hero ───────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${accent}10 0%, ${CARD} 60%)`,
          border: `1px solid ${accent}25`, borderRadius: 24, padding: '28px',
          boxShadow: CARD_SHADOW,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: `${accent}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isPurplePlan ? <Zap size={22} color={accentLight} /> : <TrendingUp size={22} color={accentLight} />}
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Current Plan
                </p>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: 0, letterSpacing: '-0.02em' }}>
                  {isPurplePlan ? 'Starter' : 'Per Booking'}
                  <span style={{ color: accentLight, fontWeight: 700, fontSize: 16, marginLeft: 8 }}>
                    {isPurplePlan ? '₹150/mo' : '₹1/booking'}
                  </span>
                </p>
              </div>
            </div>

            <div style={{
              background: isPaid ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              border: `1px solid ${isPaid ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
              borderRadius: 20, padding: '5px 12px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isPaid ? GREEN : '#f59e0b',
              }} />
              <span style={{ color: isPaid ? '#34d399' : '#fde68a', fontSize: 12, fontWeight: 700 }}>
                {isPaid ? 'Active' : 'Payment Due'}
              </span>
            </div>
          </div>

          {/* Billing cycle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: isOverdue ? 16 : 0 }}>
            {[
              { label: 'Cycle ends', value: fmt(billingCycleEndDate) },
              { label: planType === 'per_booking' ? 'Bookings this month' : 'Next renewal', value: planType === 'per_booking' ? monthlyBookingCount : fmt(billingCycleEndDate) },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px',
                border: `1px solid rgba(255,255,255,0.06)`,
              }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</p>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Per-booking usage */}
          {planType === 'per_booking' && (
            <div style={{
              background: GREEN_DIM, border: `1px solid rgba(16,185,129,0.2)`,
              borderRadius: 12, padding: '14px 16px', marginTop: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 3px' }}>This month's usage</p>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>{monthlyBookingCount} bookings</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 3px' }}>Estimated bill</p>
                <p style={{ color: '#34d399', fontWeight: 800, fontSize: 22, margin: 0 }}>₹{estimatedBill}</p>
              </div>
            </div>
          )}

          {/* Pay Now (overdue) */}
          {isOverdue && (
            <button
              onClick={() => handlePayNow(planType)}
              disabled={actionLoading}
              style={{
                width: '100%', marginTop: 16, padding: '15px',
                background: `linear-gradient(135deg, ${PURPLE} 0%, #6d28d9 100%)`,
                border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700,
                fontSize: 16, cursor: actionLoading ? 'not-allowed' : 'pointer',
                boxShadow: `0 4px 24px ${PURPLE}50`, opacity: actionLoading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {actionLoading
                ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <>
                    <CreditCard size={18} />
                    Activate Plan — {planType === 'starter' ? '₹150' : `₹${estimatedBill}`}
                    <ArrowRight size={16} />
                  </>
              }
            </button>
          )}
        </div>

        {/* ── Scheduled change banner ──────────────────────── */}
        {planChangeRequested && nextPlan && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <ArrowRight size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fde68a', fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>
                Switching to {nextPlan === 'starter' ? 'Starter' : 'Per Booking'} at renewal
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                Applies on {fmt(billingCycleEndDate)}
              </p>
            </div>
            <button
              onClick={() => setModal({ type: 'cancelChange' })}
              style={{
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 8, padding: '6px 12px', color: '#f59e0b', fontWeight: 700,
                cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Switch plan section ──────────────────────────── */}
        {isPaid && !planChangeRequested && (
          <div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              Switch Plan
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 16px' }}>
              One change per billing cycle — applies at renewal.
            </p>
            {renderPlanCards('switch')}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  BILLING HISTORY
  // ═══════════════════════════════════════════════════════════
  const renderHistory = () => (
    <div style={{
      background: CARD, borderRadius: 20,
      border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: CARD_SHADOW,
    }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Billing History</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {['Month', 'Plan', 'Bookings', 'Amount', 'Status', 'Paid On'].map(h => (
                <th key={h} style={{
                  padding: '10px 20px', textAlign: h === 'Amount' || h === 'Bookings' ? 'right' : 'left',
                  color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((inv, i) => (
              <tr key={inv._id} style={{ borderTop: `1px solid ${BORDER}`, transition: 'background 0.15s' }}>
                <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{inv.billingMonth}</td>
                <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.55)' }}>
                  {inv.planType === 'starter' ? 'Starter' : 'Per Booking'}
                </td>
                <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.55)', textAlign: 'right' }}>{inv.bookingCount}</td>
                <td style={{ padding: '14px 20px', color: '#fff', fontWeight: 700, textAlign: 'right' }}>₹{inv.amount}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: inv.paymentStatus === 'paid' ? 'rgba(16,185,129,0.12)' : inv.paymentStatus === 'pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                    color: inv.paymentStatus === 'paid' ? '#34d399' : inv.paymentStatus === 'pending' ? '#fde68a' : '#f87171',
                    border: `1px solid ${inv.paymentStatus === 'paid' ? 'rgba(16,185,129,0.25)' : inv.paymentStatus === 'pending' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    {inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.3)' }}>
                  {inv.paidAt ? fmt(inv.paidAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────
  return (
    <DashboardLayout>
      <div style={{ background: BG, minHeight: '100vh', padding: '28px 20px 48px' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          button:focus { outline: none; }
        `}</style>

        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Page header ─────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 26, margin: 0, letterSpacing: '-0.03em' }}>
                Billing & Plan
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '4px 0 0' }}>
                Manage your subscription and payments
              </p>
            </div>
            <button
              onClick={load}
              style={{
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* ── Main content ────────────────────────────────── */}
          {trialActive && renderTrialActive()}
          {!trialActive && planType === 'free_trial' && renderPostTrialGate()}
          {!trialActive && planType !== 'free_trial' && renderActivePlan()}

          {/* ── Billing history ─────────────────────────────── */}
          {history.length > 0 && renderHistory()}

          {/* ── Trust footer ────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, paddingTop: 8 }}>
            {[
              { icon: <Shield size={13} />, text: 'Secured by Razorpay' },
              { icon: <CheckCircle size={13} />, text: 'Cancel anytime' },
              { icon: <Star size={13} />, text: 'No hidden charges' },
            ].map(t => (
              <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>{t.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>{t.text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────── */}
      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}

      {/* ── Modals ────────────────────────────────────── */}
      <Modal
        open={modal?.type === 'switch'}
        onClose={() => setModal(null)}
        onConfirm={confirmSwitch}
        loading={actionLoading}
        title={`Switch to ${modal?.planKey === 'starter' ? 'Starter' : 'Per Booking'} Plan`}
        body={
          <>
            Your current <strong style={{ color: '#fff' }}>{planType === 'starter' ? 'Starter' : 'Per Booking'}</strong> plan
            {' '}continues until{' '}<strong style={{ color: '#fff' }}>{fmt(billingCycleEndDate)}</strong>.
            <br /><br />
            The new plan will apply from your next billing cycle.
            <br /><br />
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>You can only request one plan change per billing cycle.</span>
          </>
        }
        confirmLabel="Confirm Switch"
      />
      <Modal
        open={modal?.type === 'cancelChange'}
        onClose={() => setModal(null)}
        onConfirm={confirmCancelChange}
        loading={actionLoading}
        title="Cancel Scheduled Switch"
        body={
          <>
            Cancel the scheduled switch to{' '}
            <strong style={{ color: '#fff' }}>{nextPlan === 'starter' ? 'Starter' : 'Per Booking'}</strong>?
            <br /><br />
            Your <strong style={{ color: '#fff' }}>{planType === 'starter' ? 'Starter' : 'Per Booking'}</strong> plan
            {' '}will continue at renewal.
          </>
        }
        confirmLabel="Yes, Cancel Switch"
        danger
      />
    </DashboardLayout>
  );
};

export default Billing;
