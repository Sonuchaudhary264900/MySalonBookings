import React from 'react';
import { Zap, Percent, Star, Check } from 'lucide-react';
import IconSelector, { PkgIcon } from './IconSelector';

const MEM_TAGS = [
  { v: '',            l: 'None'        },
  { v: 'popular',     l: 'Popular'     },
  { v: 'recommended', l: 'Recommended' },
  { v: 'best_value',  l: 'Best Value'  },
];

const TAG_LABEL = {
  popular:     'Popular',
  recommended: 'Recommended',
  best_value:  'Best Value',
};

const VALIDITY_PRESETS = [
  { days: 30,  label: '1 Month'  },
  { days: 90,  label: '3 Months' },
  { days: 180, label: '6 Months' },
  { days: 365, label: '1 Year'   },
];

const CYCLE_LABEL = { monthly: '/mo', quarterly: '/qtr', yearly: '/yr' };

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 mb-3">
      {children}
    </p>
  );
}

export default function Step4Preview({ form, onChange }) {
  const price      = parseFloat(form.price) || 0;
  const discPct    = parseInt(form.benefitDiscountPercent) || 0;
  const days       = parseInt(form.durationDays) || 30;
  const cycleLabel = CYCLE_LABEL[form.billingCycle] || '/mo';
  const tagLabel   = TAG_LABEL[form.tag];

  const selected   = form.aiSelectedServices || [];
  const totalValue = selected.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);
  const savings    = Math.max(0, totalValue - price);

  return (
    <div className="space-y-6 py-3">

      {/* ── Live Preview ────────────────────────────────────────── */}
      <div>
        <SectionLabel>Live Preview</SectionLabel>
        <div className="flex justify-center px-2">
          <div className="preview-float w-full max-w-[340px]">
            <div className="relative overflow-hidden rounded-[28px]
              bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700
              p-6 shadow-2xl shadow-violet-600/35 text-white">

              {/* Decorative orbs */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />

              {/* Header */}
              <div className="flex items-start gap-3.5 mb-5 relative">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm
                  flex items-center justify-center shadow-inner shrink-0
                  ring-1 ring-white/20">
                  <PkgIcon
                    iconKey={form.icon || 'gem'}
                    size={22}
                    className="text-white"
                    strokeWidth={1.75}
                  />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="font-black text-[17px] leading-tight tracking-[-0.02em] truncate">
                    {form.name || <span className="text-white/40 font-normal italic text-[15px]">Membership name…</span>}
                  </p>
                  {tagLabel && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full
                      bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                      {tagLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-5 relative">
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-white/60 text-base font-bold leading-none pb-0.5">₹</span>
                  <span className="text-[42px] font-black leading-none tracking-[-0.04em] tabular-nums">
                    {price > 0 ? price.toLocaleString('en-IN') : '—'}
                  </span>
                  <span className="text-white/60 text-sm pb-1">{cycleLabel}</span>
                </div>
                <p className="text-white/50 text-xs">Valid for {days} days</p>
                {savings > 0 && totalValue > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5
                    bg-white/15 backdrop-blur-sm
                    border border-white/20
                    px-3 py-1 rounded-full">
                    <span className="text-xs font-bold">Save ₹{savings.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-2 relative mb-5">
                {discPct > 0 && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                      <Percent className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-medium">{discPct}% off all services</span>
                  </div>
                )}
                {form.priorityBooking && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                      <Zap className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-medium">Priority Booking</span>
                  </div>
                )}
                {form.freeServices.slice(0, 3).map((fs, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                      <Star className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-medium">{fs.serviceName} × {fs.usageLimit}</span>
                  </div>
                ))}
                {form.freeServices.length > 3 && (
                  <p className="text-white/50 text-xs pl-7">+{form.freeServices.length - 3} more benefits</p>
                )}
                {discPct === 0 && !form.priorityBooking && form.freeServices.length === 0 && (
                  <p className="text-white/35 text-xs italic">Go back to Step 3 to add benefits</p>
                )}
              </div>

              {/* CTA */}
              <div className="relative py-3 rounded-2xl bg-white text-center
                text-violet-700 text-sm font-black tracking-[-0.01em]
                shadow-lg shadow-black/20
                ring-1 ring-white/40">
                Subscribe Now
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Validity ────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Membership Validity</SectionLabel>
        <div className="grid grid-cols-4 gap-2.5">
          {VALIDITY_PRESETS.map((preset, i) => (
            <button
              key={preset.days} type="button"
              onClick={() => onChange({ durationDays: String(preset.days) })}
              style={{ '--i': i }}
              className={`
                mem-card flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2
                transition-all duration-250 active:scale-[0.96]
                ${days === preset.days
                  ? `border-violet-500 dark:border-violet-500/80
                     bg-gradient-to-br from-violet-50 to-purple-50/60
                     dark:from-violet-950/50 dark:to-purple-950/30
                     shadow-md shadow-violet-500/15 -translate-y-px`
                  : `border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]
                     hover:border-violet-300/70 dark:hover:border-violet-500/30
                     hover:-translate-y-px hover:shadow-sm`
                }
              `}
            >
              <span className={`text-[18px] font-black leading-none tracking-[-0.02em] tabular-nums
                ${days === preset.days ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {preset.days}
              </span>
              <span className={`text-[10px] font-semibold
                ${days === preset.days ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {preset.label}
              </span>
              {days === preset.days && (
                <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Branding ────────────────────────────────────────────── */}
      <div className="space-y-5 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
        <SectionLabel>Branding</SectionLabel>

        {/* Icon picker */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-2.5">Icon</p>
          <IconSelector
            value={form.icon}
            onChange={(icon) => onChange({ icon })}
            accent="violet"
          />
        </div>

        {/* Name */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 block mb-2">
            Membership Name <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="e.g. Gold Member, VIP Club, Platinum Pass…"
            className="w-full h-11 px-4 rounded-2xl
              border border-gray-200 dark:border-white/10
              bg-gray-50 dark:bg-white/[0.04]
              text-gray-900 dark:text-white text-[13px] font-medium
              focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-400
              focus:bg-white dark:focus:bg-white/[0.07]
              placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all duration-200"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 block mb-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => onChange({ description: e.target.value })}
            rows={2}
            placeholder="Short pitch shown to customers — e.g. 'Priority bookings + 20% off every visit'"
            className="w-full px-4 py-3 rounded-2xl
              border border-gray-200 dark:border-white/10
              bg-gray-50 dark:bg-white/[0.04]
              text-gray-900 dark:text-white text-[13px] resize-none
              focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-400
              focus:bg-white dark:focus:bg-white/[0.07]
              placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all duration-200"
          />
        </div>

        {/* Badge */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 block mb-2.5">
            Badge
          </label>
          <div className="flex gap-2 flex-wrap">
            {MEM_TAGS.map(({ v, l }) => (
              <button key={v} type="button" onClick={() => onChange({ tag: v })}
                className={`
                  px-3.5 py-2 text-xs font-semibold rounded-full border
                  transition-all duration-200 active:scale-95 hover:-translate-y-px
                  ${form.tag === v
                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/25'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] hover:border-violet-300 dark:hover:border-violet-700/60'
                  }
                `}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
