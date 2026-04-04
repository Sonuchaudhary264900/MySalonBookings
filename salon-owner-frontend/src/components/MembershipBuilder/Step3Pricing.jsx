import React, { useEffect } from 'react';
import { Check, Zap, Percent, Scissors } from 'lucide-react';
import AISuggestionBox from './AISuggestionBox';

const CYCLE_OPTIONS = [
  { value: 'monthly',   label: 'Monthly',   months: 1,  desc: 'Every month'    },
  { value: 'quarterly', label: 'Quarterly', months: 3,  desc: 'Every 3 months' },
  { value: 'yearly',    label: 'Yearly',    months: 12, desc: 'Best deal', best: true },
];

function getPlanCategory(price) {
  if (price < 300)  return 'Basic';
  if (price <= 700) return 'Most Popular';
  return 'Premium';
}

/* ── Section label ─────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 mb-3">
      {children}
    </p>
  );
}

export default function Step3Pricing({ form, onChange, salonServices }) {
  const selected   = form.aiSelectedServices || [];
  const totalValue = selected.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);
  const discPct    = parseInt(form.benefitDiscountPercent) || 30;
  const price      = parseFloat(form.price) || 0;
  const recPrice   = Math.round(totalValue * (1 - discPct / 100));
  const savings    = Math.max(0, totalValue - price);
  const planCat    = getPlanCategory(price || recPrice);

  useEffect(() => {
    if (!form.price && totalValue > 0) {
      onChange({ price: String(Math.round(totalValue * 0.7)), benefitDiscountPercent: '30' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSlider = (val) => {
    const pct      = parseInt(val);
    const newPrice = Math.max(1, Math.round(totalValue * (1 - pct / 100)));
    onChange({ benefitDiscountPercent: String(pct), price: String(newPrice) });
  };

  const toggleFreeService = (svc) => {
    const exists = form.freeServices.some(fs => fs.serviceName === svc.name);
    onChange({
      freeServices: exists
        ? form.freeServices.filter(fs => fs.serviceName !== svc.name)
        : [...form.freeServices, { serviceName: svc.name, usageLimit: '1' }],
    });
  };

  const adjustUsage = (serviceName, delta) => {
    onChange({
      freeServices: form.freeServices.map(fs =>
        fs.serviceName === serviceName
          ? { ...fs, usageLimit: String(Math.max(1, (parseInt(fs.usageLimit) || 1) + delta)) }
          : fs
      ),
    });
  };

  return (
    <div className="space-y-6 py-3">

      {/* AI Suggestion */}
      {totalValue > 0 && (
        <AISuggestionBox
          totalValue={totalValue}
          discountPct={discPct}
          recommendedPrice={recPrice}
          savings={Math.max(0, totalValue - recPrice)}
          planCategory={planCat}
          goal={form.goal}
        />
      )}

      {/* ── Discount slider ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Member Discount</SectionLabel>
          <div className="flex items-center gap-1.5
            bg-violet-50 dark:bg-violet-950/40
            border border-violet-200/80 dark:border-violet-700/50
            px-3 py-1.5 rounded-full">
            <Percent className="w-3 h-3 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-black text-violet-700 dark:text-violet-300 tabular-nums">
              {discPct}% off
            </span>
          </div>
        </div>

        <div className="relative pb-1">
          <input
            type="range" min="0" max="50" value={discPct}
            onChange={e => handleSlider(e.target.value)}
            className="mem-slider"
            style={{ '--val': `${discPct * 2}%` }}
          />
          {/* Tick marks */}
          <div className="flex justify-between mt-2 px-[2px]">
            {[0, 10, 20, 30, 40, 50].map(t => (
              <div key={t} className="flex flex-col items-center gap-0.5">
                <div className={`w-px h-1.5 rounded-full ${discPct >= t ? 'bg-violet-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className="text-[9px] text-gray-400 dark:text-gray-600 tabular-nums">{t}%</span>
              </div>
            ))}
          </div>
        </div>

        {discPct > 0 && (
          <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-2 leading-relaxed">
            Members save ₹{Math.max(0, totalValue - Math.round(totalValue * (1 - discPct / 100))).toLocaleString('en-IN')} compared to retail price
          </p>
        )}
      </div>

      {/* ── Price input ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Membership Price <span className="text-red-400 normal-case font-normal">*</span></SectionLabel>
          {totalValue > 0 && (
            <button
              type="button"
              onClick={() => onChange({ price: String(recPrice), benefitDiscountPercent: String(discPct) })}
              className="text-[10px] font-semibold text-violet-500 dark:text-violet-400
                hover:text-violet-700 dark:hover:text-violet-300
                underline underline-offset-2 transition-colors duration-150"
            >
              Reset to AI rec.
            </button>
          )}
        </div>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400 dark:text-gray-500 pointer-events-none
            group-focus-within:text-violet-500 transition-colors duration-200">
            ₹
          </span>
          <input
            value={form.price}
            onChange={e => onChange({ price: e.target.value })}
            type="number" min="0" placeholder="0"
            className="w-full h-14 pl-9 pr-4 rounded-2xl
              border border-gray-200 dark:border-white/10
              bg-gray-50 dark:bg-white/[0.04]
              text-gray-900 dark:text-white text-2xl font-black tabular-nums
              focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-400
              focus:bg-white dark:focus:bg-white/[0.07]
              placeholder:text-gray-300 dark:placeholder:text-gray-700
              transition-all duration-200"
          />
        </div>
        {price > 0 && totalValue > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Customers save ₹{savings.toLocaleString('en-IN')} vs. paying retail
            </p>
          </div>
        )}
      </div>

      {/* ── Billing cycle ──────────────────────────────────── */}
      <div>
        <SectionLabel>Billing Cycle</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {CYCLE_OPTIONS.map((cycle, i) => (
            <button
              key={cycle.value} type="button"
              onClick={() => onChange({ billingCycle: cycle.value })}
              style={{ '--i': i }}
              className={`
                mem-card relative flex flex-col items-center gap-1.5 pt-5 pb-3.5 px-3 rounded-2xl border-2
                transition-all duration-250 active:scale-[0.97]
                ${form.billingCycle === cycle.value
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
              {cycle.best && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2
                  bg-gradient-to-r from-violet-600 to-purple-600
                  text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap
                  shadow-sm shadow-violet-500/30">
                  BEST DEAL
                </span>
              )}
              <span className={`text-[13px] font-bold tracking-[-0.01em]
                ${form.billingCycle === cycle.value ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {cycle.label}
              </span>
              <span className={`text-[10px] text-center leading-snug
                ${form.billingCycle === cycle.value ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {cycle.desc}
              </span>
              {form.billingCycle === cycle.value && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Priority booking ───────────────────────────────── */}
      <div>
        <SectionLabel>Perks</SectionLabel>
        <div
          onClick={() => onChange({ priorityBooking: !form.priorityBooking })}
          className={`
            flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer
            transition-all duration-250 active:scale-[0.99]
            ${form.priorityBooking
              ? `border-amber-400/80 dark:border-amber-500/60
                 bg-gradient-to-br from-amber-50 to-yellow-50/60 dark:from-amber-950/40 dark:to-yellow-950/20
                 shadow-sm shadow-amber-500/15 -translate-y-px`
              : `border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]
                 hover:border-amber-300/70 dark:hover:border-amber-500/40
                 hover:-translate-y-px hover:shadow-sm`
            }
          `}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-250
              ${form.priorityBooking ? 'bg-amber-100 dark:bg-amber-900/50 shadow-sm' : 'bg-gray-100 dark:bg-white/6'}`}>
              <Zap className={`w-5 h-5 transition-colors duration-200
                ${form.priorityBooking ? 'text-amber-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`text-[13px] font-bold tracking-[-0.005em]
                ${form.priorityBooking ? 'text-amber-900 dark:text-amber-100' : 'text-gray-700 dark:text-gray-200'}`}>
                Priority Booking
              </p>
              <p className={`text-xs leading-relaxed
                ${form.priorityBooking ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                Get faster slots &amp; reduced waiting time
              </p>
            </div>
          </div>
          {/* Toggle */}
          <div className={`relative w-11 h-6 rounded-full shrink-0
            transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]
            ${form.priorityBooking ? 'bg-amber-400 shadow-inner' : 'bg-gray-200 dark:bg-white/10'}`}>
            <div className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full
              shadow-[0_1px_4px_rgba(0,0,0,0.2)]
              transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]
              ${form.priorityBooking ? 'left-[22px]' : 'left-[3px]'}`} />
          </div>
        </div>
      </div>

      {/* ── Free services ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Free Services per Period</SectionLabel>
          {form.freeServices.length > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full
              bg-violet-50 dark:bg-violet-950/40
              border border-violet-200/80 dark:border-violet-700/50
              text-violet-600 dark:text-violet-400">
              {form.freeServices.length} added
            </span>
          )}
        </div>

        {salonServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400 dark:text-gray-500">
            <Scissors className="w-7 h-7 opacity-40" />
            <span className="text-xs">No services available</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {salonServices.map((svc, i) => {
              const sel   = form.freeServices.find(fs => fs.serviceName === svc.name);
              const price = svc.basePrice || svc.price || 0;
              return (
                <div
                  key={svc._id || svc.name}
                  onClick={() => toggleFreeService(svc)}
                  style={{ '--i': i }}
                  className={`
                    mem-card relative p-4 rounded-2xl border cursor-pointer
                    transition-all duration-250 active:scale-[0.97]
                    ${sel
                      ? `border-violet-500 dark:border-violet-500/80
                         bg-gradient-to-br from-violet-50 to-purple-50/60
                         dark:from-violet-950/50 dark:to-purple-950/30
                         shadow-sm shadow-violet-500/15 -translate-y-px`
                      : `border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]
                         hover:border-violet-300/70 dark:hover:border-violet-500/40
                         hover:-translate-y-px hover:shadow-sm`
                    }
                  `}
                >
                  <p className={`text-[13px] font-bold pr-8 mb-2 leading-snug tracking-[-0.005em]
                    ${sel ? 'text-violet-900 dark:text-violet-100' : 'text-gray-900 dark:text-white'}`}>
                    {svc.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black
                      ${sel ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    {sel && (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => adjustUsage(svc.name, -1)}
                          className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400
                            flex items-center justify-center text-sm font-bold
                            hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors duration-150
                            active:scale-90">
                          −
                        </button>
                        <span className="text-xs font-black text-violet-700 dark:text-violet-300 w-5 text-center tabular-nums">
                          {sel.usageLimit}×
                        </span>
                        <button type="button" onClick={() => adjustUsage(svc.name, 1)}
                          className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400
                            flex items-center justify-center text-sm font-bold
                            hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors duration-150
                            active:scale-90">
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Check */}
                  <div className={`absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-250 ease-[cubic-bezier(0.34,1.4,0.64,1)]
                    ${sel
                      ? 'bg-violet-600 text-white scale-110 shadow-sm shadow-violet-500/40'
                      : 'bg-gray-100 dark:bg-white/8 text-gray-300 dark:text-gray-600 scale-90'
                    }`}>
                    <Check className="w-3 h-3" strokeWidth={sel ? 3 : 2} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
