import React, { useState, useMemo } from 'react';
import { ArrowRight, Plus, X, CheckCircle2, Scissors, Sparkles, Zap, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import { getCategoriesForSalonType } from '../../../constants/salonCategories';

/* ─── Salon type look & feel ─────────────────────────────────────── */
const SALON_TYPE_CONFIG = {
  barbershop:    { label: 'Barbershop',       icon: '✂️',  color: '#3b82f6', glow: 'rgba(59,130,246,0.25)',  bg: 'linear-gradient(135deg,#1e3a8a22,#3b82f611)' },
  salon:         { label: 'Salon',            icon: '💇',  color: '#8b5cf6', glow: 'rgba(139,92,246,0.25)', bg: 'linear-gradient(135deg,#5b21b622,#8b5cf611)' },
  spa_wellness:  { label: 'Spa & Wellness',   icon: '🧘',  color: '#10b981', glow: 'rgba(16,185,129,0.25)', bg: 'linear-gradient(135deg,#065f4622,#10b98111)' },
  makeup_bridal: { label: 'Makeup & Bridal',  icon: '💄',  color: '#ec4899', glow: 'rgba(236,72,153,0.25)', bg: 'linear-gradient(135deg,#9d174d22,#ec489911)' },
  skin_derma:    { label: 'Skin & Derma',     icon: '🏥',  color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', bg: 'linear-gradient(135deg,#92400e22,#f59e0b11)' },
};

/* ─── Quick-pick suggestions per type ───────────────────────────── */
const QUICK_PICKS = {
  barbershop:    ['Basic Haircut', 'Fade / Taper / Skin Fade', 'Beard Trim', 'Clean Shave', 'Hot Towel Shave', 'Hair Styling'],
  makeup_bridal: ['Bridal Makeup', 'Party Makeup', 'Saree Draping', 'Trial Makeup', 'Manicure', 'Nail Art'],
  spa_wellness:  ['Head Massage', 'Full Body Massage', 'Body Scrub', 'Foot Massage', 'Aromatherapy Massage', 'Body Spa'],
  skin_derma:    ['Basic Facial', 'Clean-up', 'Anti-Acne Treatment', 'Skin Brightening', 'General Skin Consultation', 'Acne Scar Treatment'],
  male:          ['Basic Haircut', 'Beard Trim', 'Clean Shave', 'Hair Wash', 'Basic Facial', 'Head Massage'],
  female:        ['Haircut (Layer / Step / Trim)', 'Hair Styling (Straight / Curl / Party)', 'Basic Facial', 'Manicure', 'Pedicure', 'Waxing'],
  unisex:        ['Basic Haircut', 'Haircut (Layer / Step / Trim)', 'Hair Wash', 'Basic Facial', 'Beard Trim', 'Manicure'],
};

/* ─── CSS ─────────────────────────────────────────────────────────── */
const S8_CSS = `
  @keyframes s8-fadeup  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes s8-pop     { 0%{transform:scale(0.88)} 60%{transform:scale(1.07)} 100%{transform:scale(1)} }
  @keyframes s8-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes s8-tabglow { 0%,100%{opacity:0.7} 50%{opacity:1} }
  .s8-fu1 { animation: s8-fadeup 0.4s 0.00s ease both }
  .s8-fu2 { animation: s8-fadeup 0.4s 0.08s ease both }
  .s8-fu3 { animation: s8-fadeup 0.4s 0.16s ease both }
  .s8-card { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); cursor:pointer; }
  .s8-card:hover { transform:translateY(-3px) scale(1.03) !important; }
  .s8-card.sel { animation: s8-pop 0.25s ease; }
  .s8-tab {
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    cursor:pointer; white-space:nowrap; position:relative; outline:none;
  }
  .s8-tab:hover { transform:translateY(-1px) scale(1.03); }
  .s8-tab:active { transform:scale(0.97); }
  .s8-tab-active { animation: s8-pop 0.22s cubic-bezier(0.34,1.56,0.64,1); }
  .s8-cta { transition: transform 0.15s, box-shadow 0.15s; }
  .s8-cta:hover:not(:disabled) { transform:translateY(-2px); }
  .s8-badge-shimmer {
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    background-size: 200% auto;
    animation: s8-shimmer 2.4s linear infinite;
  }
  .s8-tab-glow { animation: s8-tabglow 2s ease infinite; }
  .s8-tabs-scroll::-webkit-scrollbar { display:none; }
  .s8-tabs-scroll { -ms-overflow-style:none; scrollbar-width:none; }
`;

/* ─── Tab icon renderer ─────────────────────────────────────────── */
const TabIcon = ({ tabIcon, color, active, size = 14 }) => {
  const stroke = active ? '#fff' : color;
  const s = size;
  if (tabIcon === 'scissors') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
  if (tabIcon === 'beard') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11c0-4.97 4.03-9 9-9s9 4.03 9 9"/>
      <path d="M3 11c0 5 3 8 5 9l4-4 4 4c2-1 5-4 5-9"/>
      <path d="M9 15c0 1.1.9 2 2 2h2a2 2 0 0 0 0-4h-2a2 2 0 0 0-2 2z"/>
    </svg>
  );
  if (tabIcon === 'face') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9 9h.01M15 9h.01"/>
      <path d="M9 13c.5 1.5 5.5 1.5 6 0"/>
    </svg>
  );
  if (tabIcon === 'body') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v6M9 10H7l1 7h8l1-7h-2"/>
      <path d="M9 17l-1 4M15 17l1 4"/>
    </svg>
  );
  if (tabIcon === 'massage') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c0-4.97 4.03-9 9-9"/>
      <path d="M21 12c0 4.97-4.03 9-9 9"/>
      <path d="M6 17c1-2 3-4 6-4s5 2 6 4"/>
      <circle cx="12" cy="8" r="2"/>
      <path d="M9 11c-.5 1 0 3 1.5 3.5"/>
    </svg>
  );
  // fallback — dot grid
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="1" fill={stroke}/><circle cx="12" cy="8" r="1" fill={stroke}/><circle cx="16" cy="8" r="1" fill={stroke}/>
      <circle cx="8" cy="12" r="1" fill={stroke}/><circle cx="12" cy="12" r="1" fill={stroke}/><circle cx="16" cy="12" r="1" fill={stroke}/>
      <circle cx="8" cy="16" r="1" fill={stroke}/><circle cx="12" cy="16" r="1" fill={stroke}/><circle cx="16" cy="16" r="1" fill={stroke}/>
    </svg>
  );
};

export default function Step8_ServicesSelect() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const categories = useMemo(
    () => getCategoriesForSalonType(data.businessType, data.servedGender),
    [data.businessType, data.servedGender]
  );

  const [activeCategory,   setActiveCategory]   = useState(categories[0]?.key || '');
  const [selected,         setSelected]         = useState(() => new Set(
    data.selectedServices.filter(s => s.categoryKey !== 'custom').map(s => s.serviceName)
  ));
  const [customServices,   setCustomServices]   = useState(() =>
    data.selectedServices.filter(s => s.categoryKey === 'custom').map(s => s.serviceName)
  );
  const [customInput,      setCustomInput]      = useState('');
  const [showCustom,       setShowCustom]       = useState(false);
  const [suggestionBanner, setSuggestionBanner] = useState(!data.quickSetup ? false : true);

  const activeCat     = categories.find(c => c.key === activeCategory) || categories[0];
  const selectedCount = selected.size + customServices.length;
  const typeConf      = SALON_TYPE_CONFIG[data.businessType] || SALON_TYPE_CONFIG.salon;

  /* ── Build the full selectedServices array (standard + custom) ── */
  const buildSelected = (cats, sel, customs) => {
    const result = [];
    cats.forEach(cat =>
      (cat.subServices || []).forEach(s => {
        if (sel.has(s)) result.push({ categoryKey: cat.key, categoryLabel: cat.label, categoryIcon: cat.icon, serviceName: s });
      })
    );
    customs.forEach(name =>
      result.push({ categoryKey: 'custom', categoryLabel: 'Custom', categoryIcon: '✏️', serviceName: name })
    );
    return result;
  };

  /* ── Toggle service ──────────────────────────────────────── */
  const toggleService = (cat, serviceName) => {
    const next = new Set(selected);
    next.has(serviceName) ? next.delete(serviceName) : next.add(serviceName);
    setSelected(next);
    update({ selectedServices: buildSelected(categories, next, customServices) });
  };

  /* ── Quick suggestions ───────────────────────────────────── */
  const applyQuickSuggestions = () => {
    const picks = QUICK_PICKS[data.businessType] || QUICK_PICKS[data.servedGender] || QUICK_PICKS.unisex;
    const next  = new Set([...selected, ...picks]);
    setSelected(next);
    update({ selectedServices: buildSelected(categories, next, customServices) });
    setSuggestionBanner(false);
    toast.success('Suggested services applied!');
  };

  /* ── Custom service: add ─────────────────────────────────── */
  const addCustomService = () => {
    if (!customInput.trim()) return;
    const name = customInput.trim();
    if (selected.has(name) || customServices.includes(name)) { toast.error('Already added'); return; }
    const newCustoms = [...customServices, name];
    setCustomServices(newCustoms);
    update({ selectedServices: buildSelected(categories, selected, newCustoms) });
    setCustomInput('');
    setShowCustom(false);
    toast.success(`"${name}" added!`);
  };

  /* ── Custom service: remove ──────────────────────────────── */
  const removeCustomService = (name) => {
    const newCustoms = customServices.filter(s => s !== name);
    setCustomServices(newCustoms);
    update({ selectedServices: buildSelected(categories, selected, newCustoms) });
  };

  /* ── Continue ────────────────────────────────────────────── */
  const handleNext = () => {
    if (selected.size === 0) { toast.error('Pick at least one service to continue'); return; }
    toast.success('Service menu locked in!');
    nextStep();
  };

  /* ── Theme vars ──────────────────────────────────────────── */
  const surface  = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const border   = isDark ? 'rgba(255,255,255,0.09)'  : '#e5e7eb';
  const textMain = isDark ? '#f1f5f9' : '#0f172a';
  const textSub  = isDark ? '#94a3b8' : '#6b7280';

  const encouragement =
    selectedCount === 0 ? 'Pick at least one service to continue' :
    selectedCount < 5   ? `${selectedCount} service${selectedCount > 1 ? 's' : ''} selected` :
    selectedCount < 12  ? `${selectedCount} services — customers love variety!` :
    `${selectedCount} services — full-service menu! 🏆`;

  return (
    <>
      <style>{S8_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Header ── */}
        <div className="s8-fu1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {/* Salon-type badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 99,
              background: isDark ? `${typeConf.color}22` : `${typeConf.color}15`,
              border: `1px solid ${typeConf.color}44`,
              fontSize: 12, fontWeight: 700, color: typeConf.color,
              letterSpacing: 0.3,
            }}>
              {typeConf.icon} {typeConf.label}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 900, color: textMain, margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            What do you offer?
          </h1>
          <p style={{ color: textSub, fontSize: 13.5, margin: 0 }}>
            Services shown are tailored for your <strong style={{ color: typeConf.color }}>{typeConf.label}</strong>. Select everything you offer — edit anytime.
          </p>
        </div>

        {/* ── Suggestion banner ── */}
        {(data.quickSetup || suggestionBanner) && (
          <div className="s8-fu2" style={{
            background: isDark ? `${typeConf.color}18` : `${typeConf.color}0d`,
            border: `1px solid ${typeConf.color}33`,
            borderRadius: 18, padding: '14px 18px', position: 'relative', overflow: 'hidden',
          }}>
            {/* shimmer overlay */}
            <div className="s8-badge-shimmer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 18 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>✨</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: typeConf.color, margin: '0 0 4px' }}>
                  Popular picks for {typeConf.icon} {typeConf.label}
                </p>
                <p style={{ fontSize: 11.5, color: textSub, margin: '0 0 12px', lineHeight: 1.5 }}>
                  {(QUICK_PICKS[data.businessType] || QUICK_PICKS[data.servedGender] || QUICK_PICKS.unisex).join(' · ')}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={applyQuickSuggestions} style={{
                    padding: '7px 16px', borderRadius: 10,
                    background: typeConf.color, color: '#fff',
                    fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: `0 4px 14px ${typeConf.glow}`,
                  }}>
                    Accept Suggestions
                  </button>
                  <button onClick={() => setSuggestionBanner(false)} style={{
                    padding: '7px 16px', borderRadius: 10,
                    background: 'none', border: `1px solid ${border}`,
                    color: textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Pick manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main panel ── */}
        <div className="s8-fu3" style={{
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: isDark ? `0 0 0 1px ${border}` : `0 8px 40px rgba(0,0,0,0.08)`,
        }}>

          {/* ── Premium Category Tabs ── */}
          <div style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            background: isDark
              ? 'linear-gradient(180deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)'
              : 'linear-gradient(180deg,#fafbff 0%,#f4f6ff 100%)',
            backdropFilter: 'blur(12px)',
          }}>
            {/* Track container — hides scrollbar, shows all tabs */}
            <div className="s8-tabs-scroll" style={{
              display: 'flex', gap: 6, overflowX: 'auto',
              padding: '2px 2px 4px',
            }}>
              {categories.map(cat => {
                const isActive  = activeCategory === cat.key;
                const catCount  = (cat.subServices || []).filter(s => selected.has(s)).length;
                const totalSubs = (cat.subServices || []).length;
                return (
                  <button key={cat.key}
                    className={`s8-tab${isActive ? ' s8-tab-active' : ''}`}
                    onClick={() => setActiveCategory(cat.key)}
                    style={{
                      flexShrink: 0,
                      padding: '9px 18px 9px 14px',
                      borderRadius: 14,
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: isActive ? '0.01em' : '0',
                      border: isActive
                        ? `1.5px solid ${typeConf.color}55`
                        : `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                      background: isActive
                        ? `linear-gradient(135deg, ${typeConf.color}ee 0%, ${typeConf.color}bb 100%)`
                        : (isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.9)'),
                      color: isActive ? '#fff' : (isDark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                      boxShadow: isActive
                        ? `0 4px 18px ${typeConf.glow}, 0 1px 0 rgba(255,255,255,0.18) inset`
                        : `0 1px 3px rgba(0,0,0,0.06)`,
                      transform: isActive ? 'scale(1.04) translateY(-1px)' : 'scale(1)',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>

                    {/* Icon bubble */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: isActive ? 'rgba(255,255,255,0.18)' : (isDark ? 'rgba(255,255,255,0.08)' : `${typeConf.color}12`),
                      transition: 'all 0.2s',
                    }}>
                      {cat.tabIcon
                        ? <TabIcon tabIcon={cat.tabIcon} color={typeConf.color} active={isActive} size={13} />
                        : <span style={{ fontSize: 12 }}>{cat.icon}</span>
                      }
                    </span>

                    {/* Label */}
                    <span>{cat.label.split(' ')[0]}</span>

                    {/* Count badge */}
                    {catCount > 0 ? (
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.28)' : `${typeConf.color}cc`,
                        borderRadius: 99, padding: '1px 7px',
                        fontSize: 9.5, fontWeight: 800, color: '#fff',
                        letterSpacing: '0.02em',
                        boxShadow: isActive ? 'none' : `0 2px 6px ${typeConf.glow}`,
                      }}>
                        {catCount}
                      </span>
                    ) : totalSubs > 0 && !isActive ? (
                      <span style={{
                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                        borderRadius: 99, padding: '1px 6px',
                        fontSize: 9, fontWeight: 600,
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      }}>
                        {totalSubs}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category label row */}
          <div style={{
            padding: '10px 16px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 9,
                background: `${typeConf.color}18`,
              }}>
                {activeCat?.tabIcon
                  ? <TabIcon tabIcon={activeCat.tabIcon} color={typeConf.color} active={false} size={15} />
                  : <span style={{ fontSize: 15 }}>{activeCat?.icon}</span>
                }
              </span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textMain, letterSpacing: '-0.2px' }}>
                {activeCat?.label}
              </p>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 99,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              fontSize: 10.5, fontWeight: 700,
              color: (activeCat?.subServices || []).filter(s => selected.has(s)).length > 0 ? typeConf.color : textSub,
            }}>
              {(activeCat?.subServices || []).filter(s => selected.has(s)).length}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>/{(activeCat?.subServices || []).length}</span>
            </div>
          </div>

          {/* Service grid — sectioned if sections exist, flat otherwise */}
          <div style={{ padding: '10px 14px 14px', maxHeight: 340, overflowY: 'auto' }}>
            {activeCat?.sections ? (
              /* ── Sectioned layout (barbershop etc.) ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activeCat.sections.map(section => (
                  <div key={section.label}>
                    {/* Section divider */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                    }}>
                      <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                      <span style={{
                        fontSize: 9, fontWeight: 900, letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af',
                        padding: '0 4px', whiteSpace: 'nowrap',
                      }}>{section.label}</span>
                      <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
                    </div>
                    {/* Service chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {section.services.map(serviceName => {
                        const on = selected.has(serviceName);
                        return (
                          <button key={serviceName}
                            className={`s8-card${on ? ' sel' : ''}`}
                            onClick={() => toggleService(activeCat, serviceName)}
                            style={{
                              padding: '7px 13px',
                              borderRadius: 99,
                              border: `2px solid ${on ? typeConf.color : (isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb')}`,
                              background: on
                                ? (isDark ? `${typeConf.color}22` : `${typeConf.color}12`)
                                : (isDark ? 'rgba(255,255,255,0.04)' : '#f9f9fc'),
                              color: on ? typeConf.color : textSub,
                              fontWeight: on ? 700 : 500,
                              fontSize: 12,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              boxShadow: on ? `0 0 0 3px ${typeConf.glow}` : 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              lineHeight: 1.2,
                            }}>
                            {on && <span style={{ fontSize: 10, fontWeight: 900 }}>✓</span>}
                            {serviceName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Flat grid layout ── */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 9,
              }}>
                {(activeCat?.subServices || []).map(serviceName => {
                  const on = selected.has(serviceName);
                  return (
                    <button key={serviceName}
                      className={`s8-card${on ? ' sel' : ''}`}
                      onClick={() => toggleService(activeCat, serviceName)}
                      style={{
                        padding: '11px 8px 10px',
                        borderRadius: 14,
                        textAlign: 'center',
                        border: `2px solid ${on ? typeConf.color : (isDark ? 'rgba(255,255,255,0.09)' : '#e5e7eb')}`,
                        background: on
                          ? (isDark ? `${typeConf.color}1a` : `${typeConf.color}0d`)
                          : (isDark ? 'rgba(255,255,255,0.03)' : '#f9f9fc'),
                        color: on ? typeConf.color : textSub,
                        fontWeight: on ? 700 : 500,
                        fontSize: 11.5,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: on ? `0 0 0 3px ${typeConf.glow}` : 'none',
                        position: 'relative',
                        lineHeight: 1.35,
                      }}>
                      {on && (
                        <div style={{
                          position: 'absolute', top: 5, right: 5,
                          width: 15, height: 15, borderRadius: '50%',
                          background: typeConf.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, color: '#fff', fontWeight: 800,
                        }}>✓</div>
                      )}
                      <div style={{ fontSize: 17, marginBottom: 5, filter: on ? 'none' : (isDark ? 'grayscale(0.3)' : 'grayscale(0.2)') }}>
                        {activeCat?.icon || '✂️'}
                      </div>
                      {serviceName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add custom */}
            {!showCustom ? (
              <button onClick={() => setShowCustom(true)} style={{
                marginTop: 10,
                padding: '8px 16px', borderRadius: 99, textAlign: 'center',
                border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.18)' : '#d1d5db'}`,
                background: 'transparent', color: textSub,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Plus size={14} />
                Add Custom Service
              </button>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, padding: '4px 0' }}>
                <input
                  autoFocus
                  placeholder="Service name…"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomService(); if (e.key === 'Escape') setShowCustom(false); }}
                  style={{
                    flex: 1, border: `1.5px solid ${typeConf.color}66`,
                    borderRadius: 10, padding: '10px 12px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                    color: textMain, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button onClick={addCustomService} style={{
                  padding: '0 16px', borderRadius: 10,
                  background: typeConf.color, color: '#fff',
                  fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}>Add</button>
                <button onClick={() => setShowCustom(false)} style={{
                  padding: '0 10px', borderRadius: 10,
                  background: 'none', border: `1px solid ${border}`,
                  color: textSub, cursor: 'pointer', fontFamily: 'inherit',
                }}><X size={14} /></button>
              </div>
            )}
          </div>

          {/* Custom services chip list */}
          {customServices.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderTop: `1px dashed ${border}`,
              display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: textSub, marginRight: 2 }}>✏️ Custom:</span>
              {customServices.map(name => (
                <span key={name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 99,
                  background: isDark ? `${typeConf.color}22` : `${typeConf.color}12`,
                  border: `1px solid ${typeConf.color}44`,
                  fontSize: 11.5, fontWeight: 600, color: typeConf.color,
                }}>
                  {name}
                  <button
                    onClick={() => removeCustomService(name)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', color: typeConf.color, opacity: 0.7,
                    }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Status bar */}
          <div style={{
            padding: '11px 16px',
            borderTop: `1px solid ${border}`,
            background: isDark ? 'rgba(255,255,255,0.02)' : `${typeConf.color}07`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: selectedCount > 0 ? typeConf.color : textSub }}>
              {encouragement}
            </p>
            {selectedCount > 0 && (
              <CheckCircle2 size={16} style={{ color: typeConf.color, flexShrink: 0 }} />
            )}
          </div>
        </div>

        {/* ── Continue button ── */}
        <button className="s8-cta" onClick={handleNext}
          disabled={selected.size === 0}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: selected.size > 0
              ? `linear-gradient(135deg,${typeConf.color},${typeConf.color}aa)`
              : (isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'),
            color: selected.size > 0 ? '#fff' : textSub,
            fontWeight: 800, fontSize: 15.5, border: 'none',
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit',
            boxShadow: selected.size > 0 ? `0 6px 22px ${typeConf.glow}` : 'none',
          }}>
          Continue — Set Prices <ArrowRight size={18} />
        </button>

      </div>
    </>
  );
}
