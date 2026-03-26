import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Save, AlertTriangle, Search, Check,
  IndianRupee, Clock, ChevronDown, Sparkles, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MALE_CATEGORIES, MALE_OPTIONALS,
  FEMALE_CATEGORIES, FEMALE_OPTIONALS,
  UNISEX_CATEGORIES,
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
  const genderColor = genderCtx === 'male'
    ? active ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/25'   : 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
    : genderCtx === 'female'
    ? active ? 'bg-pink-500 text-white border-pink-500 shadow-pink-500/25'   : 'border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40'
    : active ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-indigo-500/25' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold
        transition-all duration-150 shadow-sm ${genderColor}
        ${active ? 'shadow-md scale-[1.02]' : 'hover:scale-[1.01]'}`}
    >
      {active
        ? <Check className="w-3 h-3 shrink-0" />
        : <span className="w-3 h-3 shrink-0 flex items-center justify-center text-[10px] font-bold opacity-60">+</span>}
      <span>{typeof sub === 'string' ? sub : sub.name}</span>
      {active && active.price > 0 && (
        <span className="opacity-80 font-bold">₹{active.price}</span>
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

/* ─── Category card ──────────────────────────────────────────── */
const CategoryCard = ({
  cat, sel, isExpanded, gender,
  onToggle, onExpand, onToggleSub,
  search,
}) => {
  const count      = sel.subServices.length;
  const isActive   = sel.enabled;

  const filterSubs = (subs) => {
    if (!search) return subs;
    const q = search.toLowerCase();
    return subs.filter(s => (typeof s === 'string' ? s : s).toLowerCase().includes(q));
  };

  const renderChips = (subs, genderCtx = null) =>
    filterSubs(subs).map(sub => {
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
        ? 'border-indigo-200 dark:border-indigo-800/60 shadow-sm shadow-indigo-100/60 dark:shadow-indigo-900/20'
        : 'border-gray-200 dark:border-gray-800'
      }
      bg-white dark:bg-gray-900`}>

      {/* Card header */}
      <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors
        ${isActive ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'bg-white dark:bg-gray-900'}
        ${isActive && isExpanded ? 'border-b border-indigo-100 dark:border-indigo-900/40' : ''}`}>

        <span className="text-xl shrink-0">{cat.icon || '✨'}</span>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${isActive ? 'text-indigo-800 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300'}`}>
            {cat.label}
          </p>
          {count > 0 && (
            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">{count} selected</p>
          )}
        </div>

        {/* Expand toggle */}
        {isActive && (
          <button type="button" onClick={() => onExpand(isExpanded ? null : cat.key)}
            className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
            <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        <Toggle checked={isActive} onChange={() => onToggle(cat.key)} />
      </div>

      {/* Expanded body */}
      {isActive && isExpanded && (
        <div className="px-4 py-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Tap a service to select it → enter price & duration
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
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {renderChips(cat.subServices || [])}
            </div>
          )}

          {/* Selected summary */}
          {sel.subServices.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Check className="w-3 h-3" /> Selected Services
              </p>
              <div className="space-y-1.5">
                {sel.subServices.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl
                    bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    {s.genderContext && (
                      <span className="text-xs shrink-0">{s.genderContext === 'male' ? '👨' : '👩'}</span>
                    )}
                    <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                    <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <IndianRupee className="w-3 h-3" />{s.price}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      <Clock className="w-3 h-3" />{s.duration}m
                    </span>
                    <button type="button"
                      onClick={() => onToggleSub(cat.key, s.name, s.genderContext || null)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 ml-1">
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
  const [gender,        setGender]       = useState(salon?.servedGender || '');
  const [pendingGender, setPendingGender] = useState(null);
  const [loading,       setLoading]      = useState(false);
  const [expandedKey,   setExpandedKey]  = useState(null);
  const [search,        setSearch]       = useState('');
  const [priceModal,    setPriceModal]   = useState(EMPTY_MODAL);
  const priceRef    = useRef(null);
  const durationRef = useRef(null);

  const [maleSelections,   setMaleSelections]   = useState(() => buildSelections(MALE_CATEGORIES,   salon?.offeredCategories));
  const [femaleSelections, setFemaleSelections] = useState(() => buildSelections(FEMALE_CATEGORIES, salon?.offeredCategories));
  const [unisexSelections, setUnisexSelections] = useState(() => buildSelections(UNISEX_CATEGORIES, salon?.offeredCategories));
  const [maleOptionals,    setMaleOptionals]    = useState({ kidsHaircut: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });
  const [femaleOptionals,  setFemaleOptionals]  = useState({ kidsServices: salon?.kidsHaircut || false, atHomeServices: salon?.atHomeServices || false });

  useEffect(() => { if (isOpen && onOpen) onOpen(); }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !salon) return;
    setGender(salon.servedGender || '');
    setMaleSelections(buildSelections(MALE_CATEGORIES,   salon.offeredCategories));
    setFemaleSelections(buildSelections(FEMALE_CATEGORIES, salon.offeredCategories));
    setUnisexSelections(buildSelections(UNISEX_CATEGORIES, salon.offeredCategories));
    setMaleOptionals({ kidsHaircut: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setFemaleOptionals({ kidsServices: salon.kidsHaircut || false, atHomeServices: salon.atHomeServices || false });
    setExpandedKey(null);
    setPendingGender(null);
    setPriceModal(EMPTY_MODAL);
    setSearch('');
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
      offeredCategories = MALE_CATEGORIES.filter(c => maleSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(maleSelections[c.key].subServices) }));
      kidsHaircut = maleOptionals.kidsHaircut; atHomeServices = maleOptionals.atHomeServices;
    } else if (gender === 'female') {
      offeredCategories = FEMALE_CATEGORIES.filter(c => femaleSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(femaleSelections[c.key].subServices) }));
      kidsHaircut = femaleOptionals.kidsServices; atHomeServices = femaleOptionals.atHomeServices;
    } else {
      offeredCategories = UNISEX_CATEGORIES.filter(c => unisexSelections[c.key].enabled)
        .map(c => ({ name: c.label, subServices: toPayload(unisexSelections[c.key].subServices) }));
      kidsHaircut = unisexSelections['kids_services_unisex']?.enabled || false;
      atHomeServices = unisexSelections['at_home_services_unisex']?.enabled || false;
    }
    if (!offeredCategories.length) { toast.error('Please select at least one category'); return; }
    setLoading(true);
    try {
      await updateSalon({ servedGender: gender, offeredCategories, kidsHaircut, atHomeServices });
      toast.success('Service menu saved!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  const currentCats = gender === 'male' ? MALE_CATEGORIES : gender === 'female' ? FEMALE_CATEGORIES : gender === 'unisex' ? UNISEX_CATEGORIES : [];
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center shadow-md shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Service Menu</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure categories, services & pricing</p>
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

            {/* ── Gender toggle pills ── */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Who do you serve?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {GENDER_OPTS.map(({ val, emoji, label, grad, ring }) => {
                  const active = gender === val;
                  return (
                    <button key={val} type="button" onClick={() => handleGenderSelect(val)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 font-semibold text-sm
                        transition-all duration-200
                        ${active
                          ? `bg-gradient-to-br ${grad} text-white border-transparent shadow-lg ring-2 ring-offset-2 ${ring} dark:ring-offset-gray-950 scale-[1.03]`
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}>
                      <span className="text-xl leading-none">{emoji}</span>
                      <span className="text-xs">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Search bar ── */}
            {gender && currentCats.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search services…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm
                    bg-white dark:bg-gray-900
                    border-gray-200 dark:border-gray-700
                    text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                    transition-colors"
                />
              </div>
            )}

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
                      search={search}
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                font-semibold text-sm text-white transition-all duration-200
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                hover:scale-[1.01]">
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
