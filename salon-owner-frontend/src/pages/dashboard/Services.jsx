import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, LayoutList, ChevronDown, Scissors, Search,
  Layers, CheckCircle2, XCircle, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ServiceCard from '../../components/Services/ServiceCard';
import ServiceModal from '../../components/Services/ServiceModal';
import EditCategoriesDrawer from '../../components/salon/EditCategoriesDrawer';
import { useSalon } from '../../hooks/useSalon';
import {
  UNISEX_CATEGORIES,
  CATEGORY_ICON_MAP,
  CATEGORY_CARD_IMAGE_MAP,
  ALL_CATEGORY_ORDER,
  MALE_ONLY_CAT_LABELS,
  FEMALE_ONLY_CAT_LABELS,
  getCategoriesForSalonType,
  SALON_MALE_CATEGORIES,
  SALON_FEMALE_CATEGORIES,
} from '../../constants/salonCategories';

/* ─── Resolve category image: custom > default map > null ───────────────── */
const getCatImg = (label, salon) => {
  const saved = salon?.categoryImages;
  if (saved) {
    const custom = saved instanceof Map ? saved.get(label) : saved[label];
    if (custom) return custom;
  }
  return CATEGORY_CARD_IMAGE_MAP[label] || null;
};

/* ─── Skeleton card ──────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3 animate-pulse">
    <div className="flex justify-between">
      <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-5 w-9 bg-gray-200 dark:bg-gray-800 rounded-full" />
    </div>
    <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    <div className="flex gap-2">
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    </div>
    <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
      <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  </div>
);

/* ─── Empty State ────────────────────────────────────────────── */
const EmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 animate-[fadeup_0.4s_ease_both]">
    <style>{`@keyframes fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 scale-150 blur-2xl" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950
        flex items-center justify-center shadow-inner">
        <Scissors className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No services added yet</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8">
      Start by adding the services your salon offers to attract customers and enable bookings.
    </p>
    <button onClick={onAdd}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
        bg-gradient-to-r from-indigo-600 to-violet-600
        hover:from-indigo-500 hover:to-violet-500
        text-white shadow-lg shadow-indigo-500/25
        hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200">
      <Plus className="w-4 h-4" />
      Add Your First Service
    </button>
  </div>
);

/* ─── Stats bar ──────────────────────────────────────────────── */
const StatsBar = ({ total, active, inactive }) => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { label: 'Total',    value: total,    icon: Layers,       cls: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950/50'  },
      { label: 'Active',   value: active,   icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
      { label: 'Inactive', value: inactive, icon: XCircle,      cls: 'text-gray-400 dark:text-gray-500',       bg: 'bg-gray-100 dark:bg-gray-800'         },
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

/* ─── Service Menu (offeredCategories view) ──────────────────── */
const ServiceMenuSection = ({ salon }) => {
  const [expanded, setExpanded] = useState(null);
  const [expandedSection, setExpandedSection] = useState({});
  const [expandedSubSection, setExpandedSubSection] = useState({});
  const isSalon = salon?.businessType === 'salon';
  const catDefs = isSalon
    ? getCategoriesForSalonType(salon.businessType, salon.servedGender)
    : [];

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
    const img   = catName ? getCatImg(catName, salon) : null;
    return (
      <span className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full flex items-center gap-1.5 font-medium">
        {img && (
          <span className="w-4 h-4 rounded-full overflow-hidden shrink-0">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </span>
        )}
        {name}
        {price > 0 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{price}</span>}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
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
            <span className="text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400
              border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full font-medium">
              👶 Kids
            </span>
          )}
          {salon.atHomeServices && (
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400
              border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full font-medium">
              🏠 At-Home
            </span>
          )}
        </div>
      </div>

      {/* Category accordion */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {sortedCategories.map((cat, idx) => {
          const subs = cat.subServices || [];
          const isOpen = expanded === idx;
          const isMaleOnly   = MALE_ONLY_CAT_LABELS.has(cat.name);
          const isFemaleOnly = FEMALE_ONLY_CAT_LABELS.has(cat.name);
          const showSplit = isUnisex && !isMaleOnly && !isFemaleOnly;
          const uniCat       = UNISEX_CATEGORIES.find(u => u.label === cat.name);
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
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left
                  hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {getCatImg(cat.name, salon) ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                    <img src={getCatImg(cat.name, salon)} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="text-base shrink-0">{CATEGORY_ICON_MAP[cat.name] || '✨'}</span>
                )}
                <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                {isUnisex && isMaleOnly   && <span className="text-xs text-blue-500 font-medium">👨 Male</span>}
                {isUnisex && isFemaleOnly && <span className="text-xs text-pink-500 font-medium">👩 Female</span>}
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
                      subs: subs.filter(s => {
                        const name = typeof s === 'string' ? s : s.name;
                        return sec.services.includes(name);
                      }),
                    })).filter(sec => sec.subs.length > 0);
                    if (!sectionSubs.length) {
                      return <div className="flex flex-wrap gap-1.5">{subs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div>;
                    }
                    return (
                      <div className="space-y-1.5">
                        {sectionSubs.map((sec, si) => {
                          const secKey = `${idx}-${si}`;
                          const isSecOpen = !!expandedSection[secKey];
                          const isMaleSec   = sec.label === 'Men';
                          const isFemaleSec = sec.label === 'Female';
                          const btnCls = isMaleSec
                            ? 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            : isFemaleSec
                            ? 'bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-900/30'
                            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50';
                          const labelCls = isMaleSec
                            ? 'text-blue-600 dark:text-blue-400'
                            : isFemaleSec
                            ? 'text-pink-600 dark:text-pink-400'
                            : 'text-indigo-600 dark:text-indigo-400';
                          const chevCls = isMaleSec ? 'text-blue-400' : isFemaleSec ? 'text-pink-400' : 'text-indigo-400';
                          const displayLabel = isMaleSec ? '👨 Male' : isFemaleSec ? '👩 Female' : sec.label;
                          // For Male/Female sections in unisex salon, look up sub-sections
                          const genderCatDefs = isMaleSec ? SALON_MALE_CATEGORIES : isFemaleSec ? SALON_FEMALE_CATEGORIES : null;
                          const genderCatDef  = genderCatDefs ? genderCatDefs.find(d => d.label === cat.name) : null;
                          const subSectionDefs = genderCatDef?.sections || [];
                          const subSectionSubs = subSectionDefs.map(subSec => ({
                            label: subSec.label,
                            subs: sec.subs.filter(s => {
                              const name = typeof s === 'string' ? s : s.name;
                              return subSec.services.includes(name);
                            }),
                          })).filter(ss => ss.subs.length > 0);

                          return (
                            <div key={si}>
                              <button
                                type="button"
                                onClick={() => setExpandedSection(prev => ({ ...prev, [secKey]: !prev[secKey] }))}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${btnCls}`}>
                                <span className={`text-xs font-semibold ${labelCls}`}>{displayLabel}</span>
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
                                        <button
                                          type="button"
                                          onClick={() => setExpandedSubSection(prev => ({ ...prev, [subKey]: !prev[subKey] }))}
                                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors
                                            bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50">
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
                      {menSubs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">👨 Male</p>
                          <div className="flex flex-wrap gap-1.5">{menSubs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div>
                        </div>
                      )}
                      {womenSubs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1.5">👩 Female</p>
                          <div className="flex flex-wrap gap-1.5">{womenSubs.map((s,i)=><Chip key={i} sub={s} catName={cat.name}/>)}</div>
                        </div>
                      )}
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

/* ─── Services Page ──────────────────────────────────────────── */
const Services = () => {
  const { salon, services, createService, updateService, deleteService, fetchServices, fetchSalon, updateSalon } = useSalon();
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState('');
  const [isModalOpen,       setIsModalOpen]        = useState(false);
  const [selectedService,   setSelectedService]    = useState(null);
  const [isCategoriesOpen,  setIsCategoriesOpen]   = useState(false);
  const [collapsedCats,     setCollapsedCats]       = useState(new Set());
  const [search,            setSearch]             = useState('');
  const [showMenuSection,   setShowMenuSection]    = useState(false);
  const [expandedGender,    setExpandedGender]     = useState({});

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

  const handleOpenModal = (service = null) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setError('');
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');
    try {
      if (selectedService) {
        await updateService(selectedService._id || selectedService.id, formData);
        toast.success('Service updated!');
      } else {
        await createService(formData);
        toast.success('Service created!');
      }
      handleCloseModal();
      await fetchServices();
    } catch (err) {
      setError(err.message || 'Failed to save service');
    } finally { setLoading(false); }
  };

  const handleToggle = async (serviceId, isActive) => {
    setLoading(true);
    try {
      await updateService(serviceId, { isActive });
      toast.success(isActive ? 'Service activated' : 'Service deactivated');
      await fetchServices();
    } catch (err) {
      toast.error(err.message || 'Failed to update service');
    } finally { setLoading(false); }
  };

  const handleDelete = async (serviceId) => {
    setLoading(true);
    setError('');
    try {
      await deleteService(serviceId);
      toast.success('Service deleted!');
      await fetchServices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete service');
    } finally { setLoading(false); }
  };

  /* Derived data */
  const allServices = services || [];
  const activeCount   = allServices.filter(s => s.isActive !== false).length;
  const inactiveCount = allServices.length - activeCount;

  const filteredServices = useMemo(() => {
    const gender = salon?.servedGender; // 'male' | 'female' | 'unisex'
    let base = allServices;

    // Gender filter — only when salon is male-only or female-only
    if (gender === 'male' || gender === 'female') {
      base = base.filter(s => {
        const af = s.applicableFor || [];
        // Explicit applicableFor wins
        if (af.includes('male') || af.includes('female')) {
          return af.includes(gender);
        }
        // Fallback: look up in UNISEX_CATEGORIES name lists
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
    return base.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
  }, [allServices, search, salon?.servedGender]);

  /* Group by category */
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

  /* Unisex classifier — returns array of genders this service applies to */
  const svcGenders = (s, cat) => {
    const af = s.applicableFor || [];
    if (af.includes('male') && af.includes('female')) return ['male', 'female'];
    if (af.includes('male'))   return ['male'];
    if (af.includes('female')) return ['female'];
    // Fallback: name-based lookup
    const uniCatDef    = UNISEX_CATEGORIES.find(u => u.label === cat);
    const uniMaleNames = uniCatDef ? new Set(uniCatDef.maleSubServices)   : new Set();
    const uniFemNames  = uniCatDef ? new Set(uniCatDef.femaleSubServices) : new Set();
    if (uniMaleNames.has(s.name) && !uniFemNames.has(s.name)) return ['male'];
    if (uniFemNames.has(s.name) && !uniMaleNames.has(s.name)) return ['female'];
    return ['male', 'female'];
  };

  const isUnisex = salon?.servedGender === 'unisex';
  const isSalon  = salon?.businessType === 'salon';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your salon services and pricing
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsCategoriesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-300
                bg-white dark:bg-gray-900
                hover:bg-gray-50 dark:hover:bg-gray-800
                hover:border-indigo-300 dark:hover:border-indigo-700
                transition-all duration-150"
            >
              <LayoutList className="w-4 h-4" />
              Service Menu
            </button>
            <button
              onClick={() => handleOpenModal(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                text-white shadow-lg shadow-indigo-500/20
                hover:shadow-indigo-500/35 hover:scale-[1.02] transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl
            bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50
            text-sm text-red-700 dark:text-red-400">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0">✕</button>
          </div>
        )}

        {/* ── Stats bar ── */}
        {allServices.length > 0 && !loading && (
          <StatsBar total={allServices.length} active={activeCount} inactive={inactiveCount} />
        )}

        {/* ── Service Menu preview (inline toggle) ── */}
        {salon?.offeredCategories?.length > 0 && (
          <div>
            <button
              onClick={() => setShowMenuSection(v => !v)}
              className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {showMenuSection ? 'Hide' : 'View'} offered service categories
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMenuSection ? 'rotate-180' : ''}`} />
            </button>
            {showMenuSection && (
              <div className="mt-3">
                <ServiceMenuSection salon={salon} />
              </div>
            )}
          </div>
        )}

        {/* ── Search bar (only when services exist) ── */}
        {allServices.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services by name or category…"
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

        {/* ── Content ── */}
        {loading && !allServices.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : allServices.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
            <EmptyState onAdd={() => handleOpenModal(null)} />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No services match "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([cat, svcs]) => {
              const isOpen = !collapsedCats.has(cat);
              const isMaleOnly   = MALE_ONLY_CAT_LABELS.has(cat);
              const isFemaleOnly = FEMALE_ONLY_CAT_LABELS.has(cat);
              const showSplit = isUnisex && !isMaleOnly && !isFemaleOnly;

              const menSvcs   = showSplit ? svcs.filter(s => svcGenders(s, cat).includes('male'))   : [];
              const womenSvcs = showSplit ? svcs.filter(s => svcGenders(s, cat).includes('female')) : [];

              const renderCards = (list) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {list.map(svc => (
                    <ServiceCard
                      key={svc._id || svc.id}
                      service={svc}
                      onEdit={handleOpenModal}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                      loading={loading}
                    />
                  ))}
                </div>
              );

              return (
                <div key={cat} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => setCollapsedCats(prev => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; })}
                    className="w-full flex items-center gap-3 px-5 py-4
                      hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  >
                    {getCatImg(cat, salon) ? (
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                        <img src={getCatImg(cat, salon)} alt={cat} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-lg shrink-0">{CATEGORY_ICON_MAP[cat] || '✨'}</span>
                    )}
                    <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-200">{cat}</span>
                    {isUnisex && isMaleOnly   && <span className="text-xs font-medium text-blue-500">👨 Male</span>}
                    {isUnisex && isFemaleOnly && <span className="text-xs font-medium text-pink-500">👩 Female</span>}
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      {svcs.length}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded services */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-800 p-4">
                      {!showSplit ? (
                        renderCards(svcs)
                      ) : isSalon ? (
                        <div className="space-y-2">
                          {menSvcs.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setExpandedGender(prev => ({ ...prev, [cat]: prev[cat] === 'male' ? null : 'male' }))}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-left
                                  bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30
                                  border border-blue-100 dark:border-blue-900/40 transition-colors">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">👨 Male</span>
                                <span className="text-xs text-blue-400 ml-1">({menSvcs.length})</span>
                                <ChevronDown className={`w-4 h-4 text-blue-400 ml-auto transition-transform duration-200 ${expandedGender[cat] === 'male' ? 'rotate-180' : ''}`} />
                              </button>
                              {expandedGender[cat] === 'male' && (
                                <div className="pt-3">{renderCards(menSvcs)}</div>
                              )}
                            </div>
                          )}
                          {womenSvcs.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setExpandedGender(prev => ({ ...prev, [cat]: prev[cat] === 'female' ? null : 'female' }))}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-left
                                  bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-900/30
                                  border border-pink-100 dark:border-pink-900/40 transition-colors">
                                <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">👩 Female</span>
                                <span className="text-xs text-pink-400 ml-1">({womenSvcs.length})</span>
                                <ChevronDown className={`w-4 h-4 text-pink-400 ml-auto transition-transform duration-200 ${expandedGender[cat] === 'female' ? 'rotate-180' : ''}`} />
                              </button>
                              {expandedGender[cat] === 'female' && (
                                <div className="pt-3">{renderCards(womenSvcs)}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {menSvcs.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3 px-1">
                                <div className="h-px flex-1 bg-blue-100 dark:bg-blue-900/40" />
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">👨 Male</span>
                                <div className="h-px flex-1 bg-blue-100 dark:bg-blue-900/40" />
                              </div>
                              {renderCards(menSvcs)}
                            </div>
                          )}
                          {womenSvcs.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3 px-1">
                                <div className="h-px flex-1 bg-pink-100 dark:bg-pink-900/40" />
                                <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">👩 Female</span>
                                <div className="h-px flex-1 bg-pink-100 dark:bg-pink-900/40" />
                              </div>
                              {renderCards(womenSvcs)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
        onOpen={fetchSalon}
        salon={salon}
        updateSalon={updateSalon}
      />
    </DashboardLayout>
  );
};

export default Services;
