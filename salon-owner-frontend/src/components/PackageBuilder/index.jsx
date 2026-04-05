import React, { useState, useEffect } from 'react';
import {
  X, Gift, ArrowLeft, ArrowRight,
  Scissors, TrendingUp, Eye, Check, RefreshCw, Sparkles,
} from 'lucide-react';
import Step1Services from './Step1Services';
import Step2Pricing  from './Step2Pricing';
import Step3Preview  from './Step3Preview';

const STEPS = [
  { num: 1, label: 'Services', icon: Scissors   },
  { num: 2, label: 'Pricing',  icon: TrendingUp },
  { num: 3, label: 'Preview',  icon: Eye        },
];

export default function PackageBuilder({
  form, editId, saving, onChange, onSave, onClose, salonServices,
}) {
  const [step, setStep]           = useState(1);
  const [dir,  setDir]            = useState(1);
  const [sliderPct, setSliderPct] = useState(0);

  /* Sync slider with form discount when entering pricing step */
  useEffect(() => {
    if (step === 2) setSliderPct(parseInt(form.discountPercent) || 0);
  }, [step]);

  /* Lock body scroll while builder is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* ── Service toggle ─────────────────────────────────────────── */
  const toggleService = (svc) => {
    const exists  = form.services.some(s => s.serviceName === svc.name);
    const updated = exists
      ? form.services.filter(s => s.serviceName !== svc.name)
      : [...form.services, {
          serviceName: svc.name,
          price:    String(svc.basePrice || svc.price || 0),
          duration: String(svc.duration || 0),
        }];
    const orig = updated.reduce((s, v) => s + (parseFloat(v.price)    || 0), 0);
    const dur  = updated.reduce((s, v) => s + (parseInt(v.duration)   || 0), 0);
    onChange({ services: updated, originalPrice: String(orig || ''), totalDuration: String(dur || '') });
  };

  /* ── Discount slider ─────────────────────────────────────────── */
  const handleSlider = (e) => {
    const pct  = parseInt(e.target.value);
    setSliderPct(pct);
    const orig = parseFloat(form.originalPrice) || 0;
    if (!orig) return;
    const discounted = Math.max(1, Math.round(orig * (1 - pct / 100)));
    onChange({ discountedPrice: String(discounted) });
  };

  /* ── Navigation ─────────────────────────────────────────────── */
  const go   = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const next = ()  => go(step + 1);
  const prev = ()  => go(step - 1);

  /* ── Validation ─────────────────────────────────────────────── */
  const canStep1 = form.name.trim().length > 0 && form.services.length > 0;
  const canStep2 = parseFloat(form.discountedPrice) > 0;

  /* ── Derived pricing ─────────────────────────────────────────── */
  const origPrice   = parseFloat(form.originalPrice)   || 0;
  const finalPrice  = parseFloat(form.discountedPrice) || 0;
  const savings     = Math.max(0, origPrice - finalPrice);
  const discPct     = parseInt(form.discountPercent)   || 0;
  const suggested20 = Math.round(origPrice * 0.80);
  const suggested15 = Math.round(origPrice * 0.85);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes builderSlideIn {
          from { opacity: 0; transform: translateX(calc(var(--slide-dir) * 28px)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .builder-step { animation: builderSlideIn 0.24s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .range-premium {
          -webkit-appearance: none; appearance: none;
          height: 6px; border-radius: 99px; outline: none; cursor: pointer;
        }
        .range-premium::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 2px 8px rgba(99,102,241,0.45);
          cursor: pointer; border: 3px solid white;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .range-premium::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 14px rgba(99,102,241,0.55);
        }
        .range-premium::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          cursor: pointer; border: 3px solid white;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Builder panel */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center px-4 py-6 pointer-events-none">
        <div
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col
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
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {editId ? 'Edit Package' : 'Create Package'}
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

          {/* ── Step content (animated) ──────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            <div key={step} className="builder-step" style={{ '--slide-dir': dir }}>
              {step === 1 && (
                <Step1Services
                  form={form}
                  onChange={onChange}
                  salonServices={salonServices}
                  onToggle={toggleService}
                />
              )}
              {step === 2 && (
                <Step2Pricing
                  form={form}
                  onChange={onChange}
                  sliderPct={sliderPct}
                  onSlider={handleSlider}
                  origPrice={origPrice}
                  finalPrice={finalPrice}
                  savings={savings}
                  discPct={discPct}
                  suggested20={suggested20}
                  suggested15={suggested15}
                />
              )}
              {step === 3 && (
                <Step3Preview
                  form={form}
                  origPrice={origPrice}
                  finalPrice={finalPrice}
                  savings={savings}
                  discPct={discPct}
                />
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
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-all duration-150"
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
                disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
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
                onClick={onSave}
                disabled={saving || !canStep2}
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
                  : <><Sparkles className="w-4 h-4" /> {editId ? 'Update Package' : 'Create Package'}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
