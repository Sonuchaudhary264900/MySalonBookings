import React, { useState, useMemo } from 'react';
import { ArrowRight, Plus, X, CheckCircle2 } from 'lucide-react';
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
  .s8-fu1 { animation: s8-fadeup 0.4s 0.00s ease both }
  .s8-fu2 { animation: s8-fadeup 0.4s 0.08s ease both }
  .s8-fu3 { animation: s8-fadeup 0.4s 0.16s ease both }
  .s8-card { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); cursor:pointer; }
  .s8-card:hover { transform:translateY(-3px) scale(1.03) !important; }
  .s8-card.sel { animation: s8-pop 0.25s ease; }
  .s8-tab { transition: all 0.15s; cursor:pointer; white-space:nowrap; }
  .s8-tab:hover { opacity:0.85; }
  .s8-cta { transition: transform 0.15s, box-shadow 0.15s; }
  .s8-cta:hover:not(:disabled) { transform:translateY(-2px); }
  .s8-badge-shimmer {
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    background-size: 200% auto;
    animation: s8-shimmer 2.4s linear infinite;
  }
`;

export default function Step8_ServicesSelect() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const categories = useMemo(
    () => getCategoriesForSalonType(data.salonType, data.servedGender),
    [data.salonType, data.servedGender]
  );

  const [activeCategory,    setActiveCategory]    = useState(categories[0]?.key || '');
  const [selected,          setSelected]          = useState(() => new Set(data.selectedServices.map(s => s.serviceName)));
  const [customInput,       setCustomInput]       = useState('');
  const [showCustom,        setShowCustom]        = useState(false);
  const [suggestionBanner,  setSuggestionBanner]  = useState(!data.quickSetup ? false : true);

  const activeCat     = categories.find(c => c.key === activeCategory) || categories[0];
  const selectedCount = selected.size;
  const typeConf      = SALON_TYPE_CONFIG[data.salonType] || SALON_TYPE_CONFIG.salon;

  /* ── Toggle service ──────────────────────────────────────── */
  const toggleService = (cat, serviceName) => {
    const next = new Set(selected);
    next.has(serviceName) ? next.delete(serviceName) : next.add(serviceName);
    setSelected(next);
    update({ selectedServices: buildSelected(categories, next) });
  };

  const buildSelected = (cats, sel) => {
    const result = [];
    cats.forEach(cat =>
      (cat.subServices || []).forEach(s => {
        if (sel.has(s)) result.push({ categoryKey: cat.key, categoryLabel: cat.label, categoryIcon: cat.icon, serviceName: s });
      })
    );
    return result;
  };

  /* ── Quick suggestions ───────────────────────────────────── */
  const applyQuickSuggestions = () => {
    const picks = QUICK_PICKS[data.salonType] || QUICK_PICKS[data.servedGender] || QUICK_PICKS.unisex;
    const next  = new Set([...selected, ...picks]);
    setSelected(next);
    update({ selectedServices: buildSelected(categories, next) });
    setSuggestionBanner(false);
    toast.success('Suggested services applied!');
  };

  /* ── Custom service ──────────────────────────────────────── */
  const addCustomService = () => {
    if (!customInput.trim()) return;
    const name = customInput.trim();
    if (selected.has(name)) { toast.error('Already added'); return; }
    const next = new Set([...selected, name]);
    setSelected(next);
    update({ selectedServices: [...data.selectedServices, { categoryKey: 'custom', categoryLabel: 'Custom', categoryIcon: '✏️', serviceName: name }] });
    setCustomInput('');
    setShowCustom(false);
    toast.success(`"${name}" added!`);
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
                  {(QUICK_PICKS[data.salonType] || QUICK_PICKS[data.servedGender] || QUICK_PICKS.unisex).join(' · ')}
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

          {/* Category tabs */}
          <div style={{
            padding: '12px 14px',
            borderBottom: `1px solid ${border}`,
            display: 'flex', gap: 8, overflowX: 'auto',
            background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa',
          }}>
            {categories.map(cat => {
              const isActive = activeCategory === cat.key;
              const catCount = (cat.subServices || []).filter(s => selected.has(s)).length;
              return (
                <button key={cat.key} className="s8-tab"
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    padding: '7px 16px', borderRadius: 99, flexShrink: 0,
                    fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit',
                    border: `2px solid ${isActive ? typeConf.color : 'transparent'}`,
                    background: isActive
                      ? `linear-gradient(135deg,${typeConf.color},${typeConf.color}cc)`
                      : (isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f8'),
                    color: isActive ? '#fff' : textSub,
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 3px 14px ${typeConf.glow}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label.split(' ')[0]}</span>
                  {catCount > 0 && (
                    <span style={{
                      background: isActive ? 'rgba(255,255,255,0.3)' : '#10b981',
                      borderRadius: 99, padding: '1px 7px',
                      fontSize: 10, fontWeight: 800, color: '#fff',
                    }}>
                      {catCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category label row */}
          <div style={{
            padding: '10px 16px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textSub }}>
              {activeCat?.icon} {activeCat?.label}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: textSub }}>
              {(activeCat?.subServices || []).filter(s => selected.has(s)).length} / {(activeCat?.subServices || []).length} selected
            </p>
          </div>

          {/* Service grid */}
          <div style={{
            padding: '12px 14px 14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 9,
            maxHeight: 320,
            overflowY: 'auto',
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
                  {/* Checkmark badge */}
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

            {/* Add custom */}
            {!showCustom ? (
              <button onClick={() => setShowCustom(true)} style={{
                padding: '11px 8px', borderRadius: 14, textAlign: 'center',
                border: `2px dashed ${isDark ? 'rgba(255,255,255,0.14)' : '#d1d5db'}`,
                background: 'transparent', color: textSub,
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <Plus size={18} />
                Add Custom
              </button>
            ) : (
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, padding: '4px 0' }}>
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
