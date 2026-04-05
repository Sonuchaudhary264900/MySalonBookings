import React, { useState, useEffect } from 'react';
import {
  X, Tag, ArrowLeft, ArrowRight,
  Percent, SlidersHorizontal, Eye, Check, RefreshCw, Sparkles,
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import Step1Code    from './Step1Code';
import Step2Rules   from './Step2Rules';
import Step3Preview from './Step3Preview';

const STEPS = [
  { num: 1, label: 'Code & Discount', icon: Tag                },
  { num: 2, label: 'Rules',           icon: SlidersHorizontal  },
  { num: 3, label: 'Preview',         icon: Eye                },
];

const EMPTY_FORM = {
  code:           '',
  discountType:   'percentage',
  discountValue:  '',
  minOrderAmount: '',
  maxUses:        '',
  expiryDate:     '',
};

export default function CouponBuilder({ coupon, onClose, onSaved }) {
  const isEdit = !!coupon?._id;

  const [step,   setStep]   = useState(1);
  const [dir,    setDir]    = useState(1);
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  /* Populate form for editing */
  useEffect(() => {
    if (coupon) {
      setForm({
        code:           coupon.code           || '',
        discountType:   coupon.discountType   || 'percentage',
        discountValue:  String(coupon.discountValue  ?? ''),
        minOrderAmount: String(coupon.minOrderAmount ?? ''),
        maxUses:        String(coupon.maxUses        ?? ''),
        expiryDate:     coupon.expiryDate
          ? new Date(coupon.expiryDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [coupon]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const onChange = (patch) => setForm(prev => ({ ...prev, ...patch }));

  /* Navigation */
  const go   = (n) => { setDir(n > step ? 1 : -1); setStep(n); setError(''); };
  const next = ()  => go(step + 1);
  const prev = ()  => go(step - 1);

  /* Validation per step */
  const canStep1 = form.code.trim().length > 0 &&
    parseFloat(form.discountValue) > 0 &&
    (form.discountType !== 'percentage' || parseFloat(form.discountValue) <= 100);

  /* canStep2 — all optional, always passable */
  const canStep2 = true;

  /* Save */
  const handleSave = async () => {
    if (!form.code.trim())                                         { setError('Coupon code is required');        return; }
    if (!form.discountValue || isNaN(+form.discountValue))         { setError('Enter a valid discount value');   return; }
    if (form.discountType === 'percentage' && +form.discountValue > 100) { setError('Percentage cannot exceed 100'); return; }
    if (+form.discountValue <= 0)                                  { setError('Discount must be greater than 0'); return; }

    setError('');
    setSaving(true);

    const payload = {
      code:           form.code.trim().toUpperCase(),
      discountType:   form.discountType,
      discountValue:  +form.discountValue,
      minOrderAmount: form.minOrderAmount ? +form.minOrderAmount : 0,
      maxUses:        form.maxUses        ? +form.maxUses        : null,
      expiryDate:     form.expiryDate     || null,
    };

    try {
      if (isEdit) {
        await api.put(`/owner/coupons/${coupon._id}`, payload);
        toast.success('Coupon updated!');
      } else {
        await api.post('/owner/coupons', payload);
        toast.success('Coupon created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.message || `Failed to ${isEdit ? 'update' : 'create'} coupon`;
      toast.error(msg);
      setError(msg);
      if (err?.status === 409) go(1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes couponSlideIn {
          from { opacity: 0; transform: translateX(calc(var(--slide-dir) * 28px)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .coupon-step { animation: couponSlideIn 0.24s cubic-bezier(0.4, 0, 0.2, 1) both; }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Builder panel */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center px-4 py-6 pointer-events-none">
        <div
          className="relative w-full max-w-lg max-h-[92vh] flex flex-col
            bg-white dark:bg-[#0d1424]
            border border-gray-100 dark:border-gray-800/60
            rounded-3xl shadow-2xl shadow-black/25 dark:shadow-black/60
            pointer-events-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >

          {/* ── Top bar ─────────────────────────────────────────── */}
          <div className="shrink-0 px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                    <Tag className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {isEdit ? 'Edit Coupon' : 'Create Coupon'}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Step {step} of {STEPS.length} — {STEPS[step - 1].label}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done    = step > s.num;
                const current = step === s.num;
                const Icon    = s.icon;
                return (
                  <React.Fragment key={s.num}>
                    <button
                      onClick={() => { if (s.num < step) go(s.num); }}
                      className={`flex flex-col items-center gap-1 min-w-0 flex-1 ${s.num < step ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`
                        w-9 h-9 rounded-2xl flex items-center justify-center
                        transition-all duration-300 font-bold text-sm
                        ${done
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                          : current
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-110'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[10px] font-semibold hidden sm:block truncate transition-colors
                        ${current ? 'text-indigo-600 dark:text-indigo-400' : done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        {s.label}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`h-[2px] flex-1 max-w-[40px] mx-1 rounded-full transition-all duration-500
                        ${step > s.num ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Thin progress bar */}
            <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* ── Error banner ─────────────────────────────────────── */}
          {error && (
            <div className="mx-6 mb-2 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ── Step content (animated) ──────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            <div key={step} className="coupon-step" style={{ '--slide-dir': dir }}>
              {step === 1 && (
                <Step1Code form={form} onChange={onChange} />
              )}
              {step === 2 && (
                <Step2Rules form={form} onChange={onChange} />
              )}
              {step === 3 && (
                <Step3Preview form={form} />
              )}
            </div>
          </div>

          {/* ── Footer nav ──────────────────────────────────────── */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-3">
            {step > 1 ? (
              <button
                onClick={prev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  border border-gray-200 dark:border-gray-700
                  text-gray-600 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-all duration-150 active:scale-[0.97]"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  border border-gray-200 dark:border-gray-700
                  text-gray-500 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
            )}

            <div className="flex-1" />

            {/* Step dots */}
            <div className="hidden sm:flex items-center gap-1.5">
              {STEPS.map(s => (
                <div
                  key={s.num}
                  className={`rounded-full transition-all duration-300
                    ${step === s.num   ? 'w-6 h-2 bg-indigo-500'
                    : step > s.num     ? 'w-2 h-2 bg-indigo-300 dark:bg-indigo-700'
                    :                    'w-2 h-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex-1" />

            {step < 3 ? (
              <button
                onClick={next}
                disabled={step === 1 && !canStep1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                  bg-gradient-to-r from-indigo-600 to-violet-600
                  hover:from-indigo-500 hover:to-violet-500
                  text-white shadow-md shadow-indigo-500/25
                  hover:shadow-lg hover:shadow-indigo-500/35
                  disabled:opacity-40 disabled:pointer-events-none
                  transition-all duration-200 active:scale-[0.97]"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !canStep1}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold
                  bg-gradient-to-r from-indigo-600 to-violet-600
                  hover:from-indigo-500 hover:to-violet-500
                  text-white shadow-md shadow-indigo-500/30
                  hover:shadow-xl hover:shadow-indigo-500/40
                  disabled:opacity-50 disabled:pointer-events-none
                  transition-all duration-200 active:scale-[0.97]"
              >
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Sparkles className="w-4 h-4" /> {isEdit ? 'Update Coupon' : 'Create Coupon'}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
