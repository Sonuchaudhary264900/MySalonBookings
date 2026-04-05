import React from 'react';
import { Percent, Star, TrendingUp } from 'lucide-react';
import AISuggestionBox from './AISuggestionBox';

export default function Step2Pricing({
  form, onChange, sliderPct, onSlider,
  origPrice, finalPrice, savings, discPct,
  suggested20, suggested15,
}) {
  const sliderBg = `linear-gradient(to right, #6366f1 ${sliderPct * 2}%, #e5e7eb ${sliderPct * 2}%)`;

  const recommendedPrice = Math.round(origPrice * 0.7);
  const aiSavings        = origPrice - recommendedPrice;

  return (
    <div className="space-y-5 py-2">

      {/* ── Price Breakdown ──────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
          Price Breakdown
        </p>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {form.services.map((s, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-gray-600 dark:text-gray-400">{s.serviceName}</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">₹{s.price}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-indigo-50/60 dark:bg-indigo-950/20 border-t-2 border-indigo-100 dark:border-indigo-800/40">
            <span className="text-sm font-black text-gray-800 dark:text-gray-100">Total Original</span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{origPrice}</span>
          </div>
        </div>
      </div>

      {/* ── Discount Slider ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Discount
          </p>
          <div className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
            <Percent className="w-3.5 h-3.5" />
            <span className="text-sm font-black">{sliderPct}% off</span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={sliderPct}
          onChange={onSlider}
          className="range-premium w-full"
          style={{ background: sliderBg }}
        />

        <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-600 mt-1">
          <span>No discount</span>
          <span>50% maximum</span>
        </div>

        {/* Quick discount buttons */}
        <div className="flex gap-2 mt-3">
          {[
            { pct: 10, label: '10%', hint: 'Light'     },
            { pct: 15, label: '15%', hint: 'Standard'  },
            { pct: 20, label: '20%', hint: 'Best Value' },
            { pct: 25, label: '25%', hint: 'Premium'   },
          ].map(({ pct, label, hint }) => (
            <button
              key={pct}
              type="button"
              onClick={() => onSlider({ target: { value: pct } })}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-semibold
                transition-all duration-150 active:scale-[0.97]
                ${sliderPct === pct
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
            >
              {label}
              <span className={`text-[10px] font-normal ${sliderPct === pct ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Pricing Display ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-5">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-200/30 dark:bg-indigo-700/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Final Package Price
            </p>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none tabular-nums">
              ₹{finalPrice || origPrice}
            </p>
            {origPrice > 0 && finalPrice > 0 && finalPrice < origPrice && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">₹{origPrice}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  {discPct}% OFF
                </span>
              </div>
            )}
          </div>

          {savings > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Customer saves</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">₹{savings}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Suggestion ────────────────────────────────────────── */}
      {origPrice > 0 && (
        <AISuggestionBox
          totalValue={origPrice}
          discountPct={discPct}
          recommendedPrice={recommendedPrice}
          savings={aiSavings}
        />
      )}

      {/* ── Custom Price Override ─────────────────────────────────── */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">
          Or Enter Custom Final Price
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
            ₹
          </span>
          <input
            type="number"
            min="1"
            value={form.discountedPrice}
            onChange={e => onChange({ discountedPrice: e.target.value })}
            placeholder={suggested20 ? String(suggested20) : 'e.g. 499'}
            className="w-full pl-8 pr-4 py-3 rounded-xl border text-sm font-semibold
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-300 dark:placeholder:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>
        {suggested20 > 0 && (
          <div className="flex gap-3 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onChange({ discountedPrice: String(suggested15) })}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Star className="w-3 h-3" /> Use ₹{suggested15} (15% off)
            </button>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <button
              type="button"
              onClick={() => onChange({ discountedPrice: String(suggested20) })}
              className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors"
            >
              <TrendingUp className="w-3 h-3" /> Use ₹{suggested20} (Best Value — 20% off)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
