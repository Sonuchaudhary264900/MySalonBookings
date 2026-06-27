import React, { useState, useEffect } from 'react';
import {
  X, CreditCard, Smartphone, Building2, CheckCircle,
  Loader2, ShieldCheck, Lock, Zap, Star,
} from 'lucide-react';
import billingService from '../../services/billingService';
import toast from 'react-hot-toast';

const PLAN_INFO = {
  per_booking: { name: 'Pay Per Booking', price: '₹1/booking',  color: 'emerald', amount: 1   },
  starter:     { name: 'Starter Plan',    price: '₹150/month',  color: 'indigo',  amount: 150 },
};

const PAYMENT_METHODS = [
  { id: 'upi',     label: 'UPI',         sub: 'Google Pay, PhonePe, Paytm', icon: Smartphone  },
  { id: 'card',    label: 'Card',        sub: 'Credit / Debit card',         icon: CreditCard  },
  { id: 'netbanking', label: 'Net Banking', sub: 'All major banks',          icon: Building2   },
];

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const PaymentModal = ({ isOpen, onClose, planKey, onSuccess }) => {
  const [method,   setMethod]   = useState('upi');
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState('method'); // 'method' | 'processing' | 'success'

  const plan = PLAN_INFO[planKey] || PLAN_INFO.starter;

  useEffect(() => {
    if (isOpen) { setStep('method'); setMethod('upi'); }
  }, [isOpen]);

  const handlePay = async () => {
    // Online payments temporarily disabled for launch (cash-only phase). Re-enable with Razorpay Route.
    toast.error('Online payments are temporarily unavailable. Please try again later.');
    return;

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
      const res = await billingService.createPaymentOrder(planKey);
      if (!res.success) {
        toast.error('Failed to create payment order');
        setLoading(false);
        setStep('method');
        return;
      }

      const { orderId, amount, invoiceId, razorpayKeyId, ownerName, ownerEmail, ownerPhone } = res.data;

      const methodMap = { upi: 'upi', card: 'card', netbanking: 'netbanking' };

      const options = {
        key:         razorpayKeyId,
        amount:      amount * 100,
        currency:    'INR',
        name:        'GlowLoox',
        description: plan.name,
        order_id:    orderId,
        prefill:     { name: ownerName, email: ownerEmail, contact: ownerPhone },
        method:      methodMap[method],
        theme:       { color: '#6366f1' },
        handler: async (pd) => {
          try {
            const vRes = await billingService.verifyPayment({
              razorpayOrderId:   pd.razorpay_order_id,
              razorpayPaymentId: pd.razorpay_payment_id,
              razorpaySignature: pd.razorpay_signature,
              invoiceId,
            });
            if (vRes.success) {
              setStep('success');
              setTimeout(() => {
                onSuccess?.();
                onClose();
              }, 2000);
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
    } catch {
      toast.error('Failed to initiate payment');
      setLoading(false);
      setStep('method');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={loading ? undefined : onClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Success state */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Payment Successful!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {plan.name} has been activated.
            </p>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Opening Payment Gateway…</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Please complete the payment in the Razorpay window</p>
          </div>
        )}

        {/* Method selection */}
        {step === 'method' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Complete Payment</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Secured by Razorpay</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Order summary */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border-2
                ${plan.color === 'emerald'
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${plan.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-indigo-100 dark:bg-indigo-900'}`}>
                  {plan.color === 'emerald'
                    ? <Zap className={`w-5 h-5 text-emerald-600 dark:text-emerald-400`} />
                    : <Star className={`w-5 h-5 text-indigo-600 dark:text-indigo-400`} />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{plan.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{plan.price}</p>
                </div>
                <p className={`text-lg font-black
                  ${plan.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  ₹{plan.amount}
                </p>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Payment Method
                </label>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        onClick={() => setMethod(pm.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                          ${method === pm.id
                            ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-gray-900'
                          }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          method === pm.id ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Icon className={`w-4 h-4 ${method === pm.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${method === pm.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {pm.label}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{pm.sub}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                          method === pm.id
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {method === pm.id && <div className="w-full h-full rounded-full bg-white scale-50" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit SSL encryption</span>
                <Lock className="w-3 h-3 ml-1 text-gray-300 dark:text-gray-600" />
                <span>PCI DSS compliant</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                  text-sm font-medium text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handlePay} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                  text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
                  shadow-md shadow-indigo-500/20 disabled:opacity-60
                  flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</>
                  : <><CreditCard className="w-4 h-4" /> Pay ₹{plan.amount}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
