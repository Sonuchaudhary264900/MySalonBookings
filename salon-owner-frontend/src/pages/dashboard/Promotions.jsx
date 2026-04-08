import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, MapPin, Clock, CheckCircle, Loader2,
  CreditCard, Smartphone, Building2, ShieldCheck, Lock,
  RefreshCw, Zap, TrendingUp, X, ChevronDown, ChevronUp,
  History, Star,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSalon } from '../../hooks/useSalon';

/* ── Razorpay loader ─────────────────────────────────────────── */
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const PAYMENT_METHODS = [
  { id: 'upi',        label: 'UPI',         sub: 'Google Pay, PhonePe, Paytm', icon: Smartphone },
  { id: 'card',       label: 'Card',        sub: 'Credit / Debit card',         icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', sub: 'All major banks',             icon: Building2  },
];

/* ── Countdown helper ──────────────────────────────────────────── */
function useCountdown(endDate) {
  const calc = () => {
    if (!endDate) return null;
    const ms = new Date(endDate) - new Date();
    if (ms <= 0) return { days: 0, hours: 0, mins: 0 };
    const days  = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins  = Math.floor((ms % 3600000) / 60000);
    return { days, hours, mins };
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 30000);
    return () => clearInterval(t);
  });
  return left;
}

/* ── Active Promotion Banner ────────────────────────────────────── */
function ActivePromotionBanner({ promotion, bizName }) {
  const left = useCountdown(promotion?.endDate);
  if (!promotion) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-800
      bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 p-5 mb-6">
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-violet-400/10 dark:bg-violet-400/5" />
      <div className="absolute -right-2 -bottom-4 w-20 h-20 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5" />

      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/25">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              ACTIVE
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            Your {bizName} is promoted within {promotion.radiusKm} km
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Customers near your {bizName} see you first in search results
          </p>
          {left && (
            <div className="flex items-center gap-3 mt-3">
              {[['Days', left.days], ['Hours', left.hours], ['Min', left.mins]].map(([label, val]) => (
                <div key={label} className="text-center">
                  <div className="text-lg font-black text-violet-700 dark:text-violet-400 leading-none">{val}</div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</div>
                </div>
              ))}
              <div className="text-xs text-gray-400 dark:text-gray-500 ml-1">remaining</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tier Card ──────────────────────────────────────────────────── */
function TierCard({ tier, selected, onSelect, disabled }) {
  const popular = tier.radiusKm === 10;

  return (
    <button
      onClick={() => !disabled && onSelect(tier)}
      disabled={disabled}
      className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200 w-full
        ${selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full
          bg-amber-400 text-amber-900 whitespace-nowrap shadow">
          Most Popular
        </span>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${selected ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <MapPin className={`w-4 h-4 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
        </div>
        <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 flex items-center justify-center
          ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>

      <div className="mb-1">
        <span className="text-2xl font-black text-gray-900 dark:text-white">{tier.radiusKm}</span>
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 ml-1">km radius</span>
      </div>
      <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{tier.pricePerWeek}</div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">per week</div>

      {tier.label && (
        <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{tier.label}</div>
      )}
    </button>
  );
}

/* ── Payment Modal ─────────────────────────────────────────────── */
function PayModal({ tier, onClose, onSuccess, ownerInfo, bizName }) {
  const [method,  setMethod]  = useState('upi');
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState('method'); // method | processing | success

  const handlePay = async () => {
    setLoading(true);
    setStep('processing');

    const ok = await loadRazorpay();
    if (!ok) {
      toast.error('Payment gateway failed to load. Please try again.');
      setLoading(false);
      setStep('method');
      return;
    }

    try {
      const res = await api.post('/owner/promotions/create-order', { pricingTierId: tier._id });
      if (!res.data.success) {
        toast.error(res.data.message || 'Failed to create order');
        setLoading(false);
        setStep('method');
        return;
      }

      const { promotionId, razorpayOrderId, amount, razorpayKeyId } = res.data.data;

      const options = {
        key:         razorpayKeyId,
        amount,
        currency:    'INR',
        name:        'My Salon Bookings',
        description: `Salon Promotion – ${tier.radiusKm} km for 1 Week`,
        order_id:    razorpayOrderId,
        prefill:     {
          name:    ownerInfo?.name    || '',
          email:   ownerInfo?.email   || '',
          contact: ownerInfo?.phone   || '',
        },
        method: { upi: method === 'upi', card: method === 'card', netbanking: method === 'netbanking' },
        theme:  { color: '#7c3aed' },
        handler: async (pd) => {
          try {
            const vRes = await api.post('/owner/promotions/verify-payment', {
              promotionId,
              razorpayOrderId:   pd.razorpay_order_id,
              razorpayPaymentId: pd.razorpay_payment_id,
              razorpaySignature: pd.razorpay_signature,
            });
            if (vRes.data.success) {
              setStep('success');
              setTimeout(() => {
                onSuccess?.();
                onClose();
              }, 2200);
            } else {
              toast.error('Verification failed. Contact support.');
              setStep('method');
            }
          } catch {
            toast.error('Payment verification failed. Contact support.');
            setStep('method');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStep('method');
          },
        },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
      setStep('method');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={loading ? undefined : onClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Promotion Activated!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your {bizName} is now promoted within <strong>{tier.radiusKm} km</strong> for 1 week.
            </p>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Opening Payment Gateway…</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Complete the payment in the Razorpay window</p>
          </div>
        )}

        {/* Method selection */}
        {step === 'method' && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Promote Your Business</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Secured by Razorpay</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{tier.radiusKm} km Promotion — 1 Week</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Appears at top within {tier.radiusKm} km of your {bizName}</p>
                </div>
                <p className="text-lg font-black text-violet-600 dark:text-violet-400">₹{tier.pricePerWeek}</p>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Payment Method</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon;
                    const active = method === pm.id;
                    return (
                      <button key={pm.id} onClick={() => setMethod(pm.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                          ${active ? 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-800 bg-white dark:bg-gray-900'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-violet-100 dark:bg-violet-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Icon className={`w-4 h-4 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${active ? 'text-violet-700 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}>{pm.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{pm.sub}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-violet-500 bg-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {active && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit SSL encryption</span>
                <Lock className="w-3 h-3 ml-1 text-gray-300 dark:text-gray-600" />
                <span>PCI DSS compliant</span>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handlePay} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</>
                  : <><CreditCard className="w-4 h-4" /> Pay ₹{tier.pricePerWeek}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── History Row ─────────────────────────────────────────────────── */
const STATUS_STYLES = {
  active:          'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  expired:         'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  cancelled:       'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  pending_payment: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
};

function HistoryRow({ p }) {
  const label = { active: 'Active', expired: 'Expired', cancelled: 'Cancelled', pending_payment: 'Pending' }[p.status] || p.status;
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
          <MapPin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.radiusKm} km radius</p>
          <p className="text-xs text-gray-400">
            {p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}
            {p.endDate   ? ` → ${new Date(p.endDate).toLocaleDateString('en-IN')}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">₹{p.pricePaid}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || ''}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
const BIZ_NAME_MAP = {
  barbershop:    'Barbershop',
  salon:         'Salon',
  spa_wellness:  'Spa',
  makeup_bridal: 'Studio',
  skin_derma:    'Clinic',
};

export default function Promotions() {
  const { salon } = useSalon();

  const [tiers,           setTiers]           = useState([]);
  const [activePromotion, setActivePromotion] = useState(null);
  const [history,         setHistory]         = useState([]);
  const [selectedTier,    setSelectedTier]    = useState(null);
  const [payModalOpen,    setPayModalOpen]    = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [showHistory,     setShowHistory]     = useState(false);
  const [ownerInfo,       setOwnerInfo]       = useState(null);

  const bizType = salon?.businessType || '';
  const bizName = BIZ_NAME_MAP[bizType] || 'Salon';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tiersRes, activeRes, historyRes] = await Promise.all([
        api.get('/owner/promotions/pricing'),
        api.get('/owner/promotions/active'),
        api.get('/owner/promotions/history'),
      ]);
      setTiers(tiersRes.data.data?.tiers || []);
      setActivePromotion(activeRes.data.data?.promotion || null);
      setHistory(historyRes.data.data?.promotions || []);
    } catch (err) {
      toast.error('Failed to load promotion data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Load owner info for Razorpay prefill
    api.get('/owner/auth/me').then(r => {
      const owner = r.data.data;
      setOwnerInfo({
        name:         owner?.name,
        email:        owner?.email,
        phone:        owner?.phone,
        businessType: salon?.businessType || '',
      });
    }).catch(() => {});
  }, [fetchAll]);

  const hasActivePromotion = !!activePromotion;

  const handleSelectTier = (tier) => {
    setSelectedTier(tier);
  };

  const handlePromoteClick = () => {
    if (!selectedTier) { toast.error('Please select a radius first'); return; }
    setPayModalOpen(true);
  };

  const handlePaySuccess = () => {
    setPayModalOpen(false);
    toast.success(`Promotion activated! Your ${bizName} now appears at the top.`);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading promotions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Promote Your Business</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
          Pay to appear at the top of search results for customers near you.
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: MapPin,     color: 'violet', label: 'Choose Radius',  sub: 'Pick how far your promotion reaches' },
          { icon: CreditCard, color: 'indigo', label: 'Pay Once',       sub: 'One-time payment for 7 days' },
          { icon: TrendingUp, color: 'emerald',label: 'Appear on Top',  sub: 'Customers near you see you first' },
        ].map(({ icon: Icon, color, label, sub }) => (
          <div key={label} className={`p-3 rounded-xl border bg-${color}-50 dark:bg-${color}-950/20 border-${color}-100 dark:border-${color}-900 text-center`}>
            <div className={`w-8 h-8 rounded-lg bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <p className={`text-xs font-bold text-${color}-700 dark:text-${color}-400`}>{label}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Active Promotion ── */}
      {hasActivePromotion && <ActivePromotionBanner promotion={activePromotion} bizName={bizName} />}

      {/* ── Tier Selection ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Select Promotion Radius</h2>
          <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {tiers.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Megaphone className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No pricing tiers configured yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Contact admin to set up promotion pricing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tiers.map(tier => (
              <TierCard
                key={tier._id}
                tier={tier}
                selected={selectedTier?._id === tier._id}
                onSelect={handleSelectTier}
                disabled={hasActivePromotion}
              />
            ))}
          </div>
        )}

        {hasActivePromotion && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl mt-3">
            You already have an active promotion. You can purchase a new one once it expires on{' '}
            <strong>{new Date(activePromotion.endDate).toLocaleDateString('en-IN')}</strong>.
          </p>
        )}
      </div>

      {/* ── Promote Button ── */}
      {!hasActivePromotion && tiers.length > 0 && (
        <button
          onClick={handlePromoteClick}
          disabled={!selectedTier}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm
            bg-gradient-to-r from-violet-600 to-indigo-600
            hover:from-violet-700 hover:to-indigo-700
            shadow-lg shadow-violet-500/25
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {selectedTier
            ? `Promote for ₹${selectedTier.pricePerWeek} — ${selectedTier.radiusKm} km`
            : 'Select a radius above'}
        </button>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center justify-between w-full py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              Promotion History
              <span className="text-xs text-gray-400 font-normal">({history.length})</span>
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="space-y-2 mt-2">
              {history.map(p => <HistoryRow key={p._id} p={p} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center leading-relaxed pb-4">
        Promotions are non-refundable. Your {bizName} appears at the top for customers within the selected radius for exactly 7 days after payment.
        Only one active promotion per {bizName} at a time.
      </p>

      {/* ── Payment Modal ── */}
      {payModalOpen && selectedTier && (
        <PayModal
          tier={selectedTier}
          ownerInfo={ownerInfo}
          bizName={bizName}
          onClose={() => setPayModalOpen(false)}
          onSuccess={handlePaySuccess}
        />
      )}
    </div>
  );
}
