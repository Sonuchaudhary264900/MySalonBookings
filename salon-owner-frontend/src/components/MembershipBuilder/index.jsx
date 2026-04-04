import React, { useState, useEffect } from 'react';
import {
  CreditCard, X, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, Scissors, Sparkles, Eye,
} from 'lucide-react';
import Step1Goal     from './Step1Goal';
import Step2Services from './Step2Services';
import Step3Pricing  from './Step3Pricing';
import Step4Preview  from './Step4Preview';

const MEM_STEPS = [
  { num: 1, label: 'Goal',     icon: Target   },
  { num: 2, label: 'Services', icon: Scissors },
  { num: 3, label: 'Pricing',  icon: Sparkles },
  { num: 4, label: 'Preview',  icon: Eye      },
];

export default function MembershipBuilder({ form, editId, saving, onChange, onSave, onClose, salonServices = [] }) {
  const [step, setStep] = useState(1);
  const [dir,  setDir]  = useState(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const go   = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const next = () => go(step + 1);
  const back = () => go(step - 1);

  const canNext =
    step === 1 ? !!form.goal
    : step === 2 ? (form.aiSelectedServices || []).length > 0
    : step === 3 ? parseFloat(form.price) > 0
    : form.name.trim().length > 0;

  const progress = ((step - 1) / (MEM_STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[60]">

      {/* ── Global styles ────────────────────────────────────────── */}
      <style>{`
        /* Backdrop */
        @keyframes mem-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .mem-backdrop {
          animation: mem-backdrop-in 0.22s ease both;
        }

        /* Panel spring entrance */
        @keyframes mem-panel-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .mem-panel {
          animation: mem-panel-in 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }

        /* Step slide transition */
        @keyframes mem-step-in {
          from { opacity: 0; transform: translateX(calc(var(--mdir) * 36px)) translateY(4px); }
          to   { opacity: 1; transform: translateX(0) translateY(0); }
        }
        .mem-step {
          animation: mem-step-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }

        /* Slider */
        .mem-slider {
          -webkit-appearance: none; appearance: none;
          height: 6px; border-radius: 9999px; outline: none;
          cursor: pointer; width: 100%;
          background: linear-gradient(to right, #7c3aed var(--val, 0%), #e5e7eb var(--val, 0%));
          transition: background 0.15s ease;
        }
        .dark .mem-slider {
          background: linear-gradient(to right, #7c3aed var(--val, 0%), #1f2937 var(--val, 0%));
        }
        .mem-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: white; border: 3px solid #7c3aed;
          box-shadow: 0 2px 8px rgba(124,58,237,0.4);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
          will-change: transform;
        }
        .mem-slider::-webkit-slider-thumb:hover {
          transform: scale(1.35);
          box-shadow: 0 0 0 6px rgba(124,58,237,0.12), 0 2px 10px rgba(124,58,237,0.5);
        }
        .mem-slider:active::-webkit-slider-thumb {
          transform: scale(1.15);
        }
        .mem-slider::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: white; border: 3px solid #7c3aed;
          box-shadow: 0 2px 8px rgba(124,58,237,0.4); cursor: pointer;
        }

        /* Preview card float */
        @keyframes mem-float {
          0%,100% { transform: translateY(0px)  rotate(-0.5deg); }
          50%     { transform: translateY(-9px) rotate(-0.5deg); }
        }
        .preview-float {
          animation: mem-float 4s cubic-bezier(0.37, 0, 0.63, 1) infinite;
          will-change: transform;
        }

        /* Progress bar shimmer */
        @keyframes mem-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .mem-progress-fill {
          background-size: 200% auto;
          background-image: linear-gradient(90deg, #7c3aed 0%, #a78bfa 40%, #7c3aed 70%, #a855f7 100%);
          animation: mem-shimmer 2.4s linear infinite;
          transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Custom scrollbar */
        .mem-scroll::-webkit-scrollbar { width: 4px; }
        .mem-scroll::-webkit-scrollbar-track { background: transparent; }
        .mem-scroll::-webkit-scrollbar-thumb {
          background: rgba(124,58,237,0.25); border-radius: 999px;
        }
        .mem-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(124,58,237,0.45);
        }

        /* Card stagger entrance */
        @keyframes mem-card-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .mem-card {
          animation: mem-card-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: calc(var(--i, 0) * 55ms);
          will-change: transform, opacity;
        }

        /* Connector line fill */
        .mem-connector {
          transition: background-color 0.45s cubic-bezier(0.22, 1, 0.36, 1),
                      opacity 0.45s ease;
        }
      `}</style>

      {/* ── Backdrop ────────────────────────────────────────────── */}
      <div
        className="mem-backdrop absolute inset-0 bg-black/65 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* ── Panel ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center px-4 py-6 pointer-events-none">
        <div
          onClick={e => e.stopPropagation()}
          className="mem-panel relative w-full max-w-2xl max-h-[92vh] flex flex-col
            bg-white dark:bg-[#0b1120]
            border border-gray-200/80 dark:border-white/[0.06]
            rounded-[28px] shadow-[0_32px_64px_-12px] shadow-black/30 dark:shadow-black/70
            pointer-events-auto overflow-hidden"
        >
          {/* Ambient top-left glow */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-violet-600/10 dark:bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

          {/* ── Header ────────────────────────────────────────── */}
          <div className="shrink-0 relative px-7 pt-7 pb-5">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-[-0.01em]">
                    {editId ? 'Edit Membership' : 'Create Membership'}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 pl-[46px]">
                  Step {step} of {MEM_STEPS.length} — {MEM_STEPS[step - 1].label}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-white/8
                  transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center">
              {MEM_STEPS.map((s, i) => {
                const done    = step > s.num;
                const current = step === s.num;
                const Icon    = s.icon;
                return (
                  <React.Fragment key={s.num}>
                    <button
                      onClick={() => { if (done) go(s.num); }}
                      className={`flex flex-col items-center gap-1.5 min-w-0 flex-1 transition-opacity duration-200
                        ${done ? 'cursor-pointer' : 'cursor-default'}
                        ${!done && !current ? 'opacity-50' : 'opacity-100'}`}
                    >
                      <div className={`
                        w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold
                        transition-all duration-350 ease-[cubic-bezier(0.34,1.4,0.64,1)]
                        ${done
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/35'
                          : current
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/45 scale-[1.12]'
                          : 'bg-gray-100 dark:bg-white/6 text-gray-400 dark:text-gray-500'
                        }
                      `}>
                        {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`
                        text-[10px] font-semibold hidden sm:block tracking-wide transition-colors duration-200
                        ${current ? 'text-violet-600 dark:text-violet-400'
                        : done    ? 'text-gray-500 dark:text-gray-400'
                        :           'text-gray-300 dark:text-gray-600'}
                      `}>
                        {s.label}
                      </span>
                    </button>
                    {i < MEM_STEPS.length - 1 && (
                      <div className={`mem-connector h-[2px] flex-1 max-w-[44px] mx-1.5 rounded-full
                        ${step > s.num
                          ? 'bg-violet-500 opacity-100'
                          : 'bg-gray-200 dark:bg-white/8 opacity-100'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-5 h-[3px] bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="mem-progress-fill h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* ── Step content ──────────────────────────────────── */}
          <div className="mem-scroll flex-1 overflow-y-auto px-7 pb-5 min-h-0">
            <div key={step} className="mem-step" style={{ '--mdir': dir }}>
              {step === 1 && <Step1Goal     form={form} onChange={onChange} />}
              {step === 2 && <Step2Services form={form} onChange={onChange} salonServices={salonServices} />}
              {step === 3 && <Step3Pricing  form={form} onChange={onChange} salonServices={salonServices} />}
              {step === 4 && <Step4Preview  form={form} onChange={onChange} />}
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────── */}
          <div className="shrink-0 px-7 py-4 border-t border-gray-100 dark:border-white/[0.05]
            bg-gray-50/60 dark:bg-white/[0.02] backdrop-blur-sm
            flex items-center justify-between gap-3">

            <button
              onClick={step === 1 ? onClose : back}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                border border-gray-200 dark:border-white/10
                text-sm font-medium text-gray-600 dark:text-gray-300
                hover:bg-white dark:hover:bg-white/6
                hover:border-gray-300 dark:hover:border-white/20
                hover:-translate-y-px
                transition-all duration-200 active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {/* Dot pips */}
            <div className="flex items-center gap-1.5">
              {MEM_STEPS.map(s => (
                <div key={s.num} className={`
                  rounded-full transition-all duration-350 ease-[cubic-bezier(0.34,1.4,0.64,1)]
                  ${step === s.num
                    ? 'w-6 h-1.5 bg-violet-500'
                    : step > s.num
                    ? 'w-2 h-1.5 bg-violet-300 dark:bg-violet-700'
                    : 'w-2 h-1.5 bg-gray-200 dark:bg-white/10'}
                `} />
              ))}
            </div>

            {step < 4 ? (
              <button
                onClick={next}
                disabled={!canNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-violet-600 to-purple-600
                  hover:from-violet-500 hover:to-purple-500
                  hover:shadow-lg hover:shadow-violet-500/30
                  hover:-translate-y-px
                  disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                  transition-all duration-200 active:scale-[0.97]
                  shadow-md shadow-violet-500/20"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onSave}
                disabled={saving || !canNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-violet-600 to-purple-600
                  hover:from-violet-500 hover:to-purple-500
                  hover:shadow-lg hover:shadow-violet-500/30
                  hover:-translate-y-px
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                  transition-all duration-200 active:scale-[0.97]
                  shadow-md shadow-violet-500/20"
              >
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Check className="w-4 h-4" strokeWidth={2.5} /> {editId ? 'Update Membership' : 'Create Membership'}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
