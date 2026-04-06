import React, { useState, useMemo } from 'react';
import { ArrowRight, Sparkles, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import { getCategoriesForSalonType } from '../../../constants/salonCategories';

const S8_CSS = `
  @keyframes s8-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s8-pop{0%{transform:scale(0.9)}60%{transform:scale(1.06)}100%{transform:scale(1)}}
  .s8-fu1{animation:s8-fadeup 0.45s 0s ease both}
  .s8-fu2{animation:s8-fadeup 0.45s 0.1s ease both}
  .s8-card{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;}
  .s8-card:hover{transform:scale(1.03)!important;}
  .s8-card.selected{animation:s8-pop 0.25s ease}
  .s8-cat{transition:all 0.15s;cursor:pointer;}
  .s8-cat:hover{opacity:0.85}
  .s8-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s8-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
`;

/* ─── Recommended sets by salon type / gender ─────────────────── */
const QUICK_PICKS = {
  // By salon type (takes priority when salonType is set)
  barbershop:    ['Basic Haircut', 'Fade / Taper / Skin Fade', 'Beard Trim', 'Clean Shave', 'Hot Towel Shave', 'Hair Styling'],
  makeup_bridal: ['Bridal Makeup', 'Party Makeup', 'Saree Draping', 'Trial Makeup', 'Manicure', 'Nail Art'],
  spa_wellness:  ['Head Massage', 'Full Body Massage', 'Body Scrub', 'Foot Massage', 'Aromatherapy Massage', 'Body Spa'],
  skin_derma:    ['Basic Facial', 'Clean-up', 'Anti-Acne Treatment', 'Skin Brightening', 'General Skin Consultation', 'Acne Scar Treatment'],
  // Fallback by served gender
  male:          ['Basic Haircut', 'Beard Trim', 'Clean Shave', 'Hair Wash', 'Basic Facial', 'Head Massage'],
  female:        ['Haircut (Layer / Step / Trim)', 'Hair Styling (Straight / Curl / Party)', 'Basic Facial', 'Manicure', 'Pedicure', 'Waxing'],
  unisex:        ['Basic Haircut', 'Haircut (Layer / Step / Trim)', 'Hair Wash', 'Basic Facial', 'Beard Trim', 'Manicure'],
};

export default function Step8_ServicesSelect() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const categories = useMemo(() => {
    return getCategoriesForSalonType(data.salonType, data.servedGender);
  }, [data.salonType, data.servedGender]);

  const [activeCategory, setActiveCategory] = useState(categories[0]?.key || '');
  const [selected, setSelected]             = useState(() => new Set(data.selectedServices.map(s => s.serviceName)));
  const [customInput, setCustomInput]       = useState('');
  const [showCustom, setShowCustom]         = useState(false);
  const [suggestionBanner, setSuggestionBanner] = useState(!data.quickSetup ? false : true);

  const activeCat = categories.find(c => c.key === activeCategory) || categories[0];

  const toggleService = (cat, serviceName) => {
    const next = new Set(selected);
    if (next.has(serviceName)) next.delete(serviceName);
    else next.add(serviceName);
    setSelected(next);
    update({ selectedServices: buildSelected(categories, next) });
  };

  const buildSelected = (cats, selectedSet) => {
    const result = [];
    cats.forEach(cat => {
      (cat.subServices || []).forEach(s => {
        if (selectedSet.has(s)) {
          result.push({ categoryKey: cat.key, categoryLabel: cat.label, categoryIcon: cat.icon, serviceName: s });
        }
      });
    });
    return result;
  };

  const applyQuickSuggestions = () => {
    const picks = QUICK_PICKS[data.salonType] || QUICK_PICKS[data.servedGender] || QUICK_PICKS.unisex;
    const next  = new Set([...selected, ...picks]);
    setSelected(next);
    const all = buildSelected(categories, next);
    update({ selectedServices: all });
    setSuggestionBanner(false);
    toast.success('Suggested services applied! ✓');
  };

  const addCustomService = () => {
    if (!customInput.trim()) return;
    const name = customInput.trim();
    if (selected.has(name)) { toast.error('Already added'); return; }
    const next = new Set([...selected, name]);
    setSelected(next);
    const custom = { categoryKey: 'custom', categoryLabel: 'Custom', categoryIcon: '✏️', serviceName: name };
    update({ selectedServices: [...data.selectedServices, custom] });
    setCustomInput('');
    setShowCustom(false);
    toast.success(`"${name}" added!`);
  };

  const handleNext = () => {
    if (selected.size === 0) { toast.error('Please select at least one service'); return; }
    toast.success('Your service menu is live! 🎯');
    nextStep();
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';

  const selectedCount = selected.size;

  const encouragement =
    selectedCount === 0 ? 'Pick at least one service to continue' :
    selectedCount < 5   ? `${selectedCount} service${selectedCount > 1 ? 's' : ''} selected` :
    selectedCount < 10  ? `${selectedCount} services selected ✓ — customers love variety!` :
    `Wow, a full-service salon! 🏆 (${selectedCount} services)`;

  return (
    <>
      <style>{S8_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div className="s8-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            What services do you offer? 💆
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0 }}>
            Select everything you offer. You can edit this anytime from your dashboard.
          </p>
        </div>

        {/* AI suggestion banner */}
        {(data.quickSetup || suggestionBanner) && (
          <div className="s8-fu1" style={{
            background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(124,58,237,0.06)',
            border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(124,58,237,0.2)'}`,
            borderRadius: 16, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#c4b5fd' : '#6d28d9', margin: '0 0 4px' }}>
                  We suggest these for your {data.salonType ? data.salonType.replace('_', ' ') : (data.servedGender || 'unisex') + ' salon'}
                </p>
                <p style={{ fontSize: 12, color: sub, margin: '0 0 10px', lineHeight: 1.4 }}>
                  {(QUICK_PICKS[data.salonType] || QUICK_PICKS[data.servedGender] || QUICK_PICKS.unisex).join(', ')}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={applyQuickSuggestions} style={{ padding: '6px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Accept Suggestions
                  </button>
                  <button onClick={() => setSuggestionBanner(false)} style={{ padding: '6px 14px', borderRadius: 10, background: 'none', border: `1px solid ${border}`, color: sub, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Pick manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="s8-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)' }}>

          {/* Category tabs */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 8, overflowX: 'auto' }}>
            {categories.map(cat => (
              <button key={cat.key} className="s8-cat"
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '6px 14px', borderRadius: 99, flexShrink: 0,
                  fontWeight: 600, fontSize: 12, fontFamily: 'inherit',
                  border: `2px solid ${activeCategory === cat.key ? '#7c3aed' : 'transparent'}`,
                  background: activeCategory === cat.key ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f0ff'),
                  color: activeCategory === cat.key ? '#fff' : sub,
                  cursor: 'pointer',
                  boxShadow: activeCategory === cat.key ? '0 2px 12px rgba(124,58,237,0.3)' : 'none',
                }}>
                {cat.icon} {cat.label.split(' ')[0]}
                {/* Count badge */}
                {(cat.subServices || []).filter(s => selected.has(s)).length > 0 && (
                  <span style={{ marginLeft: 5, background: '#10b981', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                    {(cat.subServices || []).filter(s => selected.has(s)).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Service grid */}
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
            {(activeCat?.subServices || []).map((serviceName, i) => {
              const on = selected.has(serviceName);
              return (
                <button key={serviceName}
                  className={`s8-card${on ? ' selected' : ''}`}
                  onClick={() => toggleService(activeCat, serviceName)}
                  style={{
                    padding: '12px 10px', borderRadius: 14, textAlign: 'center',
                    border: `2px solid ${on ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
                    background: on ? (isDark ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.07)') : (isDark ? 'rgba(255,255,255,0.03)' : '#fafafa'),
                    color: on ? (isDark ? '#c4b5fd' : '#6d28d9') : sub,
                    fontWeight: on ? 700 : 500, fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: on ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                    transform: on ? 'scale(1.03)' : 'scale(1)',
                    position: 'relative',
                    transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                  {on && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</div>
                  )}
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{activeCat?.icon || '✂️'}</div>
                  {serviceName}
                </button>
              );
            })}

            {/* Custom service */}
            {!showCustom ? (
              <button onClick={() => setShowCustom(true)}
                style={{
                  padding: '12px 10px', borderRadius: 14, textAlign: 'center',
                  border: `2px dashed ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                  background: 'transparent', color: sub, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <Plus size={20} style={{ margin: '0 auto 4px', display: 'block' }} />
                Add Custom
              </button>
            ) : (
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, padding: '4px 0' }}>
                <input
                  autoFocus
                  placeholder="Custom service name"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomService(); if (e.key === 'Escape') setShowCustom(false); }}
                  style={{
                    flex: 1, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db'}`,
                    borderRadius: 10, padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                    color: text, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button onClick={addCustomService} style={{ padding: '0 16px', borderRadius: 10, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                <button onClick={() => setShowCustom(false)} style={{ padding: '0 10px', borderRadius: 10, background: 'none', border: `1px solid ${border}`, color: sub, cursor: 'pointer', fontFamily: 'inherit' }}><X size={14} /></button>
              </div>
            )}
          </div>

          {/* Count bar */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#f9f7ff' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: selectedCount > 0 ? '#a855f7' : sub }}>
              {encouragement}
            </p>
          </div>
        </div>

        {/* Continue */}
        <button className="s8-btn" onClick={handleNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: selected.size > 0 ? 'linear-gradient(135deg,#7c3aed,#ec4899)' : (isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'),
            color: selected.size > 0 ? '#fff' : sub,
            fontWeight: 700, fontSize: 16, border: 'none',
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit',
            boxShadow: selected.size > 0 ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
          }}>
          Continue — Set Prices <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
