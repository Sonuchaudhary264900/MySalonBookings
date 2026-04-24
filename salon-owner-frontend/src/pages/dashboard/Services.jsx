import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, LayoutList, ChevronDown, Scissors, Search,
  Layers, CheckCircle2, XCircle, Sparkles, Baby, Home, User, UserRound,
  TrendingUp, X, Pencil, Loader2, SlidersHorizontal,
  LayoutGrid, Camera, ChevronRight, Clock, AlertTriangle, Undo2,
  IndianRupee, Users, Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import ServiceCard from '../../components/Services/ServiceCard';
import ServiceModal from '../../components/Services/ServiceModal';
import EditCategoriesDrawer from '../../components/salon/EditCategoriesDrawer';
import CategoryIcon from '../../components/common/CategoryIcon';
import { useSalon } from '../../hooks/useSalon';
import { uploadServicePhoto } from '../../services/salonService';
import {
  UNISEX_CATEGORIES,
  CATEGORY_CARD_IMAGE_MAP,
  ALL_CATEGORY_ORDER,
  MALE_ONLY_CAT_LABELS,
  FEMALE_ONLY_CAT_LABELS,
  getCategoriesForSalonType,
  SALON_MALE_CATEGORIES,
  SALON_FEMALE_CATEGORIES,
} from '../../constants/salonCategories';

const BUSINESS_LABEL = {
  barbershop:    'Barbershop',
  makeup_bridal: 'Makeup & Bridal Studio',
  spa_wellness:  'Spa & Wellness',
  skin_derma:    'Skin Clinic',
  salon:         'Salon',
};
const getBusinessLabel = (type) => BUSINESS_LABEL[type] || 'Salon';

/* ─── Resolve category image ─────────────────────────────────────── */
const getCatImg = (label, salon) => {
  const saved = salon?.categoryImages;
  if (saved) {
    const custom = saved instanceof Map ? saved.get(label) : saved[label];
    if (custom) return custom;
  }
  return CATEGORY_CARD_IMAGE_MAP[label] || null;
};

/* ─── Resolve sub-circle image ───────────────────────────────────── */
const getSubImg = (catLabel, subLabel, salon, services) => {
  const key = `${catLabel}::${subLabel}`;
  const saved = salon?.categoryImages;
  if (saved) {
    const custom = saved instanceof Map ? saved.get(key) : saved[key];
    if (custom) return custom;
  }
  const svc = services?.find(s => s.name === subLabel && s.photo);
  if (svc?.photo) return svc.photo;
  return null;
};

/* ─── Skeleton card ──────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-[#1a1a2e] dark:bg-gray-900 border border-gray-700/40 rounded-2xl overflow-hidden animate-pulse">
    <div className="w-full bg-gray-800" style={{ aspectRatio: '4/3' }} />
    <div className="px-3 pt-2.5 pb-3 space-y-2">
      <div className="h-4 w-3/4 bg-gray-700 rounded-lg" />
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="h-3 w-12 bg-gray-700 rounded-lg" />
          <div className="h-3 w-16 bg-gray-700 rounded-lg" />
        </div>
        <div className="h-5 w-9 bg-gray-700 rounded-full" />
      </div>
    </div>
  </div>
);

/* ─── Empty State ────────────────────────────────────────────────── */
const EmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 animate-[fadeup_0.4s_ease_both]">
    <style>{`@keyframes fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 scale-150 blur-2xl" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950 flex items-center justify-center shadow-inner">
        <Scissors className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No services added yet</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8">
      Start by adding the services your business offers to attract customers and enable bookings.
    </p>
    <button onClick={onAdd}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
        bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
        text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200">
      <Plus className="w-4 h-4" /> Add Your First Service
    </button>
  </div>
);

/* ─── Stats bar ──────────────────────────────────────────────────── */
const StatsBar = ({ total, active, inactive }) => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { label: 'Total',    value: total,    icon: Layers,       cls: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-950/50'   },
      { label: 'Active',   value: active,   icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50'  },
      { label: 'Inactive', value: inactive, icon: XCircle,      cls: 'text-gray-400 dark:text-gray-500',       bg: 'bg-gray-100 dark:bg-gray-800'          },
    ].map(({ label, value, icon: Icon, cls, bg }) => (
      <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className={`w-4.5 h-4.5 ${cls}`} />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Service Menu Section (unchanged) ──────────────────────────── */
const ServiceMenuSection = ({ salon }) => {
  const [expanded, setExpanded] = useState(null);
  const [expandedSection, setExpandedSection] = useState({});
  const [expandedSubSection, setExpandedSubSection] = useState({});
  const isSalon = salon?.businessType === 'salon';
  const catDefs = isSalon ? getCategoriesForSalonType(salon.businessType, salon.servedGender) : [];

  if (!salon?.offeredCategories?.length) return null;

  const isUnisex = salon.servedGender === 'unisex';
  const sortedCategories = [...salon.offeredCategories].sort((a, b) => {
    const ai = ALL_CATEGORY_ORDER.indexOf(a.name), bi = ALL_CATEGORY_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });

  const Chip = ({ sub, catName }) => {
    const name  = typeof sub === 'string' ? sub : sub.name;
    const price = typeof sub === 'string' ? null : sub.price;
    const img   = (typeof sub === 'object' ? sub.photo : null) || (catName ? getCatImg(catName, salon) : null);
    return (
      <span className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full flex items-center gap-1.5 font-medium">
        {img && <span className="w-4 h-4 rounded-full overflow-hidden shrink-0"><img src={img} alt="" className="w-full h-full object-cover" /></span>}
        {name}
        {price > 0 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{price}</span>}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" /> Service Menu
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Serves <span className="capitalize font-medium text-gray-700 dark:text-gray-300">{salon.servedGender}</span> customers
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {salon.kidsHaircut && (
            <span className="text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Baby className="w-3 h-3" /> Kids
            </span>
          )}
          {salon.atHomeServices && (
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Home className="w-3 h-3" /> At-Home
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {sortedCategories.map((cat, idx) => {
          const subs = cat.subServices || [];
          const isOpen = expanded === idx;
          const isMaleOnly   = MALE_ONLY_CAT_LABELS.has(cat.name);
          const isFemaleOnly = FEMALE_ONLY_CAT_LABELS.has(cat.name);
          const showSplit = isUnisex && !isMaleOnly && !isFemaleOnly;
          const uniCat   = UNISEX_CATEGORIES.find(u => u.label === cat.name);
          const uniMaleSet   = uniCat ? new Set(uniCat.maleSubServices)   : new Set();
          const uniFemaleSet = uniCat ? new Set(uniCat.femaleSubServices) : new Set();
          const classifyGenders = (s) => {
            const name = typeof s === 'string' ? s : s.name;
            const af   = (typeof s === 'object' && s.applicableFor) || [];
            if (af.includes('male') && af.includes('female')) return ['male', 'female'];
            if (af.includes('male'))   return ['male'];
            if (af.includes('female')) return ['female'];
            if (uniMaleSet.has(name) && !uniFemaleSet.has(name)) return ['male'];
            if (uniFemaleSet.has(name) && !uniMaleSet.has(name)) return ['female'];
            return ['male', 'female'];
          };
          const menSubs   = showSplit ? subs.filter(s => classifyGenders(s).includes('male'))   : [];
          const womenSubs = showSplit ? subs.filter(s => classifyGenders(s).includes('female')) : [];

          return (
            <div key={idx}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : idx)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {getCatImg(cat.name, salon) ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                    <img src={getCatImg(cat.name, salon)} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                    <CategoryIcon label={cat.name} className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                )}
                <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                {isUnisex && isMaleOnly   && <span className="text-xs text-blue-500 font-medium flex items-center gap-0.5"><User className="w-3 h-3" /> Male</span>}
                {isUnisex && isFemaleOnly && <span className="text-xs text-pink-500 font-medium flex items-center gap-0.5"><UserRound className="w-3 h-3" /> Female</span>}
                <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">{subs.length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 bg-gray-50/50 dark:bg-gray-800/30">
                  {subs.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-600 py-2">No sub-services selected</p>
                  ) : isSalon ? (() => {
                    const catDef = catDefs.find(d => d.label === cat.name);
                    const sectionDefs = catDef?.sections || [];
                    const sectionSubs = sectionDefs.map(sec => ({
                      label: sec.label,
                      subs: subs.filter(s => { const name = typeof s === 'string' ? s : s.name; return sec.services.includes(name); }),
                    })).filter(sec => sec.subs.length > 0);
                    if (!sectionSubs.length) return <div className="flex flex-wrap gap-1.5">{subs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div>;
                    return (
                      <div className="space-y-1.5">
                        {sectionSubs.map((sec, si) => {
                          const secKey = `${idx}-${si}`;
                          const isSecOpen = !!expandedSection[secKey];
                          const isMaleSec   = sec.label === 'Men';
                          const isFemaleSec = sec.label === 'Female';
                          const btnCls   = isMaleSec ? 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30' : isFemaleSec ? 'bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-900/30' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50';
                          const labelCls = isMaleSec ? 'text-blue-600 dark:text-blue-400' : isFemaleSec ? 'text-pink-600 dark:text-pink-400' : 'text-indigo-600 dark:text-indigo-400';
                          const chevCls  = isMaleSec ? 'text-blue-400' : isFemaleSec ? 'text-pink-400' : 'text-indigo-400';
                          const displayLabel = isMaleSec ? 'Male' : isFemaleSec ? 'Female' : sec.label;
                          const DisplayIcon  = isMaleSec ? User : isFemaleSec ? UserRound : null;
                          const genderCatDefs = isMaleSec ? SALON_MALE_CATEGORIES : isFemaleSec ? SALON_FEMALE_CATEGORIES : null;
                          const genderCatDef  = genderCatDefs ? genderCatDefs.find(d => d.label === cat.name) : null;
                          const subSectionDefs = genderCatDef?.sections || [];
                          const subSectionSubs = subSectionDefs.map(subSec => ({
                            label: subSec.label,
                            subs: sec.subs.filter(s => { const name = typeof s === 'string' ? s : s.name; return subSec.services.includes(name); }),
                          })).filter(ss => ss.subs.length > 0);
                          return (
                            <div key={si}>
                              <button type="button" onClick={() => setExpandedSection(prev => ({ ...prev, [secKey]: !prev[secKey] }))}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${btnCls}`}>
                                <span className={`text-xs font-semibold ${labelCls} flex items-center gap-1`}>
                                  {DisplayIcon && <DisplayIcon className="w-3 h-3" />}{displayLabel}
                                </span>
                                <span className={`text-xs ${chevCls} ml-1`}>({sec.subs.length})</span>
                                <ChevronDown className={`w-3 h-3 ${chevCls} ml-auto transition-transform duration-200 ${isSecOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isSecOpen && (
                                <div className="mt-1.5 pl-2 space-y-1">
                                  {subSectionSubs.length > 0 ? subSectionSubs.map((subSec, ssi) => {
                                    const subKey = `${secKey}-${ssi}`;
                                    const isSubOpen = !!expandedSubSection[subKey];
                                    return (
                                      <div key={ssi}>
                                        <button type="button" onClick={() => setExpandedSubSection(prev => ({ ...prev, [subKey]: !prev[subKey] }))}
                                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{subSec.label}</span>
                                          <span className="text-xs text-indigo-400 ml-1">({subSec.subs.length})</span>
                                          <ChevronDown className={`w-3 h-3 text-indigo-400 ml-auto transition-transform duration-200 ${isSubOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSubOpen && (
                                          <div className="flex flex-wrap gap-1.5 mt-1.5 px-1 pb-1">
                                            {subSec.subs.map((s,i) => <Chip key={i} sub={s} catName={cat.name} />)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }) : (
                                    <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                                      {sec.subs.map((s,i) => <Chip key={i} sub={s} catName={cat.name} />)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : showSplit ? (
                    <div className="space-y-3">
                      {menSubs.length > 0 && <div><p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">Male</p><div className="flex flex-wrap gap-1.5">{menSubs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div></div>}
                      {womenSubs.length > 0 && <div><p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1.5">Female</p><div className="flex flex-wrap gap-1.5">{womenSubs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div></div>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">{subs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Catalog placeholder card (service not yet added) ──────────── */
const CatalogCard = ({ name, onAdd }) => (
  <div className="relative rounded-2xl overflow-hidden flex flex-col
    bg-[#1a1a2e] dark:bg-gray-900 border border-dashed border-gray-700/50
    hover:border-indigo-500/60 transition-all duration-150 group cursor-pointer"
    onClick={onAdd}>
    <div className="w-full flex items-center justify-center bg-gray-800/50
      group-hover:bg-indigo-900/20 transition-colors" style={{ aspectRatio: '4/3' }}>
      <Plus className="w-8 h-8 text-gray-600 group-hover:text-indigo-400 transition-colors" />
    </div>
    <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-gray-400 group-hover:text-gray-300 line-clamp-1 transition-colors">
        {name}
      </p>
      <span className="text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
        + Add Service
      </span>
    </div>
  </div>
);

/* ─── Filter + Sort buttons ─────────────────────────────────────── */
const FilterButton = () => (
  <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium shrink-0
    border border-gray-200 dark:border-gray-700
    bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300
    hover:border-indigo-300 dark:hover:border-indigo-700
    hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-150">
    <SlidersHorizontal className="w-4 h-4" />
    <span className="hidden sm:inline">Filter</span>
    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
  </button>
);

/* ─── Circle Button (user-frontend style, 54px) ─────────────────── */
const CircleButton = ({ label, imgSrc, isSelected, isUploading, onSelect, onImageChange, showEdit, isAll, btnRef }) => {
  const [pressed,       setPressed]       = React.useState(false);
  const [hovered,       setHovered]       = React.useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = React.useState(false);
  const [popupPos,      setPopupPos]      = React.useState(null);
  const selfRef       = React.useRef(null);
  const portalRef     = React.useRef(null);
  const timerRef      = React.useRef(null);
  const longFiredRef  = React.useRef(false);
  const touchOrigin   = React.useRef({ x: 0, y: 0 });
  const fileInputRef  = React.useRef(null);

  const setRef = React.useCallback(el => {
    selfRef.current = el;
    if (typeof btnRef === 'function') btnRef(el);
  }, [btnRef]);

  const clearTimer = () => clearTimeout(timerRef.current);

  // ── Long-press detection ──────────────────────────────────────
  const startPress = (e) => {
    longFiredRef.current = false;
    setPressed(true);
    if (e.touches) {
      touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (!showEdit || !onImageChange || isAll) return;
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true;
      setPressed(false);
      if (selfRef.current) {
        const r = selfRef.current.getBoundingClientRect();
        setPopupPos({ x: r.left + r.width / 2, y: r.bottom + 8 });
      }
      setShowPhotoMenu(true);
    }, 600);
  };

  const handleTouchMove = (e) => {
    // Only cancel if finger moved > 10px — allows micro-wobble without breaking hold
    const dx = Math.abs(e.touches[0].clientX - touchOrigin.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchOrigin.current.y);
    if (dx > 10 || dy > 10) { clearTimer(); setPressed(false); }
  };

  const endPress = () => { clearTimer(); setPressed(false); };

  const handleClick = () => {
    if (longFiredRef.current) { longFiredRef.current = false; return; }
    onSelect();
    requestAnimationFrame(() => {
      selfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  };

  // Close photo menu when clicking outside — delay attachment to avoid
  // the same touch event that opened the menu from immediately closing it
  React.useEffect(() => {
    if (!showPhotoMenu) return;
    let id;
    const close = (e) => {
      if (!selfRef.current?.contains(e.target) && !portalRef.current?.contains(e.target)) {
        setShowPhotoMenu(false);
        setPopupPos(null);
      }
    };
    id = setTimeout(() => {
      document.addEventListener('mousedown', close);
      document.addEventListener('touchstart', close);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showPhotoMenu]);

  const getTransform = () => {
    if (isSelected) return 'translateY(-6px) scale(1.05)';
    if (pressed)    return 'scale(0.95)';
    if (hovered)    return 'scale(1.03)';
    return 'translateY(0px) scale(1)';
  };

  const [imgBroken, setImgBroken] = React.useState(false);
  const showImg = !isAll && !!imgSrc && !imgBroken;

  const circleStyle = {
    width: 54, height: 54, borderRadius: '50%', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    position: 'relative',
    background: showImg ? '#111' : isSelected
      ? 'linear-gradient(145deg,#818cf8 0%,#6366f1 40%,#4f46e5 100%)'
      : 'rgba(26,26,46,0.9)',
    // Use box-shadow for ring — outline gets clipped by overflow:auto on parent
    boxShadow: isSelected
      ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28), 0 8px 24px rgba(99,102,241,0.45)'
      : '0 0 0 1.5px rgba(255,255,255,0.09)',
    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <div
      ref={setRef}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        cursor: 'pointer', flexShrink: 0, padding: '0 8px',
        overflow: 'visible',
        opacity: isSelected || hovered ? 1 : 0.65,
        transform: getTransform(),
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); endPress(); }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={handleTouchMove}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Circle */}
      <div style={circleStyle}>
        {isAll ? (
          <LayoutGrid style={{ width: 22, height: 22, color: '#fff' }} />
        ) : showImg ? (
          <img
            src={imgSrc} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div style={{ color: isSelected ? '#fff' : '#6366f1', display: 'flex' }}>
            <CategoryIcon label={label} className="w-[22px] h-[22px]" />
          </div>
        )}

        {isUploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 style={{ width: 16, height: 16, color: '#fff' }} className="animate-spin" />
          </div>
        )}
      </div>

      {/* Accent bar — only when selected */}
      <div style={{
        width: 20, height: 3, borderRadius: 999,
        background: isSelected ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent',
        boxShadow: isSelected ? '0 0 8px rgba(99,102,241,0.8)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        marginTop: -2,
      }} />

      {/* Label */}
      <span style={{
        fontSize: 11, fontWeight: isSelected ? 700 : 500,
        whiteSpace: 'nowrap', maxWidth: 72, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
        color: isSelected ? '#fff' : 'rgba(156,163,175,1)',
        transition: 'color 0.22s ease',
      }}>
        {label}
      </span>

      {/* Long-press photo menu — rendered via portal to escape overflow:auto clipping */}
      {showPhotoMenu && showEdit && onImageChange && popupPos && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed', top: popupPos.y, left: popupPos.x,
            transform: 'translateX(-50%)',
            zIndex: 9999, minWidth: 140,
            background: '#1e1e36',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden',
            animation: 'scaleIn 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`@keyframes scaleIn{from{opacity:0;transform:translateX(-50%) scale(0.85)}to{opacity:1;transform:translateX(-50%) scale(1)}}`}</style>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', cursor: 'pointer',
              color: '#e0e0ff', fontSize: 13, fontWeight: 600,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Camera style={{ width: 14, height: 14, color: '#818cf8', flexShrink: 0 }} />
            Change photo
            <input
              ref={fileInputRef}
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onImageChange(label, f);
                e.target.value = '';
                setShowPhotoMenu(false);
                setPopupPos(null);
              }}
            />
          </label>
        </div>,
        document.body
      )}
    </div>
  );
};

/* ─── Category Nav (Level 1) ─────────────────────────────────────── */
const CategoryNav = ({ categories, selectedCatLabel, onSelect, salon, onImageChange, uploadingMap, catRefs, scrollRef }) => (
  <>
    <style>{`
      @keyframes fadeSlideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      .cat-scroll-owner::-webkit-scrollbar{display:none}
    `}</style>
    <div
      ref={scrollRef}
      className="cat-scroll-owner"
      style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
        overflowX: 'auto', overflowY: 'visible',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        paddingTop: 18, paddingBottom: 8,
      }}
    >
      <CircleButton
        label="All"
        isAll
        isSelected={!selectedCatLabel}
        onSelect={() => onSelect(null)}
        showEdit={false}
        btnRef={el => { if (catRefs) catRefs.current['__all__'] = el; }}
      />
      {categories.map(label => (
        <CircleButton
          key={label}
          label={label}
          imgSrc={getCatImg(label, salon)}
          isSelected={selectedCatLabel === label}
          isUploading={!!uploadingMap[label]}
          onSelect={() => onSelect(label)}
          onImageChange={onImageChange}
          showEdit
          btnRef={el => { if (catRefs) catRefs.current[label] = el; }}
        />
      ))}
    </div>
  </>
);

/* ─── Subcategory Row (Level 2 — same-size circles) ─────────────── */
const SubcategoryRow = ({ catLabel, subs, selectedSubLabel, onSelect, salon, services, onImageChange, uploadingMap = {} }) => (
  <div
    className="cat-scroll-owner"
    style={{
      display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
      overflowX: 'auto', overflowY: 'visible',
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      paddingTop: 10, paddingBottom: 4,
      animation: 'fadeSlideDown 0.22s ease both',
    }}
  >
    <CircleButton
      label="All"
      imgSrc={getCatImg(catLabel, salon)}
      isSelected={!selectedSubLabel}
      onSelect={() => onSelect(null)}
      showEdit={false}
    />
    {subs.map(sub => {
      const key = `${catLabel}::${sub}`;
      return (
        <CircleButton
          key={sub}
          label={sub}
          imgSrc={getSubImg(catLabel, sub, salon, services)}
          isSelected={selectedSubLabel === sub}
          isUploading={!!uploadingMap[key]}
          onSelect={() => onSelect(sub)}
          showEdit={!!onImageChange}
          onImageChange={onImageChange ? (_, file) => onImageChange(key, file) : undefined}
        />
      );
    })}
  </div>
);

/* ─── Services Page ──────────────────────────────────────────────── */
const Services = () => {
  const { salon, services, createService, updateService, deleteService, fetchServices, fetchSalon, updateSalon } = useSalon();
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState('');
  const [isModalOpen,       setIsModalOpen]        = useState(false);
  const [selectedService,   setSelectedService]    = useState(null);
  const [isCategoriesOpen,  setIsCategoriesOpen]   = useState(false);
  const [search,            setSearch]             = useState('');
  const [showMenuSection,   setShowMenuSection]    = useState(false);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [dismissedPricing,   setDismissedPricing]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('msb_dismissed_pricing') || '[]'); } catch { return []; }
  });

  // Drill-down navigation
  const [selectedCatLabel, setSelectedCatLabel] = useState(null);
  const [selectedSubLabel, setSelectedSubLabel] = useState(null);
  const [catImgUploading,  setCatImgUploading]  = useState({});

  // Bulk control panel
  const [showBulkSet,    setShowBulkSet]    = useState(false);
  const [bulkEnabled,    setBulkEnabled]    = useState(new Set());
  const [bulkPrice,      setBulkPrice]      = useState('');
  const [bulkDuration,   setBulkDuration]   = useState('');
  const [bulkActive,     setBulkActive]     = useState(true);
  const [bulkGender,     setBulkGender]     = useState('both');
  const [bulkSaving,     setBulkSaving]     = useState(false);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [optimisticMap,  setOptimisticMap]  = useState(null);

  // Mind-map SVG state
  const [svgData, setSvgData] = useState(null);
  const catRefs    = useRef({});
  const catNavRef  = useRef(null);

  // Filtering shimmer
  const [isFiltering,   setIsFiltering]   = useState(false);
  const filterTimerRef                    = useRef(null);

  // Scroll memory
  const gridScrollRef  = useRef(null);
  const scrollMemory   = useRef({});

  useEffect(() => { document.title = 'Services — GlowLoox'; }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { await fetchServices(); }
      catch { setError('Failed to load services'); }
      finally { setLoading(false); }
      try { await fetchSalon(); } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    api.get('/owner/analytics/smart-pricing')
      .then(res => setPricingSuggestions(res.data?.data?.suggestions || []))
      .catch(() => {});
  }, []);

  // Shimmer on filter change
  useEffect(() => {
    setIsFiltering(true);
    clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => setIsFiltering(false), 130);
    return () => clearTimeout(filterTimerRef.current);
  }, [selectedCatLabel, selectedSubLabel]);

  // Auto-close bulk panel when subcategory changes
  useEffect(() => {
    setShowBulkSet(false); setBulkEnabled(new Set());
    setBulkPrice(''); setBulkDuration(''); setBulkActive(true); setBulkGender('both');
    setOptimisticMap(null);
  }, [selectedSubLabel]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleOpenModal = (service = null) => { setSelectedService(service); setIsModalOpen(true); setError(''); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedService(null); setError(''); };

  const handleSubmit = async (formData) => {
    setLoading(true); setError('');
    try {
      if (selectedService) { await updateService(selectedService._id || selectedService.id, formData); toast.success('Service updated!'); }
      else { await createService(formData); toast.success('Service created!'); }
      handleCloseModal();
      await fetchServices();
    } catch (err) { setError(err.message || 'Failed to save service'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (serviceId, isActive) => {
    setLoading(true);
    try { await updateService(serviceId, { isActive }); toast.success(isActive ? 'Service activated' : 'Service deactivated'); await fetchServices(); }
    catch (err) { toast.error(err.message || 'Failed to update service'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (serviceId) => {
    setLoading(true); setError('');
    try { await deleteService(serviceId); toast.success('Service deleted!'); await fetchServices(); }
    catch (err) { toast.error(err.message || 'Failed to delete service'); }
    finally { setLoading(false); }
  };

  const handleCatImageChange = async (key, file) => {
    if (!file) return;
    setCatImgUploading(prev => ({ ...prev, [key]: true }));
    try {
      const url     = await uploadServicePhoto(file);
      const updated = { ...(salon.categoryImages || {}), [key]: url };
      await updateSalon({ categoryImages: updated });
      toast.success('Image updated');
    } catch { toast.error('Failed to upload image'); }
    finally { setCatImgUploading(prev => ({ ...prev, [key]: false })); }
  };

  // ── Bulk control panel ───────────────────────────────────────────
  const priceValid    = bulkPrice    === '' || (Number(bulkPrice)    >= 0 && !isNaN(Number(bulkPrice)));
  const durationValid = bulkDuration === '' || (Number(bulkDuration) >= 1 && !isNaN(Number(bulkDuration)));

  const buildBulkPatch = () => {
    const patch = {};
    if (bulkEnabled.has('price')    && bulkPrice    !== '' && priceValid)    patch.basePrice = Number(bulkPrice);
    if (bulkEnabled.has('duration') && bulkDuration !== '' && durationValid) patch.duration  = Number(bulkDuration);
    if (bulkEnabled.has('status'))  patch.isActive     = bulkActive;
    if (bulkEnabled.has('gender'))  patch.applicableFor = bulkGender === 'both' ? ['male','female'] : [bulkGender];
    return patch;
  };


  const toggleBulkField = (key) => {
    setBulkEnabled(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleBulkSet = async () => {
    if (bulkSaving) return;
    const targets = (displayedServices || []).filter(s => s._id || s.id);
    if (!targets.length || !canApply) return;

    const patch = buildBulkPatch();
    if (!Object.keys(patch).length) return;

    const ids       = targets.map(s => s._id || s.id);
    const idSet     = new Set(ids);
    const snapshots = targets.map(s => ({
      id: s._id || s.id,
      basePrice: s.basePrice ?? s.price,
      duration: s.duration,
      isActive: s.isActive,
      applicableFor: s.applicableFor,
    }));

    setOptimisticMap(new Map(ids.map(id => [id, patch])));
    setHighlightedIds(idSet);
    setBulkSaving(true);

    try {
      const res = await api.patch('/owner/services/bulk', { ids, patch });
      if (!res?.data?.success) throw new Error('Unexpected response from server');
      await fetchServices();
      setOptimisticMap(null);
      setShowBulkSet(false); setBulkEnabled(new Set());
      setBulkPrice(''); setBulkDuration(''); setBulkActive(true); setBulkGender('both');
      setTimeout(() => setHighlightedIds(new Set()), 500);

      let undone = false;
      toast.success(
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, minWidth:240 }}>
          <span style={{ fontWeight:500 }}>Updated {targets.length} service{targets.length !== 1 ? 's' : ''}</span>
          <button
            style={{ fontWeight:700, color:'#818cf8', background:'rgba(99,102,241,0.12)',
              border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, padding:'3px 10px',
              cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:4 }}
            onClick={async () => {
              if (undone) return;
              undone = true;
              const results = await Promise.allSettled(
                snapshots.map(snap => updateService(snap.id, {
                  basePrice: snap.basePrice, duration: snap.duration,
                  isActive: snap.isActive, applicableFor: snap.applicableFor,
                }))
              );
              const failed = results.filter(r => r.status === 'rejected').length;
              await fetchServices();
              if (failed) toast.error(`${failed} service${failed > 1 ? 's' : ''} failed to undo`);
              else toast.success('Changes undone');
            }}
          ><Undo2 style={{ width:12, height:12 }} /> Undo</button>
        </div>,
        { duration: 5000 }
      );
    } catch {
      setOptimisticMap(null);
      setHighlightedIds(new Set());
      toast.error('Failed to update services');
    } finally { setBulkSaving(false); }
  };

  const handleCatSelect = useCallback((label) => {
    if (gridScrollRef.current) {
      scrollMemory.current[selectedCatLabel ?? '__all__'] = gridScrollRef.current.scrollTop;
    }
    setSelectedCatLabel(label);
    setSelectedSubLabel(null);

    // Compute mind-map SVG position
    if (label) {
      requestAnimationFrame(() => {
        const el        = catRefs.current[label];
        const container = catNavRef.current;
        if (el && container) {
          const elRect  = el.getBoundingClientRect();
          const conRect = container.getBoundingClientRect();
          const x = elRect.left - conRect.left + elRect.width / 2 + container.scrollLeft;
          setSvgData({ x, cw: conRect.width });
        }
      });
    } else {
      setSvgData(null);
    }

    requestAnimationFrame(() => {
      if (gridScrollRef.current) {
        gridScrollRef.current.scrollTop = scrollMemory.current[label ?? '__all__'] ?? 0;
      }
    });
  }, [selectedCatLabel]);

  const handleSubSelect = useCallback((sub) => {
    if (gridScrollRef.current) {
      scrollMemory.current[`${selectedCatLabel}::${selectedSubLabel ?? '__all__'}`] = gridScrollRef.current.scrollTop;
    }
    setSelectedSubLabel(sub);
    requestAnimationFrame(() => {
      if (gridScrollRef.current) {
        gridScrollRef.current.scrollTop = scrollMemory.current[`${selectedCatLabel}::${sub ?? '__all__'}`] ?? 0;
      }
    });
  }, [selectedCatLabel, selectedSubLabel]);

  // ── Derived data ───────────────────────────────────────────────
  const allServices   = services || [];
  const activeCount   = allServices.filter(s => s.isActive !== false).length;
  const inactiveCount = allServices.length - activeCount;

  const filteredServices = useMemo(() => {
    const gender = salon?.servedGender;
    let base = allServices;
    if (gender === 'male' || gender === 'female') {
      base = base.filter(s => {
        const af = s.applicableFor || [];
        if (af.includes('male') || af.includes('female')) return af.includes(gender);
        const uniCatDef = UNISEX_CATEGORIES.find(u => u.label === s.category);
        if (uniCatDef) {
          const maleSet   = new Set(uniCatDef.maleSubServices   || []);
          const femaleSet = new Set(uniCatDef.femaleSubServices || []);
          if (gender === 'male'   && femaleSet.has(s.name) && !maleSet.has(s.name)) return false;
          if (gender === 'female' && maleSet.has(s.name)   && !femaleSet.has(s.name)) return false;
        }
        return true;
      });
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(s => s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
  }, [allServices, search, salon?.servedGender]);

  const grouped = useMemo(() => {
    const g = filteredServices.reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});
    return Object.entries(g).sort(([a],[b]) => {
      const ai = ALL_CATEGORY_ORDER.indexOf(a), bi = ALL_CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  }, [filteredServices]);

  // Level 1: ALL categories for this business type (not just ones with services)
  const categoriesWithServices = useMemo(() => {
    const fromDefs = getCategoriesForSalonType(salon?.businessType, salon?.servedGender).map(c => c.label);
    const fromSvcs = grouped.map(([label]) => label);
    // Merge: defined categories first (in order), then any extra from actual services
    const seen = new Set(fromDefs);
    return [...fromDefs, ...fromSvcs.filter(l => !seen.has(l))];
  }, [salon?.businessType, salon?.servedGender, grouped]);

  // Level 2: ALL subcategories for selected category (on and off)
  const subcategoriesForSelected = useMemo(() => {
    if (!selectedCatLabel) return [];
    const catDefs = getCategoriesForSalonType(salon?.businessType, salon?.servedGender);
    const catDef  = catDefs.find(d => d.label === selectedCatLabel);
    if (!catDef) return [];
    if (catDef.sections?.length)    return catDef.sections.map(sec => sec.label);
    if (catDef.subServices?.length) return catDef.subServices;
    return [];
  }, [selectedCatLabel, salon?.businessType, salon?.servedGender]);

  // Level 3: displayed services — active AND inactive always included
  const displayedServices = useMemo(() => {
    let base = filteredServices;
    if (selectedCatLabel) {
      base = base.filter(s => s.category === selectedCatLabel);
    }
    if (selectedSubLabel && selectedCatLabel) {
      const catDefs = getCategoriesForSalonType(salon?.businessType, salon?.servedGender);
      const catDef  = catDefs.find(d => d.label === selectedCatLabel);
      const secDef  = catDef?.sections?.find(s => s.label === selectedSubLabel);

      if (secDef) {
        // Section path: show services matching the section + any service in this category
        // whose name doesn't appear in ANY section (owner typed a custom name)
        const sectionNames  = new Set(secDef.services);
        const allSecNames   = new Set((catDef.sections || []).flatMap(s => s.services));
        base = base.filter(s => sectionNames.has(s.name) || !allSecNames.has(s.name));
      } else {
        // subServices path: service name IS the sub-service label
        base = base.filter(s => s.name === selectedSubLabel);
      }
    }
    return base;
  }, [filteredServices, selectedCatLabel, selectedSubLabel, salon?.businessType, salon?.servedGender]);

  const bulkTargetCount = useMemo(
    () => displayedServices.filter(s => s._id || s.id).length,
    [displayedServices]
  );

  const canApply = !bulkSaving
    && bulkTargetCount > 0
    && bulkEnabled.size > 0
    && (!bulkEnabled.has('price')    || (bulkPrice    !== '' && priceValid))
    && (!bulkEnabled.has('duration') || (bulkDuration !== '' && durationValid));

  const displayedGrouped = useMemo(() => {
    const g = displayedServices.reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});
    return Object.entries(g).sort(([a],[b]) => {
      const ai = ALL_CATEGORY_ORDER.indexOf(a), bi = ALL_CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  }, [displayedServices]);

  // Full catalog: every service defined for this business type
  const catalogMap = useMemo(() => {
    const catDefs = getCategoriesForSalonType(salon?.businessType, salon?.servedGender);
    const map = {};
    for (const catDef of catDefs) {
      const list = [];
      if (catDef.sections?.length) {
        for (const sec of catDef.sections) {
          for (const name of (sec.services || [])) {
            list.push({ name, defaultPrice: 0, defaultDuration: 30 });
          }
        }
      } else if (catDef.subServices?.length) {
        for (const sub of catDef.subServices) {
          if (typeof sub === 'string') {
            list.push({ name: sub, defaultPrice: 0, defaultDuration: 30 });
          } else {
            list.push({ name: sub.name, defaultPrice: sub.defaultPrice || 0, defaultDuration: sub.defaultDuration || 30 });
          }
        }
      }
      map[catDef.label] = list;
    }
    return map;
  }, [salon?.businessType, salon?.servedGender]);

  // Names the owner has already added (to avoid duplicate catalog cards)
  const addedServiceNames = useMemo(() => new Set(allServices.map(s => s.name)), [allServices]);

  // All category labels to render (catalog + any custom categories the owner added)
  const allCategoryLabels = useMemo(() => {
    const fromCatalog = Object.keys(catalogMap);
    const fromSvcs    = displayedGrouped.map(([l]) => l);
    const seen        = new Set(fromCatalog);
    const merged      = [...fromCatalog, ...fromSvcs.filter(l => !seen.has(l))];
    return merged.sort((a, b) => {
      const ai = ALL_CATEGORY_ORDER.indexOf(a), bi = ALL_CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  }, [catalogMap, displayedGrouped]);

  const svcGenders = (s, cat) => {
    const af = s.applicableFor || [];
    if (af.includes('male') && af.includes('female')) return ['male', 'female'];
    if (af.includes('male'))   return ['male'];
    if (af.includes('female')) return ['female'];
    const uniCatDef    = UNISEX_CATEGORIES.find(u => u.label === cat);
    const uniMaleNames = uniCatDef ? new Set(uniCatDef.maleSubServices)   : new Set();
    const uniFemNames  = uniCatDef ? new Set(uniCatDef.femaleSubServices) : new Set();
    if (uniMaleNames.has(s.name) && !uniFemNames.has(s.name)) return ['male'];
    if (uniFemNames.has(s.name)  && !uniMaleNames.has(s.name)) return ['female'];
    return ['male', 'female'];
  };

  const isUnisex = salon?.servedGender === 'unisex';
  const isSalon  = salon?.businessType === 'salon';

  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your {getBusinessLabel(salon?.businessType).toLowerCase()} services and pricing
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={() => setIsCategoriesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-150">
              <LayoutList className="w-4 h-4" /> Service Menu
            </button>
            <button onClick={() => handleOpenModal(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02] transition-all duration-200">
              <Plus className="w-4 h-4" /> Add Service
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-400">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0">✕</button>
          </div>
        )}

        {/* ── Stats bar ── */}
        {allServices.length > 0 && !loading && (
          <StatsBar total={allServices.length} active={activeCount} inactive={inactiveCount} />
        )}

        {/* ── Level 1: Category Navigation ── */}
        {!loading && categoriesWithServices.length > 0 && (
          <CategoryNav
            categories={categoriesWithServices}
            selectedCatLabel={selectedCatLabel}
            onSelect={handleCatSelect}
            salon={salon}
            onImageChange={handleCatImageChange}
            uploadingMap={catImgUploading}
            catRefs={catRefs}
            scrollRef={catNavRef}
          />
        )}

        {/* ── Level 2: Subcategory Row ── */}
        {selectedCatLabel && subcategoriesForSelected.length > 0 && (
          <div className="mt-4">
          <SubcategoryRow
            key={selectedCatLabel}
            catLabel={selectedCatLabel}
            subs={subcategoriesForSelected}
            selectedSubLabel={selectedSubLabel}
            onSelect={handleSubSelect}
            salon={salon}
            services={allServices}
            onImageChange={handleCatImageChange}
            uploadingMap={catImgUploading}
          />
          </div>
        )}

        {/* ── Active path breadcrumb ── */}
        {selectedCatLabel && (
          <div className="flex items-center gap-1.5 px-1 -mt-1 animate-[fadeup_0.18s_ease_both]">
            <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600 shrink-0" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{selectedCatLabel}</span>
            {selectedSubLabel && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600 shrink-0" />
                <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">{selectedSubLabel}</span>
              </>
            )}
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {displayedServices.length} service{displayedServices.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* ── Smart Pricing Suggestions ── */}
        {pricingSuggestions.filter(s => !dismissedPricing.includes(String(s.serviceId))).length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Smart Pricing Suggestions</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                {pricingSuggestions.filter(s => !dismissedPricing.includes(String(s.serviceId))).length} services
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {pricingSuggestions.filter(s => !dismissedPricing.includes(String(s.serviceId))).map(s => (
                <div key={s.serviceId} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.serviceName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Booked {s.bookingsLast30}× last 30 days · Current ₹{s.currentPrice}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">→ ₹{s.suggestedPrice}</span>
                    <button onClick={() => { const next = [...dismissedPricing, String(s.serviceId)]; setDismissedPricing(next); localStorage.setItem('msb_dismissed_pricing', JSON.stringify(next)); }}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Service Menu preview toggle ── */}
        {salon?.offeredCategories?.length > 0 && allServices.length > 0 && (
          <div>
            <button onClick={() => setShowMenuSection(v => !v)}
              className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              <Sparkles className="w-3.5 h-3.5" />
              {showMenuSection ? 'Hide' : 'View'} offered service categories
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMenuSection ? 'rotate-180' : ''}`} />
            </button>
            {showMenuSection && <div className="mt-3"><ServiceMenuSection salon={salon} /></div>}
          </div>
        )}

        {/* ── Search + Filter + Sort ── */}
        {allServices.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedCatLabel(null); setSelectedSubLabel(null); }}
                placeholder="Search services by name or category…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm
                  bg-white dark:bg-[#16162a] border-gray-200 dark:border-white/[0.08]
                  text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FilterButton />
              {selectedSubLabel && (
                <button
                  onClick={() => setShowBulkSet(v => !v)}
                  style={{
                    border: showBulkSet ? '1px solid #6366f1' : '1px solid rgba(99,102,241,0.35)',
                    background: showBulkSet ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(99,102,241,0.08)',
                    color: showBulkSet ? '#fff' : '#818cf8',
                    boxShadow: showBulkSet ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all duration-200"
                >
                  <Pencil style={{ width:14, height:14 }} />
                  <span className="hidden sm:inline">Set price &amp; time</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Bulk Control Panel ── */}
        {showBulkSet && selectedSubLabel && (() => {
          const n = bulkTargetCount;
          const patch = buildBulkPatch();
          const previewParts = [
            patch.basePrice     !== undefined ? `₹${patch.basePrice}`                                                                  : null,
            patch.duration      !== undefined ? `${patch.duration} min`                                                                : null,
            patch.isActive      !== undefined ? (patch.isActive ? 'Active' : 'Inactive')                                               : null,
            patch.applicableFor !== undefined
              ? (patch.applicableFor.length === 2 ? 'Men & Women' : patch.applicableFor[0] === 'male' ? 'Men only' : 'Women only')
              : null,
          ].filter(Boolean);

          const FIELD_ICONS = {
            price:    <IndianRupee style={{ width:14, height:14, flexShrink:0 }} />,
            duration: <Clock       style={{ width:14, height:14, flexShrink:0 }} />,
            status:   <Power       style={{ width:14, height:14, flexShrink:0 }} />,
            gender:   <Users       style={{ width:14, height:14, flexShrink:0 }} />,
          };

          const fieldRow = (key, label, control) => {
            const checked = bulkEnabled.has(key);
            return (
              <div
                key={key}
                className={`bk-row${checked ? ' bk-row--checked' : ''}`}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 12px', borderRadius:10, marginBottom:5, cursor:'pointer',
                  background: checked ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  border: checked ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.04)',
                  borderLeft: checked ? '2px solid rgba(99,102,241,0.65)' : '1px solid rgba(255,255,255,0.04)',
                  transition:'background 0.15s, border-color 0.15s',
                }}
              >
                {/* Left: icon + label — click toggles the row */}
                <div
                  onClick={() => toggleBulkField(key)}
                  style={{ display:'flex', alignItems:'center', gap:7, minWidth:90, userSelect:'none',
                    color: checked ? '#818cf8' : 'rgba(99,102,241,0.3)' }}
                >
                  {FIELD_ICONS[key]}
                  <span style={{ fontSize:13, fontWeight:600, transition:'color 0.15s',
                    color: checked ? '#c7d2fe' : 'rgba(99,102,241,0.4)' }}>{label}</span>
                </div>
                {/* Right: control */}
                <div style={{ flex:1, opacity: checked ? 1 : 0.2, transition:'opacity 0.18s',
                  pointerEvents: checked ? 'auto' : 'none' }}>
                  {control}
                </div>
              </div>
            );
          };

          return (
            <div style={{
              background:'rgba(14,12,38,0.96)', border:'1px solid rgba(99,102,241,0.2)',
              borderRadius:16, padding:'14px 16px',
              boxShadow:'0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
              animation:'slideDown 0.18s cubic-bezier(0.4,0,0.2,1) both',
              opacity: bulkSaving ? 0.65 : 1, pointerEvents: bulkSaving ? 'none' : 'auto',
              transition:'opacity 0.2s',
            }}>
              <style>{`
                @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
                .bk-num::-webkit-inner-spin-button,.bk-num::-webkit-outer-spin-button{-webkit-appearance:none}
                .bk-num{-moz-appearance:textfield}
                .bk-pill{display:inline-flex;align-items:center;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid transparent;user-select:none}
                .bk-pill:hover{filter:brightness(1.08);transform:translateY(-1px)}
                .bk-pill:active{transform:scale(0.96)}
                .bk-row:hover{background:rgba(99,102,241,0.04) !important}
                .bk-row.bk-row--checked:hover{background:rgba(99,102,241,0.14) !important}
                .bk-input{display:flex;align-items:center;gap:6px;background:rgba(8,7,25,0.6);border:1px solid rgba(99,102,241,0.2);border-radius:9px;padding:7px 11px;transition:border-color 0.15s,box-shadow 0.15s}
                .bk-input:focus-within{border-color:rgba(99,102,241,0.55) !important;box-shadow:0 0 0 3px rgba(99,102,241,0.12)}
                .bk-apply{transition:transform 0.15s,box-shadow 0.15s}
                .bk-apply:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,0.5) !important}
                .bk-apply:active:not(:disabled){transform:scale(0.98)}
              `}</style>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <Pencil style={{ width:13, height:13, color:'#818cf8' }} />
                  <span style={{ fontWeight:700, fontSize:14, color:'#e0e7ff' }}>{selectedSubLabel}</span>
                  <span style={{ fontSize:11, fontWeight:500, color:'rgba(156,163,175,0.6)',
                    background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.15)',
                    borderRadius:999, padding:'2px 7px' }}>{n} service{n !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => setShowBulkSet(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(156,163,175,0.4)', padding:2, lineHeight:1 }}>
                  <X style={{ width:14, height:14 }} />
                </button>
              </div>

              {/* Field rows */}
              <div style={{ marginBottom:8 }}>
                {fieldRow('price', 'Price', (
                  <div className="bk-input" style={(!priceValid && bulkPrice !== '') ? { borderColor:'rgba(239,68,68,0.5)' } : {}}>
                    <IndianRupee style={{ width:13, height:13, color:'#818cf8', flexShrink:0 }} />
                    <input className="bk-num" type="number" min="0" placeholder="e.g. 500"
                      value={bulkPrice} onChange={e => setBulkPrice(e.target.value)}
                      onFocus={e => e.target.select()}
                      onKeyDown={e => { if (e.key === 'Enter' && canApply) handleBulkSet(); }}
                      style={{ background:'none', border:'none', outline:'none', color:'#e0e0ff', fontSize:13, width:'100%' }} />
                    {!priceValid && bulkPrice !== '' && <span style={{ fontSize:10, color:'#f87171', flexShrink:0 }}>≥ 0</span>}
                  </div>
                ))}
                {fieldRow('duration', 'Duration', (
                  <div className="bk-input" style={(!durationValid && bulkDuration !== '') ? { borderColor:'rgba(239,68,68,0.5)' } : {}}>
                    <Clock style={{ width:12, height:12, color:'#818cf8', flexShrink:0 }} />
                    <input className="bk-num" type="number" min="1" placeholder="e.g. 45"
                      value={bulkDuration} onChange={e => setBulkDuration(e.target.value)}
                      onFocus={e => e.target.select()}
                      onKeyDown={e => { if (e.key === 'Enter' && canApply) handleBulkSet(); }}
                      style={{ background:'none', border:'none', outline:'none', color:'#e0e0ff', fontSize:13, width:'100%' }} />
                    <span style={{ color:'rgba(156,163,175,0.4)', fontSize:11, flexShrink:0 }}>min</span>
                    {!durationValid && bulkDuration !== '' && <span style={{ fontSize:10, color:'#f87171', flexShrink:0 }}>≥ 1</span>}
                  </div>
                ))}
                {fieldRow('status', 'Status', (
                  <div style={{ display:'flex', gap:6 }}>
                    {[{ v:true, label:'Active' }, { v:false, label:'Inactive' }].map(({ v, label }) => (
                      <span key={String(v)} className="bk-pill"
                        onClick={() => setBulkActive(v)}
                        style={{
                          background: bulkActive === v ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(99,102,241,0.08)',
                          border: bulkActive === v ? '1.5px solid #6366f1' : '1.5px solid rgba(99,102,241,0.25)',
                          color: bulkActive === v ? '#fff' : 'rgba(156,163,175,0.7)',
                          boxShadow: bulkActive === v ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                        }}>{label}</span>
                    ))}
                  </div>
                ))}
                {fieldRow('gender', 'For', (
                  <div style={{ display:'flex', gap:6 }}>
                    {[{ v:'male', label:'Men' }, { v:'female', label:'Women' }, { v:'both', label:'Both' }].map(({ v, label }) => (
                      <span key={v} className="bk-pill"
                        onClick={() => setBulkGender(v)}
                        style={{
                          background: bulkGender === v ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(99,102,241,0.08)',
                          border: bulkGender === v ? '1.5px solid #6366f1' : '1.5px solid rgba(99,102,241,0.25)',
                          color: bulkGender === v ? '#fff' : 'rgba(156,163,175,0.7)',
                          boxShadow: bulkGender === v ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                        }}>{label}</span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Preview — indigo card, informational */}
              {previewParts.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6,
                  padding:'9px 12px', background:'rgba(99,102,241,0.07)',
                  border:'1px solid rgba(99,102,241,0.14)', borderRadius:10, marginBottom:8 }}>
                  <span style={{ fontSize:11, color:'rgba(156,163,175,0.45)', marginRight:2 }}>Changes:</span>
                  {previewParts.map((p,i) => (
                    <span key={i} style={{
                      fontSize:12, fontWeight:600, color:'#a5b4fc',
                      background:'rgba(99,102,241,0.14)', border:'1px solid rgba(99,102,241,0.22)',
                      borderRadius:999, padding:'2px 9px',
                    }}>{p}</span>
                  ))}
                </div>
              )}

              {/* Warning — amber card, stronger than preview */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.22)',
                borderRadius:10, marginBottom:12 }}>
                <AlertTriangle style={{ width:13, height:13, color:'rgba(251,191,36,0.85)', flexShrink:0 }} />
                <span style={{ fontSize:12, fontWeight:500, color:'rgba(251,191,36,0.8)' }}>
                  This will update {n} service{n !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Apply */}
              <button onClick={handleBulkSet} disabled={!canApply} className="bk-apply" style={{
                width:'100%', padding:'11px 16px', borderRadius:11, border:'none',
                cursor: canApply ? 'pointer' : 'not-allowed',
                background: canApply ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(99,102,241,0.15)',
                color: canApply ? '#fff' : 'rgba(255,255,255,0.25)',
                fontWeight:700, fontSize:13, letterSpacing:'0.01em',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                boxShadow: canApply ? '0 4px 16px rgba(99,102,241,0.38)' : 'none',
              }}>
                {bulkSaving
                  ? <><Loader2 style={{ width:13, height:13 }} className="animate-spin" /> Applying…</>
                  : <>Apply to all {n} service{n !== 1 ? 's' : ''} →</>}
              </button>
            </div>
          );
        })()}

        {/* ── Service Grid ── */}
        <div ref={gridScrollRef}>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : isFiltering ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : allServices.length === 0 ? (
            <EmptyState onAdd={() => handleOpenModal(null)} />
          ) : (
            <div className="space-y-6">
              {allCategoryLabels
                .filter(cat => !selectedCatLabel || cat === selectedCatLabel)
                .map(cat => {
                  const realSvcs = displayedGrouped.find(([l]) => l === cat)?.[1] || [];

                  let notAdded = (catalogMap[cat] || []).filter(cs => !addedServiceNames.has(cs.name));

                  if (selectedSubLabel && selectedCatLabel) {
                    const catDefs = getCategoriesForSalonType(salon?.businessType, salon?.servedGender);
                    const catDef  = catDefs.find(d => d.label === cat);
                    const secDef  = catDef?.sections?.find(s => s.label === selectedSubLabel);
                    if (secDef) {
                      const secNames    = new Set(secDef.services);
                      const allSecNames = new Set((catDef.sections || []).flatMap(s => s.services));
                      notAdded = notAdded.filter(cs => secNames.has(cs.name) || !allSecNames.has(cs.name));
                    } else {
                      notAdded = notAdded.filter(cs => cs.name === selectedSubLabel);
                    }
                  }

                  if (search.trim()) {
                    const q = search.toLowerCase();
                    notAdded = notAdded.filter(cs => cs.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q));
                  }

                  if (realSvcs.length === 0 && notAdded.length === 0) return null;

                  const isMaleOnly   = MALE_ONLY_CAT_LABELS.has(cat);
                  const isFemaleOnly = FEMALE_ONLY_CAT_LABELS.has(cat);
                  const showSplit    = isUnisex && !isMaleOnly && !isFemaleOnly;
                  const menSvcs      = showSplit ? realSvcs.filter(s => svcGenders(s, cat).includes('male'))   : [];
                  const womenSvcs    = showSplit ? realSvcs.filter(s => svcGenders(s, cat).includes('female')) : [];

                  const renderSvc = (svc) => {
                    const id = svc._id || svc.id;
                    const displaySvc = optimisticMap?.has(id) ? { ...svc, ...optimisticMap.get(id) } : svc;
                    return (
                      <div key={id} style={{
                        borderRadius: 16,
                        boxShadow: highlightedIds.has(id) ? '0 0 0 2px #6366f1, 0 0 18px rgba(99,102,241,0.45)' : 'none',
                        transition: 'box-shadow 0.25s ease',
                      }}>
                        <ServiceCard service={displaySvc} onEdit={handleOpenModal} onDelete={handleDelete} onToggle={handleToggle} loading={loading} />
                      </div>
                    );
                  };

                  const allCards = [
                    ...(!showSplit ? realSvcs.map(svc => renderSvc(svc)) : [
                      ...(menSvcs.length > 0 ? menSvcs.map(svc => renderSvc(svc)) : []),
                      ...(womenSvcs.length > 0 ? womenSvcs.map(svc => renderSvc(svc)) : []),
                    ]),
                    ...notAdded.map(cs => (
                      <CatalogCard
                        key={cs.name}
                        name={cs.name}
                        onAdd={() => handleOpenModal({ name: cs.name, category: cat, basePrice: cs.defaultPrice || 0, duration: cs.defaultDuration || 30 })}
                      />
                    )),
                  ];

                  return (
                    <div key={cat}>
                      {/* Category label — only when showing All (no category selected) */}
                      {!selectedCatLabel && (
                        <div className="flex items-center gap-2.5 mb-3">
                          {getCatImg(cat, salon) ? (
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                              <img src={getCatImg(cat, salon)} alt={cat} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-900/40 flex items-center justify-center shrink-0">
                              <CategoryIcon label={cat} className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                          )}
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{cat}</span>
                          {isUnisex && isMaleOnly   && <span className="text-[11px] font-medium text-blue-400 flex items-center gap-0.5"><User className="w-3 h-3" /> Male</span>}
                          {isUnisex && isFemaleOnly && <span className="text-[11px] font-medium text-pink-400 flex items-center gap-0.5"><UserRound className="w-3 h-3" /> Female</span>}
                          <span className="ml-auto text-[11px] font-semibold text-gray-500 dark:text-gray-600">
                            {realSvcs.length}{notAdded.length > 0 ? ` + ${notAdded.length}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Flat card grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {allCards}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}

              {/* Search no-results */}
              {search.trim() && allCategoryLabels.every(cat => {
                const real    = displayedGrouped.find(([l]) => l === cat)?.[1] || [];
                const q       = search.toLowerCase();
                const notAdded = (catalogMap[cat] || []).filter(cs => !addedServiceNames.has(cs.name) && (cs.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)));
                return real.length === 0 && notAdded.length === 0;
              }) && (
                <div className="flex flex-col items-center py-16 text-center">
                  <Search className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No services match "{search}"</p>
                  <button onClick={() => setSearch('')} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Clear search</button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Service Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        service={selectedService}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        salon={salon}
      />

      {/* Edit Categories Drawer */}
      <EditCategoriesDrawer
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        onSaved={async () => { setIsCategoriesOpen(false); await fetchSalon(); setShowMenuSection(true); }}
        onOpen={fetchSalon}
        salon={salon}
        updateSalon={updateSalon}
      />
    </DashboardLayout>
  );
};

export default Services;
