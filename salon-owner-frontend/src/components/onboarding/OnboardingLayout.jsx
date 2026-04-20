import React from 'react';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';
import ProgressBar from './ProgressBar';

const TOTAL = 7;

const STEP_LABELS = [
  'Your name',
  'Business type',
  'Salon identity',
  'Location',
  'Working hours',
  'Photos & video',
  'Final review',
];

const OB_CSS = `
  @keyframes ob-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(60px,-50px) scale(1.12)}70%{transform:translate(-35px,30px) scale(0.92)}}
  @keyframes ob-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-60px,45px) scale(1.08)}65%{transform:translate(45px,-28px) scale(0.94)}}
  @keyframes ob-fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ob-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}

  .ob-layout-scrollbar::-webkit-scrollbar{width:4px}
  .ob-layout-scrollbar::-webkit-scrollbar-track{background:transparent}
  .ob-layout-scrollbar::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.25);border-radius:99px}

  .ob-back-btn{transition:all 0.18s ease;}
  .ob-back-btn:hover{background:rgba(139,92,246,0.12)!important;transform:translateX(-1px);}

  .ob-theme-btn{transition:all 0.18s ease;}
  .ob-theme-btn:hover{transform:scale(1.1);}

  .ob-content-wrap{animation:ob-fadein 0.4s ease both}

  /* Light-mode overrides */
  [data-ob-light] .ob-inp{
    background:#fff!important;border-color:#d1d5db!important;color:#111827!important;
  }
  [data-ob-light] .ob-inp::placeholder{color:#9ca3af!important;}
  [data-ob-light] .ob-inp:focus{border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,0.12)!important;}
  [data-ob-light] .ob-label{color:#374151!important;}
  [data-ob-light] .ob-sub{color:#6b7280!important;}
  [data-ob-light] .ob-card{background:#ffffff!important;border-color:#e5e7eb!important;}
  [data-ob-light] .ob-inner{background:#f9fafb!important;border-color:#e5e7eb!important;}

  @media(max-width:600px){
    .ob-step-label{display:none!important;}
  }
`;

export default function OnboardingLayout({ children }) {
  const { currentStep, prevStep } = useOnboarding();
  const { isDark, toggleTheme } = useTheme();

  const showBack = currentStep > 1;
  const stepLabel = STEP_LABELS[currentStep - 1] || '';

  const bg         = isDark ? '#070714' : '#f8f7ff';
  const headerBg   = isDark ? 'rgba(7,7,20,0.85)' : 'rgba(248,247,255,0.88)';
  const textColor  = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  return (
    <>
      <style>{OB_CSS}</style>
      <div
        data-ob-light={!isDark ? '1' : undefined}
        className="ob-layout-scrollbar"
        style={{
          minHeight: '100dvh',
          background: bg,
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* Ambient orbs — subtle */}
        <div style={{ position: 'fixed', top: '-20%', left: '-12%', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle,${isDark ? 'rgba(124,58,237,0.09)' : 'rgba(124,58,237,0.06)'} 0%,transparent 70%)`, animation: 'ob-orb1 22s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle,${isDark ? 'rgba(236,72,153,0.07)' : 'rgba(236,72,153,0.05)'} 0%,transparent 70%)`, animation: 'ob-orb2 26s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Top bar ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: headerBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
          padding: '14px 20px',
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>

            {/* Back button */}
            <div style={{ width: 34, flexShrink: 0 }}>
              {showBack && (
                <button className="ob-back-btn" onClick={prevStep} style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChevronLeft size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                </button>
              )}
            </div>

            {/* Center: progress */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ProgressBar />
                <span style={{ fontSize: 11, fontWeight: 600, color: mutedColor, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                  {currentStep}<span style={{ opacity: 0.5 }}>/{TOTAL}</span>
                </span>
              </div>
              {stepLabel && (
                <span className="ob-step-label" style={{ fontSize: 11, color: mutedColor, fontWeight: 500, letterSpacing: 0.2 }}>
                  {stepLabel}
                </span>
              )}
            </div>

            {/* Theme toggle */}
            <button className="ob-theme-btn" onClick={toggleTheme} style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
            </button>
          </div>
        </div>

        {/* ── Page content ── */}
        <div
          className="ob-content-wrap"
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '40px 20px 80px',
            position: 'relative', zIndex: 1,
          }}
        >
          {children}
        </div>

        {/* Bottom brand */}
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8, zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✂</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)', letterSpacing: '-0.2px' }}>GlowLoox</span>
        </div>
      </div>
    </>
  );
}
