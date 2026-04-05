import React from 'react';
import { Check, Clock, Flame, Star, Gem } from 'lucide-react';
import { PkgIcon } from '../MembershipBuilder/IconSelector';

const TAG_META = {
  popular:     { label: 'Popular',     gradient: 'from-orange-400 to-rose-500',   Icon: Flame },
  recommended: { label: 'Recommended', gradient: 'from-blue-500 to-indigo-500',   Icon: Star  },
  best_value:  { label: 'Best Value',  gradient: 'from-emerald-400 to-teal-500',  Icon: Gem   },
};

const CHECKLIST_TAG_LABELS = {
  popular:     'Popular',
  recommended: 'Recommended',
  best_value:  'Best Value',
};

export default function Step3Preview({ form, origPrice, finalPrice, savings, discPct }) {
  const tag = TAG_META[form.tag];

  const checks = [
    { label: 'Package Name', ok: !!form.name,              val: form.name || '—'                                             },
    { label: 'Services',     ok: form.services.length > 0, val: `${form.services.length} included`                           },
    { label: 'Final Price',  ok: !!form.discountedPrice,   val: form.discountedPrice ? `₹${form.discountedPrice}` : 'Not set' },
    { label: 'Badge',        ok: true,                      val: CHECKLIST_TAG_LABELS[form.tag] || 'None'                     },
  ];

  return (
    <div className="space-y-5 py-2">
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
          Customer-facing Preview
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          This is exactly how your package appears to customers
        </p>
      </div>

      {/* ── Premium Preview Card ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl
        border-2 border-indigo-200/80 dark:border-indigo-700/50
        shadow-2xl shadow-indigo-500/10
        bg-white dark:bg-gray-900">

        {/* Gradient top strip */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-50 to-transparent dark:from-indigo-950/20 dark:to-transparent rounded-full translate-x-16 -translate-y-16 pointer-events-none" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shadow-md shadow-indigo-500/15 border border-indigo-100/80 dark:border-indigo-800/30">
                <PkgIcon iconKey={form.icon} size={26} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                  {form.name || 'Package Name'}
                </h3>
                {form.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 max-w-[200px] line-clamp-2">
                    {form.description}
                  </p>
                )}
              </div>
            </div>
            {tag && (
              <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-gradient-to-r ${tag.gradient} shadow-sm`}>
                <tag.Icon size={11} strokeWidth={2.5} />
                {tag.label}
              </span>
            )}
          </div>

          {/* Services list */}
          {form.services.length > 0 && (
            <div className="mb-5 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                What's Included
              </p>
              {form.services.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 flex-1">{s.serviceName}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">₹{s.price}</span>
                </div>
              ))}
            </div>
          )}

          {/* Price block */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none tabular-nums">
                  ₹{finalPrice || origPrice}
                </span>
                {origPrice > 0 && finalPrice > 0 && finalPrice < origPrice && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 line-through">₹{origPrice}</span>
                )}
                {discPct > 0 && (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    {discPct}% OFF
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  You save ₹{savings}
                </p>
              )}
            </div>
            <div className="text-right">
              {form.services.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {form.services.length} service{form.services.length !== 1 ? 's' : ''}
                </p>
              )}
              {parseInt(form.totalDuration) > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                  <Clock className="w-3 h-3" />{form.totalDuration} min
                </p>
              )}
            </div>
          </div>

          {/* Fake CTA (preview only) */}
          <div className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold text-center opacity-70 pointer-events-none select-none">
            Book This Package →
          </div>
        </div>
      </div>

      {/* ── Summary Checklist ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {checks.map(({ label, ok, val }) => (
          <div
            key={label}
            className={`flex items-start gap-2.5 p-3 rounded-xl border
              ${ok
                ? 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20'
              }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${ok ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
              {ok ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-bold">!</span>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[90px]">{val}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
