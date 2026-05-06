import React, { useState } from 'react';
import { ArrowRight, Scissors, Wand2, Waves, FlaskConical, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import { SALON_TYPES } from '../../../constants/salonCategories';

// ── Custom makeup brush SVG — thin handle, ferrule, tapered bristle tip ────────
// Matches lucide's stroke style (strokeWidth 1.5, round caps/joins)
const MakeupBrushIcon = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Long thin handle */}
    <line x1="12" y1="2" x2="12" y2="13" />
    {/* Ferrule — slim metal band */}
    <rect x="10.2" y="13" width="3.6" height="2.5" rx="0.6" />
    {/* Bristles — dome-tapered, premium makeup brush shape */}
    <path d="M9.5 15.5 C8.5 17 8.5 20 12 21.5 C15.5 20 15.5 17 14.5 15.5" />
  </svg>
);

// ── Consistent outline icon map — one style across all 5 types ────────────────
const TYPE_ICONS = {
  barbershop:    Scissors,
  salon:         Wand2,
  spa_wellness:  Waves,
  makeup_bridal: MakeupBrushIcon,
  skin_derma:    FlaskConical,
};

const S4T_CSS = `
  @keyframes s4t-fadeup {from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)}}
  @keyframes s4t-cardin {from{opacity:0;transform:translateY(20px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes s4t-pop    {0%{transform:scale(0.93)} 55%{transform:scale(1.06)} 100%{transform:scale(1.02)}}
  @keyframes s4t-check  {from{opacity:0;transform:scale(0) rotate(-45deg)} to{opacity:1;transform:scale(1) rotate(0)}}
  @keyframes s4t-badge  {from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)}}
  @keyframes s4t-glow   {0%,100%{box-shadow:0 0 0 3px var(--gc)33, 0 4px 20px var(--gc)22} 50%{box-shadow:0 0 0 4px var(--gc)44, 0 6px 28px var(--gc)33}}
  @keyframes s4t-pulse  {0%,100%{box-shadow:0 4px 20px rgba(124,58,237,0.4)} 50%{box-shadow:0 4px 30px rgba(124,58,237,0.65),0 0 0 4px rgba(124,58,237,0.15)}}

  .s4t-fu1{animation:s4t-fadeup 0.45s 0s ease both}
  .s4t-fu3{animation:s4t-fadeup 0.45s 0.2s ease both}

  /* Cards — staggered entrance */
  .s4t-card-0{animation:s4t-cardin 0.4s 0.08s ease both}
  .s4t-card-1{animation:s4t-cardin 0.4s 0.14s ease both}
  .s4t-card-2{animation:s4t-cardin 0.4s 0.20s ease both}
  .s4t-card-3{animation:s4t-cardin 0.4s 0.26s ease both}
  .s4t-card-4{animation:s4t-cardin 0.4s 0.32s ease both}

  /* Base card interactions */
  .s4t-card{
    transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
               box-shadow 0.2s ease, border-color 0.18s ease, background 0.2s ease;
  }
  .s4t-card:hover{transform:translateY(-4px) scale(1.025)!important;}
  .s4t-card:active{transform:scale(0.95)!important;transition:transform 0.09s ease!important;}
  .s4t-card.selected-pop{animation:s4t-pop 0.26s cubic-bezier(0.34,1.56,0.64,1) both;}

  /* Icon bubble inside card — lifts on hover */
  .s4t-card:hover .s4t-icon{transform:translateY(-2px) scale(1.08);transition:transform 0.18s ease;}
  .s4t-icon{transition:transform 0.18s ease, background 0.2s ease;}

  /* Check badge entrance */
  .s4t-check{animation:s4t-check 0.2s cubic-bezier(0.34,1.56,0.64,1) both;}

  /* Auto-gender badge entrance */
  .s4t-badge{animation:s4t-badge 0.25s 0.1s ease both;}

  /* Active (selected) card pulsing glow */
  .s4t-glow{animation:s4t-glow 2.4s ease-in-out infinite;}

  /* Continue button */
  .s4t-btn{transition:transform 0.18s ease, box-shadow 0.18s ease;}
  .s4t-btn.ready{animation:s4t-pulse 2.2s ease-in-out infinite;}
  .s4t-btn:hover:not(:disabled){transform:translateY(-2px)!important;}
  .s4t-btn:active:not(:disabled){transform:scale(0.97)!important;transition:transform 0.09s ease!important;}
`;

const GENDER_LABELS = { male: 'Men Only', female: 'Women Only', unisex: 'Unisex' };

export default function Step4_SalonType() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [selected, setSelected] = useState(data.businessType || '');
  const [error, setError]       = useState('');

  const handleSelect = (type) => {
    setSelected(type.key);
    setError('');
    if (type.autoGender) {
      update({ businessType: type.key, servedGender: type.autoGender });
    } else {
      update({ businessType: type.key, servedGender: '' });
    }
  };

  const handleContinue = () => {
    if (!selected) { setError('Please select your business type to continue'); return; }
    const label = SALON_TYPES.find(t => t.key === selected)?.label || 'business';
    toast.success(`Great choice — let's build your ${label}!`);
    nextStep();
  };

  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  const selectedType = SALON_TYPES.find(t => t.key === selected);

  return (
    <>
      <style>{S4T_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="s4t-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            What describes you best?
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Choose the sanctuary that best describes your craft. This helps us tailor your experience.
          </p>
        </div>

        {/* Type grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {SALON_TYPES.map((type, idx) => {
            const isActive     = selected === type.key;
            const isComingSoon = !!type.comingSoon;
            const Icon         = TYPE_ICONS[type.key];
            const isLast       = idx === SALON_TYPES.length - 1;
            const spanFull     = isLast && SALON_TYPES.length % 2 !== 0;

            return (
              <button
                key={type.key}
                className={`s4t-card s4t-card-${idx}${isActive ? ' selected-pop s4t-glow' : ''}`}
                onClick={() => !isComingSoon && handleSelect(type)}
                disabled={isComingSoon}
                style={{
                  '--gc': type.color,
                  gridColumn: spanFull ? '1 / -1' : undefined,
                  maxWidth:   spanFull ? 260 : undefined,
                  margin:     spanFull ? '0 auto' : undefined,
                  width:      spanFull ? '100%' : undefined,
                  padding: '22px 16px',
                  borderRadius: 20,
                  textAlign: 'center',
                  border: `2px solid ${isComingSoon ? (isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb') : isActive ? type.color : border}`,
                  background: isComingSoon
                    ? (isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb')
                    : isActive
                      ? (isDark ? `${type.color}1a` : `${type.color}0f`)
                      : (isDark ? 'rgba(255,255,255,0.03)' : '#fafafa'),
                  cursor: isComingSoon ? 'not-allowed' : 'pointer',
                  opacity: isComingSoon ? 0.55 : 1,
                  fontFamily: 'inherit',
                  boxShadow: isActive
                    ? `0 0 0 3px ${type.color}33, 0 4px 20px ${type.color}22`
                    : (isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.05)'),
                  position: 'relative',
                }}
              >
                {/* Coming Soon badge */}
                {isComingSoon && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    padding: '2px 8px', borderRadius: 99,
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                    color: isDark ? '#64748b' : '#9ca3af',
                    textTransform: 'uppercase',
                  }}>
                    Coming Soon
                  </div>
                )}

                {/* Animated check mark */}
                {isActive && (
                  <div className="s4t-check" style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 20, height: 20, borderRadius: '50%',
                    background: type.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontWeight: 700,
                    boxShadow: `0 2px 8px ${type.color}55`,
                  }}>✓</div>
                )}

                {/* Icon bubble */}
                <div className="s4t-icon" style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
                  background: isActive
                    ? (isDark ? `${type.color}28` : `${type.color}18`)
                    : (isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${isActive ? `${type.color}55` : (isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb')}`,
                }}>
                  <Icon
                    size={24}
                    strokeWidth={1.5}
                    color={isComingSoon ? (isDark ? '#475569' : '#d1d5db') : isActive ? type.color : (isDark ? '#64748b' : '#9ca3af')}
                  />
                </div>

                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: isComingSoon
                    ? (isDark ? '#475569' : '#d1d5db')
                    : isActive ? (isDark ? '#fff' : '#111827') : (isDark ? '#94a3b8' : '#374151'),
                  marginBottom: 4,
                  transition: 'color 0.18s',
                }}>
                  {type.label}
                </div>
                <div style={{
                  fontSize: 11, lineHeight: 1.4,
                  color: isComingSoon
                    ? (isDark ? '#334155' : '#e5e7eb')
                    : isActive ? (isDark ? '#cbd5e1' : '#6b7280') : (isDark ? '#64748b' : '#9ca3af'),
                  transition: 'color 0.18s',
                }}>
                  {type.description}
                </div>

                {/* Auto-gender badge */}
                {isActive && type.autoGender && (
                  <div className="s4t-badge" style={{
                    marginTop: 10,
                    display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                    background: `${type.color}22`, border: `1px solid ${type.color}44`,
                    fontSize: 10, fontWeight: 700, color: type.color,
                  }}>
                    Serves: {GENDER_LABELS[type.autoGender]}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="s4t-fu2" style={{ color: '#f87171', fontSize: 12, margin: '-8px 0 0', textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Info banner when auto-gender is set */}
        {selectedType?.autoGender && (
          <div className="s4t-fu3" style={{
            background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(124,58,237,0.05)',
            border: `1px solid ${isDark ? 'rgba(139,92,246,0.25)' : 'rgba(124,58,237,0.2)'}`,
            borderRadius: 14, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Info size={18} strokeWidth={1.5} color={isDark ? '#a78bfa' : '#7c3aed'} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: isDark ? '#c4b5fd' : '#6d28d9', margin: 0, lineHeight: 1.4 }}>
              <strong>{selectedType.label}</strong> automatically serves{' '}
              <strong>{GENDER_LABELS[selectedType.autoGender]}</strong>.
              You can still customize your services in the next steps.
            </p>
          </div>
        )}

        {/* Continue */}
        <button
          className={`s4t-btn s4t-fu3${selected ? ' ready' : ''}`}
          onClick={handleContinue}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: selected
              ? 'linear-gradient(135deg,#7c3aed,#ec4899)'
              : (isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'),
            color: selected ? '#fff' : sub,
            fontWeight: 700, fontSize: 16, border: 'none',
            cursor: selected ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit',
            boxShadow: selected ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
          }}
        >
          {selected ? `Continue — Set Up Your ${SALON_TYPES.find(t => t.key === selected)?.label || 'Business'}` : 'Select a type to continue'} <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
