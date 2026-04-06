import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import { SALON_TYPES } from '../../../constants/salonCategories';

const S4T_CSS = `
  @keyframes s4t-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s4t-pop{0%{transform:scale(0.92)}60%{transform:scale(1.04)}100%{transform:scale(1)}}
  .s4t-fu1{animation:s4t-fadeup 0.45s 0s ease both}
  .s4t-fu2{animation:s4t-fadeup 0.45s 0.08s ease both}
  .s4t-fu3{animation:s4t-fadeup 0.45s 0.16s ease both}
  .s4t-card{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);}
  .s4t-card:hover{transform:translateY(-3px) scale(1.02)!important;}
  .s4t-card.active{animation:s4t-pop 0.25s ease;}
  .s4t-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s4t-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
`;

// Determines which gender label to show when auto-locked
const GENDER_LABELS = { male: 'Men Only', female: 'Women Only', unisex: 'Unisex' };

export default function Step4_SalonType() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [selected, setSelected] = useState(data.salonType || '');
  const [error, setError]       = useState('');

  const handleSelect = (type) => {
    setSelected(type.key);
    setError('');
    // Auto-set served gender if this type dictates it
    if (type.autoGender) {
      update({ salonType: type.key, servedGender: type.autoGender });
    } else {
      update({ salonType: type.key, servedGender: '' }); // reset so owner can choose
    }
  };

  const handleContinue = () => {
    if (!selected) { setError('Please select a salon type to continue'); return; }
    toast.success("Great choice — let's build your salon! 🏠");
    nextStep();
  };

  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
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
        <div className="s4t-fu2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {SALON_TYPES.map((type) => {
            const isActive = selected === type.key;
            return (
              <button
                key={type.key}
                className={`s4t-card${isActive ? ' active' : ''}`}
                onClick={() => handleSelect(type)}
                style={{
                  // last item spans full width when count is odd
                  gridColumn: SALON_TYPES.indexOf(type) === SALON_TYPES.length - 1 && SALON_TYPES.length % 2 !== 0
                    ? '1 / -1' : undefined,
                  padding: '22px 16px',
                  borderRadius: 20,
                  textAlign: 'center',
                  border: `2px solid ${isActive ? type.color : border}`,
                  background: isActive
                    ? (isDark ? `${type.color}1a` : `${type.color}0f`)
                    : (isDark ? 'rgba(255,255,255,0.03)' : '#fafafa'),
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: isActive
                    ? `0 0 0 3px ${type.color}33, 0 4px 20px ${type.color}22`
                    : (isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.05)'),
                  position: 'relative',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Check mark */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 18, height: 18, borderRadius: '50%',
                    background: type.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontWeight: 700,
                  }}>✓</div>
                )}

                {/* Icon bubble */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
                  background: isActive
                    ? (isDark ? `${type.color}28` : `${type.color}18`)
                    : (isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26,
                  border: `1.5px solid ${isActive ? `${type.color}44` : (isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb')}`,
                  transition: 'all 0.18s',
                }}>
                  {type.icon}
                </div>

                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: isActive ? (isDark ? '#fff' : '#111827') : (isDark ? '#94a3b8' : '#374151'),
                  marginBottom: 4,
                }}>
                  {type.label}
                </div>
                <div style={{
                  fontSize: 11, lineHeight: 1.4,
                  color: isActive ? (isDark ? '#cbd5e1' : '#6b7280') : (isDark ? '#64748b' : '#9ca3af'),
                }}>
                  {type.description}
                </div>

                {/* Auto-gender badge */}
                {isActive && type.autoGender && (
                  <div style={{
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
            <span style={{ fontSize: 20 }}>💡</span>
            <p style={{ fontSize: 13, color: isDark ? '#c4b5fd' : '#6d28d9', margin: 0, lineHeight: 1.4 }}>
              <strong>{selectedType.label}</strong> automatically serves{' '}
              <strong>{GENDER_LABELS[selectedType.autoGender]}</strong>.
              You can still customize your services in the next steps.
            </p>
          </div>
        )}

        {/* Continue */}
        <button
          className="s4t-btn s4t-fu3"
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
          Continue — Set Up Your Salon <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
