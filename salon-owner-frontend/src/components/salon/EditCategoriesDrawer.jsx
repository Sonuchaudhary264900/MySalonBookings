import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  X, Save, AlertTriangle, Check,
  IndianRupee, Clock, ChevronDown, Sparkles, Zap, Users, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MALE_CATEGORIES, MALE_OPTIONALS,
  FEMALE_CATEGORIES, FEMALE_OPTIONALS,
  UNISEX_CATEGORIES,
  getCategoriesForSalonType,
} from '../../constants/salonCategories';

/* ─── Helpers ────────────────────────────────────────────────── */
const normalizeSubs = (subs, catLabel = null) => {
  const uniCat    = catLabel ? UNISEX_CATEGORIES.find(u => u.label === catLabel) : null;
  const maleSet   = uniCat ? new Set(uniCat.maleSubServices)   : new Set();
  const femaleSet = uniCat ? new Set(uniCat.femaleSubServices) : new Set();
  return (subs || []).map(s => {
    if (typeof s === 'string') return { name: s, price: '', duration: '' };
    let genderContext = null;
    if (s.applicableFor?.length === 1) {
      genderContext = s.applicableFor[0];
    } else if (!s.applicableFor || s.applicableFor.length === 0) {
      const inMale   = maleSet.has(s.name);
      const inFemale = femaleSet.has(s.name);
      if (inMale && !inFemale)      genderContext = 'male';
      else if (inFemale && !inMale) genderContext = 'female';
    }
    return { name: s.name, price: s.price ?? '', duration: s.duration ?? '', genderContext, ...(s.applicableFor ? { applicableFor: s.applicableFor } : {}) };
  });
};

const buildSelections = (catList, offeredCategories) =>
  catList.reduce((acc, cat) => {
    const found = (offeredCategories || []).find(c => c.name === cat.label);
    acc[cat.key] = { enabled: !!found, subServices: normalizeSubs(found?.subServices, cat.label) };
    return acc;
  }, {});

const EMPTY_MODAL = { open: false, catKey: '', subName: '', price: '', duration: '', genderContext: null };

const PRICE_PRESETS  = [99, 149, 199, 249, 299, 499];
const DUR_PRESETS    = [15, 20, 30, 45, 60, 90];

/* ─── Toggle switch ──────────────────────────────────────────── */
const Toggle = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className={`w-10 h-5 rounded-full transition-colors duration-200
      ${checked ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}
      after:content-[''] after:absolute after:top-0.5 after:left-0.5
      after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow
      after:transition-transform after:duration-200
      ${checked ? 'after:translate-x-5' : 'after:translate-x-0'}`} />
  </label>
);

/* ─── Service chip ───────────────────────────────────────────── */
const ServiceChip = ({ sub, active, onClick, genderCtx }) => {
  const name = typeof sub === 'string' ? sub : sub.name;
  const genderColor = genderCtx === 'male'
    ? active ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'   : 'border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-400 dark:hover:border-blue-600'
    : genderCtx === 'female'
    ? active ? 'bg-pink-500 text-white border-pink-500 shadow-pink-500/30'   : 'border-pink-200 dark:border-pink-800/60 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:border-pink-400 dark:hover:border-pink-600'
    : active ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-indigo-500/30' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold
        transition-all duration-150 ${genderColor}
        ${active ? 'shadow-md scale-[1.02]' : 'hover:scale-[1.015] hover:shadow-sm'}`}
    >
      {active
        ? <Check className="w-3 h-3 shrink-0" />
        : <span className="w-3 h-3 shrink-0 flex items-center justify-center text-[10px] font-bold opacity-50 group-hover:opacity-80 transition-opacity">+</span>}
      <span>{name}</span>
      {active && active.price > 0 && (
        <span className="opacity-75 font-bold text-[10px]">₹{active.price}</span>
      )}
    </button>
  );
};

/* ─── Price modal ────────────────────────────────────────────── */
const PriceModal = ({ modal, onChange, onConfirm, onClose, priceRef, durationRef }) => (
  <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 w-full max-w-sm animate-[scalein_0.2s_ease_both]">
      <style>{`@keyframes scalein{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
        rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Set Price & Duration</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{modal.subName}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Price */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Price (₹) *</label>
            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden
              bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="pl-3.5 pr-2 text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700 py-2.5">
                <IndianRupee className="w-4 h-4" />
              </span>
              <input
                ref={priceRef}
                type="number" min="1"
                placeholder="e.g. 250"
                value={modal.price}
                onChange={e => onChange({ price: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && durationRef.current?.focus()}
                className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            {/* Price presets */}
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map(p => (
                <button key={p} type="button" onClick={() => onChange({ price: String(p) })}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                    modal.price === String(p)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}>
                  ₹{p}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Duration (mins) *</label>
            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden
              bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="pl-3.5 pr-2 text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700 py-2.5">
                <Clock className="w-4 h-4" />
              </span>
              <input
                ref={durationRef}
                type="number" min="1"
                placeholder="e.g. 30"
                value={modal.duration}
                onChange={e => onChange({ duration: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && onConfirm()}
                className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            {/* Duration presets */}
            <div className="flex flex-wrap gap-1.5">
              {DUR_PRESETS.map(d => (
                <button key={d} type="button" onClick={() => onChange({ duration: String(d) })}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                    modal.duration === String(d)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                text-sm font-medium text-gray-600 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Add Service
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Section divider label ──────────────────────────────────── */
const SectionLabel = ({ label }) => (
  <div className="flex items-center gap-2.5 py-0.5">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600 shrink-0 px-1">
      {label}
    </span>
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
  </div>
);

/* ─── Category card ──────────────────────────────────────────── */
const CategoryCard = ({
  cat, sel, isExpanded, gender,
  onToggle, onExpand, onToggleSub,
}) => {
  const count    = sel.subServices.length;
  const isActive = sel.enabled;
  const totalServices = cat.sections
    ? cat.sections.reduce((n, s) => n + s.services.length, 0)
    : (cat.subServices || []).length;

  const renderChips = (subs, genderCtx = null) =>
    subs.map(sub => {
      const name = typeof sub === 'string' ? sub : sub;
      const active = genderCtx
        ? sel.subServices.find(s => s.name === name && s.genderContext === genderCtx)
        : sel.subServices.find(s => s.name === name);
      return (
        <ServiceChip
          key={`${name}-${genderCtx || 'both'}`}
          sub={name}
          active={active}
          genderCtx={genderCtx}
          onClick={() => onToggleSub(cat.key, name, genderCtx)}
        />
      );
    });

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${isActive
        ? 'border-indigo-200 dark:border-indigo-800/60 shadow-md shadow-indigo-100/50 dark:shadow-indigo-900/30'
        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }
      bg-white dark:bg-gray-900`}>

      {/* Card header */}
      <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer
        ${isActive ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/40 dark:from-indigo-950/25 dark:to-violet-950/10' : 'bg-white dark:bg-gray-900'}
        ${isActive && isExpanded ? 'border-b border-indigo-100 dark:border-indigo-900/40' : ''}`}
        onClick={() => isActive && onExpand(isExpanded ? null : cat.key)}>

        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all
          ${isActive
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25'
            : 'bg-gray-100 dark:bg-gray-800'
          }`}>
          <span className={isActive ? 'filter drop-shadow-sm' : ''}>{cat.icon || '✨'}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {cat.label}
          </p>
          {isActive ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              {count > 0 ? (
                <>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{count} selected</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600">/ {totalServices}</span>
                </>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">{totalServices} services available</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{totalServices} services</p>
          )}
        </div>

        {/* Expand chevron */}
        {isActive && (
          <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
        )}

        <div onClick={e => e.stopPropagation()}>
          <Toggle checked={isActive} onChange={() => onToggle(cat.key)} />
        </div>
      </div>

      {/* Expanded body */}
      {isActive && isExpanded && (
        <div className="px-4 pt-3 pb-4 space-y-3 bg-gray-50/60 dark:bg-gray-800/20">
          <p className="text-[10px] text-gray-400 dark:text-gray-600 font-medium tracking-wide">
            Tap to select · enter price & duration
          </p>

          {/* Unisex gender split */}
          {gender === 'unisex' && cat.maleSubServices ? (
            <div className="space-y-4">
              {cat.maleSubServices.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                    <span>👨</span> Men
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {renderChips(cat.maleSubServices, 'male')}
                  </div>
                </div>
              )}
              {cat.femaleSubServices.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-1.5">
                    <span>👩</span> Women
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {renderChips(cat.femaleSubServices, 'female')}
                  </div>
                </div>
              )}
            </div>
          ) : cat.sections ? (
            /* ── Sectioned layout ── */
            <div className="space-y-3">
              {cat.sections.map((section, idx) => (
                <div key={section.label}>
                  {idx > 0 && <div className="pt-1" />}
                  <SectionLabel label={section.label} />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {renderChips(section.services)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {renderChips(cat.subServices || [])}
            </div>
          )}

          {/* Selected summary */}
          {sel.subServices.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700/60 pt-3 mt-1">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Check className="w-3 h-3" /> {sel.subServices.length} Service{sel.subServices.length !== 1 ? 's' : ''} Added
              </p>
              <div className="space-y-1.5">
                {sel.subServices.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-white dark:bg-gray-900 border border-indigo-100/80 dark:border-indigo-900/30
                    shadow-sm">
                    {s.genderContext && (
                      <span className="text-xs shrink-0">{s.genderContext === 'male' ? '👨' : '👩'}</span>
                    )}
                    <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                    <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <IndianRupee className="w-3 h-3" />{s.price}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-1">
                      <Clock className="w-3 h-3" />{s.duration}m
                    </span>
                    <button type="button"
                      onClick={() => onToggleSub(cat.key, s.name, s.genderContext || null)}
                      className="text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 ml-1 p-0.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Main Drawer ────────────────────────────────────────────── */
const EditCategoriesDrawer = ({ isOpen, onClose, onOpen, salon, updateSalon }) => {
  // Read salonType from salon record, fallback to owner profile (for legacy salons registered before salonType field was added)
  const { user } = useContext(AuthContext);
  const salonType    = salon?.salonType || user?.salonType || 'salon';
  const isBarberShop = salonType === 'barbershop';

  // Build per-gender cat lists based on salonType
  const maleCatList   = getCategoriesForSalonType(salonType, 'male');
  const femaleCatList = getCategoriesForSalonType(salonType, 'female');
  const unisexCatList = getCategoriesForSalonType(salonType, 'unisex');

  const [gender,          setGender]          = useState(isBarberShop ? 'male' : (salon?.servedGender || ''));
  const [pendingGender,   setPendingGender]   = useState(null);
  const [genderModalOpen, setGenderModalOpen] = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [expandedKey,   setExpandedKey]  = useState(null);
  const [priceModal,    setPriceModal]   = useState(EMPTY_MODAL);
  const priceRef    = useRef(null);
  const durationRef = useRef(null);

  const [maleSelections,   setMaleSelections]   = useState(() => buildSelections(maleCatList,   salon?.offeredCategories));
  const [femaleSelections, setFemaleSelections] = useState(() => buildSelections(femaleCatList, salon?.offeredCategories));
  const [unisexSelections, setUnisexSelections] = useState(() => buildSelections(unisexCatList, salon?.offeredCategories));
  const [maleOptionals,    setMaleOptionals]    = useState({ kidsHaircut: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });
  const [femaleOptionals,  setFemaleOptionals]  = useState({ kidsServices: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });

  useEffect(() => { if (isOpen && onOpen) onOpen(); }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !salon) return;
    const type     = salon.salonType || user?.salonType || 'salon';
    const isBarber = type === 'barbershop';
    setGender(isBarber ? 'male' : (salon.servedGender || ''));
    setMaleSelections(buildSelections(getCategoriesForSalonType(type, 'male'),   salon.offeredCategories));
    setFemaleSelections(buildSelections(getCategoriesForSalonType(type, 'female'), salon.offeredCategories));
    setUnisexSelections(buildSelections(getCategoriesForSalonType(type, 'unisex'), salon.offeredCategories));
    setMaleOptionals({ kidsHaircut: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setFemaleOptionals({ kidsServices: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setExpandedKey(null);
    setPendingGender(null);
    setPriceModal(EMPTY_MODAL);
  }, [isOpen, salon]);

  const getSels = () => gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : unisexSelections;
  const setSels = (update) => {
    if (gender === 'male')        setMaleSelections(update);
    else if (gender === 'female') setFemaleSelections(update);
    else                          setUnisexSelections(update);
  };

  const toggleCat = (key) => {
    setSels(prev => {
      const enabling = !prev[key].enabled;
      if (enabling) setExpandedKey(key);
      else if (expandedKey === key) setExpandedKey(null);
      return { ...prev, [key]: { ...prev[key], enabled: enabling } };
    });
  };

  const toggleSub = (catKey, sub, genderContext = null) => {
    const subs  = getSels()[catKey].subServices;
    const exists = genderContext
      ? subs.find(s => s.name === sub && s.genderContext === genderContext)
      : subs.find(s => s.name === sub);
    if (exists) {
      setSels(prev => ({
        ...prev,
        [catKey]: {
          ...prev[catKey],
          subServices: genderContext
            ? subs.filter(s => !(s.name === sub && s.genderContext === genderContext))
            : subs.filter(s => s.name !== sub),
        },
      }));
    } else {
      setPriceModal({ open: true, catKey, subName: sub, price: '', duration: '', genderContext });
      setTimeout(() => priceRef.current?.focus(), 80);
    }
  };

  const confirmSubPrice = () => {
    const { catKey, subName, price, duration, genderContext } = priceModal;
    if (!price || parseFloat(price) <= 0) { toast.error('Please enter a valid price'); priceRef.current?.focus(); return; }
    if (!duration || parseInt(duration) <= 0) { toast.error('Please enter a valid duration'); durationRef.current?.focus(); return; }
    const applicableFor = genderContext === 'male' ? ['male'] : genderContext === 'female' ? ['female'] : null;
    setSels(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        subServices: [
          ...prev[catKey].subServices,
          { name: subName, price, duration, genderContext, ...(applicableFor ? { applicableFor } : {}) },
        ],
      },
    }));
    toast.success(`${subName} added!`, { duration: 1500 });
    setPriceModal(EMPTY_MODAL);
  };

  const handleGenderSelect = (val) => {
    if (val === gender) return;
    const sels = gender === 'male' ? maleSelections : gender === 'female' ? femaleSelections : unisexSelections;
    const hasData = Object.values(sels).some(s => s.enabled);
    if (hasData) { setPendingGender(val); }
    else { setGender(val); setExpandedKey(null); }
  };

  const handleSave = async () => {
    if (!gender) { toast.error('Please select a customer type'); return; }
    let offeredCategories = [];
    let kidsHaircut = false;
    let atHomeServices = false;
    const toPayload = (subs) => subs.map(s => ({
      name: s.name, price: parseFloat(s.price) || 0, duration: parseInt(s.duration) || 0,
      ...(s.applicableFor ? { applicableFor: s.applicableFor } : {}),
    }));
    if (gender === 'male') {
      offeredCategories = maleCatList.filter(c => maleSelections[c.key]?.enabled)
        .map(c => ({ name: c.label, subServices: toPayload(maleSelections[c.key].subServices) }));
      kidsHaircut = maleOptionals.kidsHaircut; atHomeServices = maleOptionals.atHomeServices;
    } else if (gender === 'female') {
      offeredCategories = femaleCatList.filter(c => femaleSelections[c.key]?.enabled)
        .map(c => ({ name: c.label, subServices: toPayload(femaleSelections[c.key].subServices) }));
      kidsHaircut = femaleOptionals.kidsServices; atHomeServices = femaleOptionals.atHomeServices;
    } else {
      offeredCategories = unisexCatList.filter(c => unisexSelections[c.key]?.enabled)
        .map(c => ({ name: c.label, subServices: toPayload(unisexSelections[c.key].subServices) }));
      kidsHaircut = unisexSelections['kids_services_unisex']?.enabled || false;
      atHomeServices = unisexSelections['at_home_services_unisex']?.enabled || false;
    }
    if (!offeredCategories.length) { toast.error('Please select at least one category'); return; }
    setLoading(true);
    try {
      await updateSalon({ salonType, servedGender: gender, offeredCategories, kidsHaircut, atHomeServices });
      toast.success('Service menu saved!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  const currentCats = gender ? getCategoriesForSalonType(salonType, gender) : [];
  const currentSels = getSels();

  const totalSelected = useMemo(() =>
    Object.values(currentSels).reduce((n, s) => n + s.subServices.length, 0),
    [currentSels]
  );

  const GENDER_OPTS = [
    { val: 'male',   emoji: '👨', label: 'Male',   grad: 'from-blue-600 to-indigo-600',  ring: 'ring-blue-400'  },
    { val: 'female', emoji: '👩', label: 'Female',  grad: 'from-pink-500 to-rose-500',    ring: 'ring-pink-400'  },
    { val: 'unisex', emoji: '👥', label: 'Unisex',  grad: 'from-indigo-600 to-violet-600', ring: 'ring-indigo-400' },
  ];

  const currentOptionals = gender === 'male' ? MALE_OPTIONALS : gender === 'female' ? FEMALE_OPTIONALS : [];
  const currentOptState  = gender === 'male' ? maleOptionals : gender === 'female' ? femaleOptionals : {};
  const setCurrentOpt    = gender === 'male' ? setMaleOptionals : gender === 'female' ? setFemaleOptionals : () => {};

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col
        animate-[slidein_0.28s_cubic-bezier(0.16,1,0.3,1)_both]">
        <style>{`@keyframes slidein{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div className="flex flex-col h-full rounded-l-3xl overflow-hidden shadow-2xl
          bg-white dark:bg-gray-950
          border-l border-t border-b border-gray-200 dark:border-gray-800">

          {/* ── Header ── */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800
            bg-white dark:bg-gray-950">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 text-base
                  ${isBarberShop
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
                  {isBarberShop ? '💈' : <Sparkles className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {isBarberShop ? 'Barbershop Menu' : 'Service Menu'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isBarberShop ? 'Full men\'s services & pricing' : 'Configure categories, services & pricing'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800
                  text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200
                  transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total badge */}
            {totalSelected > 0 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl
                bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <Check className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  {totalSelected} service{totalSelected !== 1 ? 's' : ''} selected
                </span>
              </div>
            )}
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5
            scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">

            {/* ── Who Do You Serve / Barbershop badge ── */}
            {isBarberShop ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2
                border-blue-200 dark:border-blue-800/70
                bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 text-lg">
                  💈
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest leading-none mb-0.5">Barbershop</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Full Men's Services</p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wide shrink-0">
                  MEN
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setGenderModalOpen(true)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border-2
                  transition-all duration-200 text-left
                  border-indigo-200 dark:border-indigo-800
                  bg-indigo-50 dark:bg-indigo-950/40
                  hover:border-indigo-400 dark:hover:border-indigo-600
                  hover:bg-indigo-100 dark:hover:bg-indigo-950/70
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider leading-none mb-0.5">Who do you serve?</p>
                    {gender ? (
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                        {GENDER_OPTS.find(g => g.val === gender)?.emoji}{' '}
                        {GENDER_OPTS.find(g => g.val === gender)?.label} customers
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Tap to select…</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 dark:text-indigo-500 shrink-0" />
              </button>
            )}

            {/* ── Search bar ── */}
            {/* ── Category cards ── */}
            {gender && currentCats.length > 0 && (
              <div className="space-y-2">
                {currentCats.map(cat => {
                  const sel = currentSels[cat.key] || { enabled: false, subServices: [] };
                  const isExpanded = expandedKey === cat.key && sel.enabled;
                  return (
                    <CategoryCard
                      key={cat.key}
                      cat={cat}
                      sel={sel}
                      isExpanded={isExpanded}
                      gender={gender}
                      onToggle={toggleCat}
                      onExpand={setExpandedKey}
                      onToggleSub={toggleSub}
                    />
                  );
                })}

                {/* Optional add-ons */}
                {(gender === 'male' || gender === 'female') && currentOptionals.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider px-1 mb-2">
                      Optional Add-ons
                    </p>
                    <div className="space-y-2">
                      {currentOptionals.map(opt => (
                        <div key={opt.key} className="flex items-center justify-between px-4 py-3 rounded-2xl
                          bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <span className="text-lg">{opt.icon}</span>
                            {opt.label}
                          </div>
                          <Toggle
                            checked={currentOptState[opt.key] || false}
                            onChange={e => setCurrentOpt(p => ({ ...p, [opt.key]: e.target.checked }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state when no gender selected */}
            {!gender && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-indigo-400 dark:text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Select customer type</p>
                <p className="text-xs text-gray-400 dark:text-gray-600">Choose who your salon serves to configure the right service categories</p>
              </div>
            )}
          </div>

          {/* ── Sticky footer ── */}
          <div className="shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800
            bg-white dark:bg-gray-950">
            <button type="button" onClick={handleSave} disabled={loading || !gender}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                font-semibold text-sm text-white transition-all duration-200
                ${isBarberShop
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                hover:scale-[1.01]`}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Service Menu</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Gender change confirm ── */}
      {pendingGender && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPendingGender(null)} />
          <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
            rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4
            animate-[scalein_0.2s_ease_both]">
            <style>{`@keyframes scalein{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:none}}`}</style>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Change customer type?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You have categories configured for{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200 capitalize">{gender}</span> customers.
                  Switching to{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200 capitalize">{pendingGender}</span> will
                  replace all saved categories when you save.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPendingGender(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                  text-sm font-medium text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Keep Current
              </button>
              <button type="button"
                onClick={() => { setGender(pendingGender); setExpandedKey(null); setPendingGender(null); }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                Yes, Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gender selection modal ── */}
      {genderModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGenderModalOpen(false)} />
          <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
            rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4
            animate-[scalein_0.2s_ease_both]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Who do you serve?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select the type of clients your salon caters to</p>
              </div>
              <button type="button" onClick={() => setGenderModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800
                  text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {GENDER_OPTS.map(({ val, emoji, label, grad, ring }) => {
                const isSelected = gender === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { handleGenderSelect(val); setGenderModalOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left
                      transition-all duration-150 focus:outline-none focus:ring-2 ${ring}
                      ${isSelected
                        ? `bg-gradient-to-r ${grad} border-transparent shadow-lg`
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                  >
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {label} customers
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-white/75' : 'text-gray-400 dark:text-gray-500'}`}>
                        {val === 'male'   ? 'Men-only salon services'
                          : val === 'female' ? 'Women-only salon services'
                          : 'Services for all genders'}
                      </p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Price modal ── */}
      {priceModal.open && (
        <PriceModal
          modal={priceModal}
          onChange={patch => setPriceModal(p => ({ ...p, ...patch }))}
          onConfirm={confirmSubPrice}
          onClose={() => setPriceModal(EMPTY_MODAL)}
          priceRef={priceRef}
          durationRef={durationRef}
        />
      )}
    </>
  );
};

export default EditCategoriesDrawer;
