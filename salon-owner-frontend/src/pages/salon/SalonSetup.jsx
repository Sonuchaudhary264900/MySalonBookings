import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, SkipForward, Sparkles, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSalon } from '../../hooks/useSalon';
import { useTheme } from '../../context/ThemeContext';
import { MALE_CATEGORIES, FEMALE_CATEGORIES, UNISEX_CATEGORIES } from '../../constants/salonCategories';
import api from '../../services/api';
import ROUTES from '../../routes';

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const CSS = `
  @keyframes ss-fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ss-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(50px,-40px) scale(1.1)}70%{transform:translate(-30px,25px) scale(0.92)}}
  @keyframes ss-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-50px,40px) scale(1.08)}65%{transform:translate(35px,-25px) scale(0.94)}}

  .ss-cat-btn{
    display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;width:100%;
    border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);
    cursor:pointer;transition:all 0.2s;text-align:left;font-family:inherit;color:#94a3b8;
  }
  .ss-cat-btn:hover{border-color:rgba(99,102,241,0.5);background:rgba(99,102,241,0.08);color:#a5b4fc;transform:translateY(-1px);}
  .ss-cat-btn.active{border-color:#6366f1;background:rgba(99,102,241,0.15);color:#a5b4fc;box-shadow:0 4px 18px rgba(99,102,241,0.25);}

  [data-lm] .ss-cat-btn{border-color:#e5e7eb;background:#fff;color:#374151;}
  [data-lm] .ss-cat-btn:hover{border-color:#6366f1;background:#eef2ff;color:#4338ca;}
  [data-lm] .ss-cat-btn.active{border-color:#6366f1;background:#eef2ff;color:#4338ca;box-shadow:0 4px 16px rgba(99,102,241,0.15);}
`;

/* ─── Which categories to show based on servedGender ─── */
function getCategoriesForGender(gender) {
  if (gender === 'male')   return MALE_CATEGORIES;
  if (gender === 'female') return FEMALE_CATEGORIES;
  return UNISEX_CATEGORIES; // unisex
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function SalonSetup() {
  const navigate  = useNavigate();
  const { salon, fetchSalon } = useSalon();
  const { isDark } = useTheme();

  const gender     = salon?.servedGender || 'unisex';
  const categories = getCategoriesForGender(gender);

  const [selected, setSelected] = useState(new Set());
  const [saving,   setSaving]   = useState(false);

  const toggle = (key) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectAll = () => setSelected(new Set(categories.map(c => c.key)));

  /* Save offeredCategories then go to services page */
  const handleSave = async (skip = false) => {
    setSaving(true);
    try {
      if (!skip && selected.size > 0) {
        const offered = categories
          .filter(c => selected.has(c.key))
          .map(c => ({ name: c.label, subServices: (c.subServices || []).map(s => ({ name: s, price: 0, duration: 30 })) }));
        await api.put('/owner/salon', { offeredCategories: offered });
        await fetchSalon();
        toast.success('Categories saved!');
        navigate(ROUTES.SERVICES);   // go set up services next
      } else {
        navigate(ROUTES.DASHBOARD);  // skip → dashboard
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* Theme tokens */
  const bg         = isDark ? '#07071a' : '#f1f4ff';
  const cardBg     = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder = isDark ? '1.5px solid rgba(255,255,255,0.09)' : '1.5px solid #e5e7eb';
  const cardShadow = isDark ? 'none' : '0 10px 48px rgba(99,102,241,0.1), 0 2px 10px rgba(0,0,0,0.06)';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textMuted   = isDark ? 'rgba(255,255,255,0.5)' : '#4b5563';
  const textFaint   = isDark ? 'rgba(255,255,255,0.32)' : '#9ca3af';
  const orbColor1   = isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)';
  const orbColor2   = isDark ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.08)';
  const checkboxBg  = isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff';

  const genderLabel = gender === 'male' ? 'Men\'s Services' : gender === 'female' ? 'Women\'s Services' : 'All Services (Unisex)';

  return (
    <>
      <style>{CSS}</style>
      <div
        data-lm={isDark ? undefined : '1'}
        style={{
          minHeight:'100vh', background:bg, position:'relative', overflow:'hidden',
          fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
        }}
      >
        {/* Orbs */}
        <div style={{ position:'fixed',top:'-15%',left:'-8%',width:520,height:520,borderRadius:'50%',background:`radial-gradient(circle,${orbColor1} 0%,transparent 70%)`,animation:'ss-orb1 20s ease-in-out infinite',pointerEvents:'none',zIndex:0 }} />
        <div style={{ position:'fixed',bottom:'-15%',right:'-8%',width:440,height:440,borderRadius:'50%',background:`radial-gradient(circle,${orbColor2} 0%,transparent 70%)`,animation:'ss-orb2 24s ease-in-out infinite',pointerEvents:'none',zIndex:0 }} />

        <div style={{ position:'relative',zIndex:1,maxWidth:680,margin:'0 auto',padding:'48px 16px 80px' }}>

          {/* Header */}
          <div style={{ textAlign:'center',marginBottom:36,animation:'ss-fadeup 0.4s ease' }}>
            <div style={{ width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 28px rgba(99,102,241,0.4)' }}>
              <Sparkles size={26} color="#fff" />
            </div>
            <h1 style={{ fontSize:26,fontWeight:800,color:textPrimary,margin:'0 0 8px',letterSpacing:'-0.5px' }}>
              Set Up Your Service Menu
            </h1>
            <p style={{ color:textMuted,fontSize:14,margin:0,maxWidth:440,marginLeft:'auto',marginRight:'auto' }}>
              You're approved! Select the service categories your salon offers. You can always update this later from Settings.
            </p>
            <div style={{ display:'inline-flex',alignItems:'center',gap:6,marginTop:12,padding:'6px 14px',borderRadius:20,background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid #c7d2fe' }}>
              <span style={{ fontSize:13,color: isDark ? '#a5b4fc' : '#4338ca',fontWeight:600 }}>
                {gender === 'male' ? '♂' : gender === 'female' ? '♀' : '⚥'} {genderLabel}
              </span>
            </div>
          </div>

          {/* Card */}
          <div style={{ background:cardBg,border:cardBorder,borderRadius:20,overflow:'hidden',boxShadow:cardShadow,animation:'ss-fadeup 0.45s ease 0.08s both' }}>
            <div style={{ padding:'28px 28px 24px' }}>

              {/* Section header */}
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                <div>
                  <p style={{ margin:0,fontWeight:700,fontSize:15,color:textPrimary }}>
                    Which services do you offer?
                  </p>
                  <p style={{ margin:'3px 0 0',fontSize:13,color:textFaint }}>
                    Select all that apply — you'll add prices in the next step
                  </p>
                </div>
                <button
                  onClick={selectAll}
                  style={{ background:'none',border:'none',fontSize:12,fontWeight:700,color: isDark ? '#a5b4fc' : '#6366f1',cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',padding:'4px 8px' }}
                >
                  Select All
                </button>
              </div>

              {/* Category grid */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10 }}>
                {categories.map(cat => {
                  const isOn = selected.has(cat.key);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      className={`ss-cat-btn${isOn ? ' active' : ''}`}
                      onClick={() => toggle(cat.key)}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width:22,height:22,borderRadius:6,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        background: isOn ? '#6366f1' : checkboxBg,
                        border: isOn ? '2px solid #6366f1' : `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                        transition:'all 0.15s',
                      }}>
                        {isOn && <Check size={13} color="#fff" strokeWidth={3} />}
                      </div>

                      {/* Icon + Label */}
                      <span style={{ fontSize:20,lineHeight:1,flexShrink:0 }}>{cat.icon}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ margin:0,fontSize:13,fontWeight:700,lineHeight:1.3 }}>{cat.label}</p>
                        <p style={{ margin:'2px 0 0',fontSize:11,opacity:0.6,lineHeight:1.3 }}>
                          {cat.subServices?.length || 0} sub-services
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected summary */}
              {selected.size > 0 && (
                <div style={{ marginTop:16,padding:'10px 14px',borderRadius:10,background: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid #bbf7d0',display:'flex',alignItems:'center',gap:8 }}>
                  <Check size={14} color={isDark ? '#86efac' : '#16a34a'} />
                  <span style={{ fontSize:13,color: isDark ? '#86efac' : '#15803d',fontWeight:600 }}>
                    {selected.size} categor{selected.size === 1 ? 'y' : 'ies'} selected
                  </span>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding:'20px 28px',borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f3f4f6',display:'flex',gap:12,flexWrap:'wrap' }}>
              {/* Skip */}
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{
                  display:'inline-flex',alignItems:'center',gap:6,padding:'12px 20px',borderRadius:12,
                  background:'none',border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e5e7eb',
                  color:textMuted,fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'inherit',
                  transition:'all 0.15s',
                }}
              >
                <SkipForward size={15} />
                Skip for now
              </button>

              {/* Continue */}
              <button
                onClick={() => handleSave(false)}
                disabled={saving || selected.size === 0}
                style={{
                  flex:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,
                  padding:'13px 24px',borderRadius:12,border:'none',
                  background: selected.size === 0 ? (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6') : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: selected.size === 0 ? textFaint : '#fff',
                  fontWeight:700,fontSize:15,cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                  fontFamily:'inherit',letterSpacing:'-0.2px',
                  boxShadow: selected.size > 0 ? '0 6px 22px rgba(99,102,241,0.4)' : 'none',
                  transition:'all 0.2s',
                }}
              >
                {saving ? 'Saving…' : (
                  <>Save & Set Up Services <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>

          {/* Info note */}
          <p style={{ textAlign:'center',marginTop:20,fontSize:12,color:textFaint }}>
            You can update your service categories anytime from <strong style={{ color: isDark ? '#a5b4fc' : '#6366f1' }}>Dashboard → Settings</strong>
          </p>
        </div>
      </div>
    </>
  );
}
