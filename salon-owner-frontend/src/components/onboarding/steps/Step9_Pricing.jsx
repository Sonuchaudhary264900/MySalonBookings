import React, { useState } from 'react';
import { ArrowRight, Sparkles, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const S9_CSS = `
  @keyframes s9-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s9-count-up{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
  @keyframes s9-flash{0%{background:rgba(124,58,237,0.2)}100%{background:transparent}}
  .s9-fu1{animation:s9-fadeup 0.45s 0s ease both}
  .s9-fu2{animation:s9-fadeup 0.45s 0.1s ease both}
  .s9-inp{border-radius:10px;padding:9px 12px;font-size:16px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box;font-family:inherit;font-weight:700;}
  .s9-inp:focus{border-color:#7c3aed!important;box-shadow:0 0 0 2px rgba(124,58,237,0.15)!important;}
  .s9-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s9-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
  .s9-row{transition:background 0.2s;}
  .s9-row:hover{background:rgba(124,58,237,0.05)!important;}
`;

// Suggested prices per service type (simple heuristic)
const PRICE_HINTS = {
  'Basic Haircut': { price: 150, duration: 30 },
  'Fade / Taper / Skin Fade': { price: 250, duration: 40 },
  'Designer Haircut': { price: 350, duration: 45 },
  'Beard Trim': { price: 100, duration: 20 },
  'Clean Shave': { price: 80, duration: 20 },
  'Hair Styling': { price: 200, duration: 30 },
  'Hair Coloring': { price: 800, duration: 90 },
  'Hair Spa': { price: 500, duration: 60 },
  'Basic Facial': { price: 400, duration: 45 },
  'Gold Facial': { price: 800, duration: 60 },
  'Head Massage': { price: 200, duration: 30 },
  'Manicure': { price: 300, duration: 40 },
  'Pedicure': { price: 400, duration: 50 },
  'Waxing': { price: 300, duration: 30 },
  'Threading': { price: 50, duration: 10 },
  'Nail Art': { price: 500, duration: 60 },
  'Haircut (Layer / Step / Trim)': { price: 250, duration: 40 },
  'Blow Dry': { price: 200, duration: 30 },
  'Highlights / Balayage': { price: 2000, duration: 120 },
  'Keratin Treatment': { price: 2500, duration: 150 },
  'Full Body Massage': { price: 1500, duration: 90 },
  'Bridal Makeup': { price: 5000, duration: 180 },
};

const DEFAULT_HINT = { price: 300, duration: 30 };

export default function Step9_Pricing() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const services = data.selectedServices;
  const [pricing, setPricing] = useState(() => {
    const init = {};
    services.forEach(s => {
      init[s.serviceName] = data.servicePricing[s.serviceName] || { price: '', duration: '' };
    });
    return init;
  });
  const [flashRow, setFlashRow] = useState(null);

  const patch = (name, field, val) => {
    const next = { ...pricing, [name]: { ...pricing[name], [field]: val } };
    setPricing(next);
    update({ servicePricing: next });
  };

  const fillSuggested = () => {
    const next = {};
    services.forEach(s => {
      const hint = PRICE_HINTS[s.serviceName] || DEFAULT_HINT;
      next[s.serviceName] = { price: String(hint.price), duration: String(hint.duration) };
    });
    // Animate each row
    services.forEach((s, i) => setTimeout(() => setFlashRow(s.serviceName), i * 80));
    setTimeout(() => setFlashRow(null), services.length * 80 + 500);
    setPricing(next);
    update({ servicePricing: next });
    toast.success('Suggested prices applied! ✨');
  };

  const handleNext = () => {
    update({ servicePricing: pricing });
    toast.success('Pricing is set — your salon looks completely professional! 💅');
    nextStep();
  };

  const handleSkip = () => {
    toast('You can set prices anytime from your dashboard.', { icon: '💡' });
    nextStep();
  };

  const filled   = services.filter(s => pricing[s.serviceName]?.price).length;
  const allFilled = filled === services.length;

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';
  const inpBg  = isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb';
  const inpBorderBase = isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';

  return (
    <>
      <style>{S9_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div className="s9-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Set your prices 💰
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0 }}>
            Customers see these when browsing. Competitive pricing gets more bookings.
          </p>
        </div>

        <div className="s9-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)' }}>

          {/* Toolbar */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: sub, fontWeight: 500 }}>
              {filled}/{services.length} prices set
              {allFilled && <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 700 }}>✓ All done!</span>}
            </span>
            <button onClick={fillSuggested} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#a855f7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Sparkles size={13} /> Fill suggested prices
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f0ff' }}>
            <div style={{ height: '100%', width: `${(filled / Math.max(services.length, 1)) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', transition: 'width 0.4s ease' }} />
          </div>

          {/* Service rows */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {services.map((s, idx) => {
              const p = pricing[s.serviceName] || { price: '', duration: '' };
              const hint = PRICE_HINTS[s.serviceName];
              const isFlashing = flashRow === s.serviceName;

              return (
                <div key={s.serviceName} className="s9-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                    borderBottom: idx < services.length - 1 ? `1px solid ${border}` : 'none',
                    background: isFlashing ? 'rgba(124,58,237,0.08)' : 'transparent',
                  }}>
                  {/* Icon + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{s.categoryIcon || '✂️'}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.serviceName}
                      </p>
                      {hint && !p.price && (
                        <p style={{ fontSize: 10, color: sub, margin: '1px 0 0' }}>e.g. ₹{hint.price}</p>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: p.price ? '#a855f7' : sub }}>₹</span>
                    <input className="s9-inp"
                      type="number" inputMode="numeric" placeholder={hint?.price || '0'}
                      value={p.price} onChange={e => patch(s.serviceName, 'price', e.target.value)}
                      style={{
                        width: 80, paddingLeft: 22,
                        border: `1.5px solid ${p.price ? 'rgba(124,58,237,0.4)' : inpBorderBase}`,
                        background: inpBg, color: text,
                      }}
                    />
                  </div>

                  {/* Duration */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input className="s9-inp"
                      type="number" inputMode="numeric" placeholder={hint?.duration || '30'}
                      value={p.duration} onChange={e => patch(s.serviceName, 'duration', e.target.value)}
                      style={{
                        width: 64,
                        border: `1.5px solid ${p.duration ? 'rgba(124,58,237,0.3)' : inpBorderBase}`,
                        background: inpBg, color: text,
                      }}
                    />
                    <span style={{ position: 'absolute', right: -22, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: sub, whiteSpace: 'nowrap' }}>min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <button className="s9-btn" onClick={handleNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
          Preview My Salon <ArrowRight size={18} />
        </button>

        <button onClick={handleSkip} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: sub, fontSize: 13,
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <SkipForward size={14} /> Skip Pricing for Now — add from dashboard later
        </button>
      </div>
    </>
  );
}
