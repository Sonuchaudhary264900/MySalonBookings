import React from 'react';
import { Clock, Check, Scissors } from 'lucide-react';

export default function Step2Services({ form, onChange, salonServices }) {
  const selected = form.aiSelectedServices || [];

  const toggleService = (svc) => {
    const key    = svc._id || svc.name;
    const exists = selected.some(s => (s._id || s.name) === key);
    const updated = exists
      ? selected.filter(s => (s._id || s.name) !== key)
      : [...selected, svc];
    onChange({ aiSelectedServices: updated });
  };

  const isSelected = (svc) => selected.some(s => (s._id || s.name) === (svc._id || svc.name));
  const totalValue = selected.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);

  return (
    <div className="space-y-5 py-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-[-0.01em]">
            Select Services
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            Pick the services to include — we'll calculate fair pricing automatically.
          </p>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-xs font-bold px-3 py-1 rounded-full
              bg-violet-100 dark:bg-violet-900/50
              text-violet-700 dark:text-violet-300
              border border-violet-200 dark:border-violet-700/50
              whitespace-nowrap">
              {selected.length} selected
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 pr-1">
              ₹{totalValue.toLocaleString('en-IN')} total
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      {salonServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
            <Scissors className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No services found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add services first before building a membership</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {salonServices.map((svc, i) => {
            const active = isSelected(svc);
            const price  = svc.basePrice || svc.price || 0;
            const dur    = svc.duration || 0;
            return (
              <button
                key={svc._id || svc.name}
                type="button"
                onClick={() => toggleService(svc)}
                style={{ '--i': i }}
                className={`
                  mem-card relative flex flex-col gap-2 p-4 rounded-2xl border-2 text-left
                  transition-all duration-250 active:scale-[0.97]
                  ${active
                    ? `border-violet-500 dark:border-violet-500/80
                       bg-gradient-to-br from-violet-50 to-purple-50/60
                       dark:from-violet-950/50 dark:to-purple-950/30
                       shadow-md shadow-violet-500/15 -translate-y-px`
                    : `border-gray-200/80 dark:border-white/[0.07]
                       bg-white dark:bg-white/[0.03]
                       hover:border-violet-300/70 dark:hover:border-violet-500/40
                       hover:bg-violet-50/40 dark:hover:bg-violet-950/20
                       hover:shadow-sm hover:-translate-y-px`
                  }
                `}
              >
                {/* Category */}
                {svc.category && (
                  <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full
                    ${active
                      ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400'
                      : 'bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500'
                    }`}>
                    {svc.category}
                  </span>
                )}

                {/* Name */}
                <p className={`text-[13px] font-bold pr-8 leading-snug tracking-[-0.005em]
                  ${active ? 'text-violet-900 dark:text-violet-100' : 'text-gray-900 dark:text-white'}`}>
                  {svc.name}
                </p>

                {/* Price + Duration */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-black
                    ${active ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                  {dur > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className={`w-3 h-3 ${active ? 'text-violet-400' : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium
                        ${active ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {dur} min
                      </span>
                    </div>
                  )}
                </div>

                {/* Check */}
                <div className={`
                  absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center
                  transition-all duration-250 ease-[cubic-bezier(0.34,1.4,0.64,1)]
                  ${active
                    ? 'bg-violet-600 text-white scale-110 shadow-sm shadow-violet-500/40'
                    : 'bg-gray-100 dark:bg-white/8 text-gray-300 dark:text-gray-600 scale-90'
                  }
                `}>
                  <Check className="w-3 h-3" strokeWidth={active ? 3 : 2} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Total strip */}
      {selected.length > 0 && (
        <div style={{ '--i': 0 }}
          className="mem-card flex items-center justify-between
            bg-violet-50 dark:bg-violet-950/30
            border border-violet-200/80 dark:border-violet-800/50
            rounded-2xl px-5 py-3.5">
          <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">
            Combined retail value — {selected.length} service{selected.length > 1 ? 's' : ''}
          </span>
          <span className="text-sm font-black text-violet-900 dark:text-violet-200">
            ₹{totalValue.toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </div>
  );
}
