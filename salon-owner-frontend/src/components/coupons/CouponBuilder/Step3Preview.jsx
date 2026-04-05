import React, { useState } from 'react';
import { Check, Copy, Percent, IndianRupee, ShoppingBag, Users, Calendar } from 'lucide-react';
import AISuggestionBox from './AISuggestionBox';

export default function Step3Preview({ form }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(form.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const discountValue = parseFloat(form.discountValue) || 0;
  const discountLabel = form.discountType === 'percentage'
    ? `${discountValue}% OFF`
    : `₹${discountValue} OFF`;

  const checks = [
    { label: 'Coupon Code',    ok: !!form.code,          val: form.code || '—' },
    { label: 'Discount',       ok: discountValue > 0,    val: discountLabel    },
    {
      label: 'Min Order',
      ok: true,
      val: form.minOrderAmount ? `₹${form.minOrderAmount}` : 'None',
    },
    {
      label: 'Expiry',
      ok: true,
      val: form.expiryDate
        ? new Date(form.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : 'No expiry',
    },
  ];

  return (
    <div className="space-y-5 py-2">
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
          Customer-facing Preview
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          This is how your coupon appears to customers at checkout
        </p>
      </div>

      {/* ── Premium Coupon Preview Card ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl
        border-2 border-indigo-200/80 dark:border-indigo-700/50
        shadow-2xl shadow-indigo-500/10
        bg-white dark:bg-gray-900">

        {/* Gradient top strip */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* Decorative bg orb */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-50 to-transparent dark:from-indigo-950/20 dark:to-transparent rounded-full translate-x-12 -translate-y-12 pointer-events-none" />

        <div className="relative p-6">
          {/* Code + copy */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                Coupon Code
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-[0.15em] font-mono text-gray-900 dark:text-white">
                  {form.code || 'YOURCODE'}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
                >
                  {copied
                    ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                    : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-500" />
                  }
                </button>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                <Check className="w-2.5 h-2.5" /> Active
              </span>
            </div>
          </div>

          {/* Discount block */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 rounded-2xl p-5 mb-4 border border-indigo-100/60 dark:border-indigo-800/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
                {form.discountType === 'percentage'
                  ? <Percent className="w-6 h-6 text-white" />
                  : <IndianRupee className="w-6 h-6 text-white" />
                }
              </div>
              <div>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                  {form.discountType === 'percentage'
                    ? `${discountValue}%`
                    : `₹${discountValue}`
                  }
                </p>
                <p className="text-sm font-bold text-indigo-400 dark:text-indigo-500 mt-0.5">
                  {form.discountType === 'percentage' ? 'Percentage Discount' : 'Flat Discount'} — OFF
                </p>
              </div>
            </div>
          </div>

          {/* Rules info */}
          <div className="space-y-2 mb-4">
            {form.minOrderAmount > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <ShoppingBag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                Min order: <span className="font-semibold text-gray-900 dark:text-white">₹{form.minOrderAmount}</span>
              </div>
            )}
            {form.maxUses && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                Max <span className="font-semibold text-gray-900 dark:text-white">{form.maxUses}</span> total uses
              </div>
            )}
            {form.expiryDate && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                Expires&nbsp;
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date(form.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            {!form.minOrderAmount && !form.maxUses && !form.expiryDate && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No restrictions — valid on all bookings</p>
            )}
          </div>

          {/* Fake CTA */}
          <div className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold text-center opacity-70 pointer-events-none select-none">
            Apply Coupon →
          </div>
        </div>
      </div>

      {/* ── AI Suggestion ─────────────────────────────────────────── */}
      {discountValue > 0 && (
        <AISuggestionBox
          discountType={form.discountType}
          discountValue={form.discountValue}
        />
      )}

      {/* ── Summary Checklist ─────────────────────────────────────── */}
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
