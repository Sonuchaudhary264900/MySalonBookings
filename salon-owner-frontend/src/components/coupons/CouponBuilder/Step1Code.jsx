import React from 'react';
import { Tag, Percent, IndianRupee, Sparkles } from 'lucide-react';

const SUGGESTIONS = ['SAVE10', 'FLAT50', 'WELCOME20', 'FIRST30', 'VIP15', 'SPECIAL25'];

const DISCOUNT_TYPES = [
  {
    value: 'percentage',
    label: 'Percentage',
    sub: 'e.g. 20% off total',
    Icon: Percent,
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    value: 'fixed',
    label: 'Flat Amount',
    sub: 'e.g. ₹100 off total',
    Icon: IndianRupee,
    gradient: 'from-violet-500 to-purple-600',
  },
];

export default function Step1Code({ form, onChange }) {
  const liveDiscount = parseFloat(form.discountValue) || 0;
  const hasDiscount  = form.code.trim() && liveDiscount > 0;

  return (
    <div className="space-y-5 py-2">

      {/* ── Coupon Code ──────────────────────────────────────────── */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
          Coupon Code <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={form.code}
            onChange={e => onChange({ code: e.target.value.toUpperCase().replace(/\s/g, '') })}
            placeholder="e.g. SAVE20"
            maxLength={20}
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border text-base font-black tracking-[0.2em] font-mono uppercase
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:tracking-normal placeholder:font-normal
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>

        {/* Quick suggestions */}
        {!form.code && (
          <div className="mt-2.5">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">Quick suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ code: s })}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black font-mono tracking-wider
                    bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400
                    hover:bg-indigo-50 dark:hover:bg-indigo-950/50
                    hover:text-indigo-600 dark:hover:text-indigo-400
                    border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800
                    transition-all duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Discount Type ─────────────────────────────────────────── */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
          Discount Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {DISCOUNT_TYPES.map(({ value, label, sub, Icon, gradient }) => {
            const active = form.discountType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ discountType: value })}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left
                  transition-all duration-200 active:scale-[0.97]
                  ${active
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 shadow-md shadow-indigo-500/15'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${active
                    ? `bg-gradient-to-br ${gradient} shadow-md`
                    : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Discount Value ─────────────────────────────────────────── */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
          {form.discountType === 'percentage' ? 'Discount Percentage *' : 'Discount Amount (₹) *'}
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {form.discountType === 'percentage'
              ? <Percent className="w-4 h-4 text-gray-400" />
              : <IndianRupee className="w-4 h-4 text-gray-400" />
            }
          </div>
          <input
            type="number"
            value={form.discountValue}
            onChange={e => onChange({ discountValue: e.target.value })}
            min="1"
            max={form.discountType === 'percentage' ? 100 : undefined}
            placeholder={form.discountType === 'percentage' ? '1 – 100' : 'Amount in ₹'}
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>

        {/* Quick discount presets */}
        {form.discountType === 'percentage' && (
          <div className="flex gap-2 mt-2.5">
            {[10, 15, 20, 25].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => onChange({ discountValue: String(pct) })}
                className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all active:scale-[0.97]
                  ${form.discountValue === String(pct)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        )}
        {form.discountType === 'fixed' && (
          <div className="flex gap-2 mt-2.5">
            {[50, 100, 150, 200].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => onChange({ discountValue: String(amt) })}
                className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all active:scale-[0.97]
                  ${form.discountValue === String(amt)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Live Mini Preview ─────────────────────────────────────── */}
      {hasDiscount && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-800/50 p-4">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-300/20 dark:bg-indigo-600/15 rounded-full blur-xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="shrink-0">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Preview</p>
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-md shadow-indigo-500/30">
                <Sparkles className="w-3 h-3" />
                {form.discountType === 'percentage' ? `${liveDiscount}% OFF` : `₹${liveDiscount} OFF`}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white font-mono tracking-widest">
                {form.code || 'YOURCODE'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {form.discountType === 'percentage'
                  ? `Save ${liveDiscount}% on any booking`
                  : `Save ₹${liveDiscount} on your booking`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
