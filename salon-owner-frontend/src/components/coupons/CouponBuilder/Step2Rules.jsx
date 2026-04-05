import React from 'react';
import { ShoppingBag, Users, Calendar, Infinity, Clock } from 'lucide-react';

const EXPIRY_PRESETS = [
  { label: '7 days',   days: 7  },
  { label: '30 days',  days: 30 },
  { label: '90 days',  days: 90 },
  { label: '6 months', days: 180 },
];

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function Step2Rules({ form, onChange }) {
  const isUnlimited = !form.maxUses;

  return (
    <div className="space-y-5 py-2">

      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          All fields below are optional — leave blank for no restrictions.
        </p>
      </div>

      {/* ── Minimum Order Amount ─────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Minimum Order Amount</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Customer must spend at least this much</p>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">₹</span>
          <input
            type="number"
            value={form.minOrderAmount}
            onChange={e => onChange({ minOrderAmount: e.target.value })}
            min="0"
            placeholder="No minimum (any amount)"
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-semibold
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-600 placeholder:font-normal
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>
        {/* Quick presets */}
        <div className="flex gap-2 mt-2">
          {[199, 499, 999, 1999].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => onChange({ minOrderAmount: String(amt) })}
              className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-[0.97]
                ${form.minOrderAmount === String(amt)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 hover:border-indigo-300'
                }`}
            >
              ₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Max Total Uses ────────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Max Total Uses</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {isUnlimited ? 'Currently: unlimited uses' : `Limit to ${form.maxUses} total redemptions`}
              </p>
            </div>
          </div>
          {/* Unlimited toggle */}
          <button
            type="button"
            onClick={() => onChange({ maxUses: isUnlimited ? '' : '' })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all
              ${isUnlimited
                ? 'bg-violet-100 dark:bg-violet-950/50 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-violet-300'
              }`}
          >
            <Infinity className="w-3 h-3" />
            {isUnlimited ? 'Unlimited' : 'Set limit'}
          </button>
        </div>
        <div className="relative">
          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="number"
            value={form.maxUses}
            onChange={e => onChange({ maxUses: e.target.value })}
            min="1"
            placeholder="Unlimited (leave blank)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-600 placeholder:font-normal
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>
        <div className="flex gap-2 mt-2">
          {[50, 100, 200, 500].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ maxUses: String(n) })}
              className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-[0.97]
                ${form.maxUses === String(n)
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 hover:border-violet-300'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* ── Expiry Date ───────────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Expiry Date</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {form.expiryDate
                ? `Expires on ${new Date(form.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'No expiry — coupon runs until manually disabled'
              }
            </p>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 mb-3">
          {EXPIRY_PRESETS.map(({ label, days }) => {
            const val = addDays(days);
            const active = form.expiryDate === val;
            return (
              <button
                key={days}
                type="button"
                onClick={() => onChange({ expiryDate: active ? '' : val })}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-[10px] font-bold transition-all active:scale-[0.97]
                  ${active
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
              >
                <Clock className={`w-3 h-3 mb-0.5 ${active ? 'text-white' : 'text-gray-400'}`} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={form.expiryDate}
            onChange={e => onChange({ expiryDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>
      </div>

      {/* ── Rules Summary ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 p-4">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">
          Coupon Rules
        </p>
        <div className="space-y-1.5">
          <RuleRow
            icon={ShoppingBag}
            label="Min order"
            value={form.minOrderAmount ? `₹${form.minOrderAmount}` : 'No minimum'}
            active={!!form.minOrderAmount}
          />
          <RuleRow
            icon={Users}
            label="Max uses"
            value={form.maxUses ? form.maxUses : 'Unlimited'}
            active={!!form.maxUses}
          />
          <RuleRow
            icon={Calendar}
            label="Expires"
            value={form.expiryDate
              ? new Date(form.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Never'
            }
            active={!!form.expiryDate}
          />
        </div>
      </div>
    </div>
  );
}

function RuleRow({ icon: Icon, label, value, active }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {label}
      </span>
      <span className={`font-bold ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {value}
      </span>
    </div>
  );
}
