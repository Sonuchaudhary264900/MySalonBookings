import React, { useState } from 'react';
import { Check, CheckCircle2, Clock, Scissors, Sparkles, Flame, Star, IndianRupee } from 'lucide-react';
import IconSelector, { PkgIcon } from '../MembershipBuilder/IconSelector';

const TAGS = [
  { v: '',            l: 'No Badge',    Icon: null        },
  { v: 'popular',     l: 'Popular',     Icon: Flame       },
  { v: 'recommended', l: 'Recommended', Icon: Star        },
  { v: 'best_value',  l: 'Best Value',  Icon: IndianRupee },
];

const NAME_SUGGESTIONS = [
  'Grooming Combo', 'Bridal Package', 'Groom Special', 'Festival Offer',
  'Hair Care Bundle', 'Complete Makeover', 'Relaxation Package',
  'Express Grooming', 'Premium Spa Bundle', 'VIP Package',
];

export default function Step1Services({ form, onChange, salonServices, onToggle }) {
  const [nameFocus, setNameFocus]           = useState(false);
  const [showDescription, setShowDescription] = useState(!!form.description);

  const selectedNames = new Set(form.services.map(s => s.serviceName));
  const totalDur = form.services.reduce((s, v) => s + (parseInt(v.duration) || 0), 0);

  const nameSuggestions = nameFocus && form.name.length >= 1
    ? NAME_SUGGESTIONS.filter(s =>
        s.toLowerCase().startsWith(form.name.toLowerCase()) && s !== form.name
      ).slice(0, 4)
    : [];

  return (
    <div className="space-y-5 py-2">

      {/* ── Package Identity (compact card) ─────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">

        {/* Icon picker */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Choose Icon
          </p>
          <IconSelector value={form.icon} onChange={(icon) => onChange({ icon })} accent="indigo" />
        </div>

        {/* Name + badge row */}
        <div className="flex gap-3 items-start">
          {/* Name */}
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1.5">
              Package Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <PkgIcon iconKey={form.icon} size={14} className="text-gray-400 dark:text-gray-500" />
              </span>
              <input
                value={form.name}
                onChange={e => onChange({ name: e.target.value })}
                onFocus={() => setNameFocus(true)}
                onBlur={() => setTimeout(() => setNameFocus(false), 150)}
                placeholder="e.g. Grooming Combo"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold
                  bg-white dark:bg-gray-900
                  border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  placeholder:text-gray-400 dark:placeholder:text-gray-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                  transition-all duration-200"
              />
              {/* Autocomplete */}
              {nameSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {nameSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => onChange({ name: s })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Quick name pills (when empty) */}
            {!form.name && (
              <div className="flex flex-wrap gap-1 mt-2">
                {NAME_SUGGESTIONS.slice(0, 5).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange({ name: s })}
                    className="text-[10px] px-2 py-1 rounded-full border border-dashed
                      border-gray-200 dark:border-gray-700
                      text-gray-400 dark:text-gray-500
                      hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400
                      hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                      transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge selector */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Customer Badge
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {TAGS.map(({ v, l, Icon: TagIcon }) => {
              const active = form.tag === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ tag: v })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold
                    transition-all duration-150 active:scale-[0.97]
                    ${active
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                >
                  {TagIcon && <TagIcon size={11} strokeWidth={2} />}
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description (optional, collapsible) */}
        {showDescription ? (
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => onChange({ description: e.target.value })}
              rows={2}
              placeholder="What's included? Who is this for? Make it compelling…"
              className="w-full px-3 py-2.5 rounded-xl border text-xs resize-none
                bg-white dark:bg-gray-900
                border-gray-200 dark:border-gray-700
                text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-600
                focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                transition-all"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            + Add description (optional)
          </button>
        )}
      </div>

      {/* ── Service Selection ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Services to Include</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Tap a card to add or remove from bundle</p>
          </div>
          {form.services.length > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                {form.services.length} selected{totalDur > 0 ? ` · ${totalDur}m` : ''}
              </span>
            </div>
          )}
        </div>

        {salonServices.length === 0 ? (
          <EmptyServices />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {salonServices.map(svc => {
              const isSelected = selectedNames.has(svc.name);
              const isInactive = svc.isActive === false;
              const price = svc.basePrice || svc.price || 0;
              return (
                <ServiceCard
                  key={svc._id || svc.name}
                  svc={svc}
                  isSelected={isSelected}
                  isInactive={isInactive}
                  price={price}
                  onToggle={() => onToggle(svc)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bundle Summary ─────────────────────────────────────── */}
      {form.services.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 p-4">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">
            Bundle Summary
          </p>
          <div className="space-y-1.5">
            {form.services.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {s.serviceName}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">₹{s.price}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-indigo-800/40 text-sm font-black">
              <span className="text-gray-700 dark:text-gray-200">Bundle Total</span>
              <span className="text-indigo-600 dark:text-indigo-400">₹{form.originalPrice || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Service Card ─────────────────────────────────────────────── */
function ServiceCard({ svc, isSelected, isInactive, price, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative text-left p-4 rounded-2xl border w-full
        transition-all duration-200 active:scale-[0.97]
        ${isSelected
          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50/60 dark:from-indigo-950/50 dark:to-violet-950/30 shadow-md shadow-indigo-500/15'
          : isInactive
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 hover:border-indigo-300 dark:hover:border-indigo-700'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:-translate-y-0.5'
        }`}
    >
      {/* Selected check */}
      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center
        transition-all duration-200
        ${isSelected
          ? 'bg-indigo-600 text-white scale-100'
          : 'bg-gray-100 dark:bg-gray-800 text-transparent scale-90 group-hover:scale-100 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
        }`}>
        <Check className="w-3 h-3" />
      </div>

      {/* Category + inactive badge */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {svc.category && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
            ${isSelected
              ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}>
            {svc.category}
          </span>
        )}
        {isInactive && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
            Inactive
          </span>
        )}
      </div>

      <p className={`font-bold text-sm mb-2 pr-6
        ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
        {svc.name}
      </p>

      <div className="flex items-center gap-2.5">
        <span className={`font-bold text-base
          ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
          ₹{price}
        </span>
        {svc.duration && (
          <>
            <span className="w-px h-3.5 bg-gray-200 dark:bg-gray-700" />
            <span className={`flex items-center gap-1 text-xs
              ${isSelected ? 'text-indigo-400 dark:text-indigo-500' : 'text-gray-400 dark:text-gray-500'}`}>
              <Clock className="w-3 h-3" />{svc.duration}m
            </span>
          </>
        )}
      </div>

      {isSelected && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-indigo-500/25 pointer-events-none" />
      )}
    </button>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */
function EmptyServices() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <Scissors className="w-6 h-6 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No services found</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add services on the Services page first</p>
    </div>
  );
}
