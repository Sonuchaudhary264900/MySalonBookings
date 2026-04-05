import React from 'react';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';
import ProgressBar from './ProgressBar';
import LivePreviewPanel from './LivePreviewPanel';

const OB_CSS = `
  @keyframes ob-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(60px,-50px) scale(1.12)}70%{transform:translate(-35px,30px) scale(0.92)}}
  @keyframes ob-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-60px,45px) scale(1.08)}65%{transform:translate(45px,-28px) scale(0.94)}}
  @keyframes ob-fadeup{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}

  .ob-layout-scrollbar::-webkit-scrollbar{width:4px}
  .ob-layout-scrollbar::-webkit-scrollbar-track{background:transparent}
  .ob-layout-scrollbar::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:99px}

  /* Light-mode input overrides */
  [data-ob-light] .ob-inp{
    background:#fff!important;border-color:#d1d5db!important;color:#111827!important;
  }
  [data-ob-light] .ob-inp::placeholder{color:#9ca3af!important;}
  [data-ob-light] .ob-inp:focus{border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,0.15)!important;}
  [data-ob-light] .ob-label{color:#374151!important;}
  [data-ob-light] .ob-sub{color:#6b7280!important;}
  [data-ob-light] .ob-card{background:#ffffff!important;border-color:#e5e7eb!important;}
  [data-ob-light] .ob-inner{background:#f9fafb!important;border-color:#e5e7eb!important;}
`;

export default function OnboardingLayout({ children }) {
  const { currentStep, prevStep, progress } = useOnboarding();
  const { isDark, toggleTheme } = useTheme();

  const isSplitLayout = currentStep >= 4;
  const showBack      = currentStep > 1;

  const bg        = isDark ? '#07071a' : '#f5f3ff';
  const headerBg  = isDark ? 'rgba(7,7,26,0.9)' : 'rgba(245,243,255,0.92)';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted   = isDark ? 'rgba(255,255,255,0.5)' : '#6b7280';

  return (
    <>
      <style>{OB_CSS}</style>
      <div
        data-ob-light={!isDark ? '1' : undefined}
        style={{
          minHeight: 'calc(var(--vh, 1vh) * 100)', background: bg, position: 'relative',
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
          transition: 'background 0.3s ease', overflowX: 'hidden',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position: 'fixed', top: '-15%', left: '-10%', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle,${isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)'} 0%,transparent 70%)`, animation: 'ob-orb1 20s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-15%', right: '-8%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle,${isDark ? 'rgba(236,72,153,0.1)' : 'rgba(236,72,153,0.07)'} 0%,transparent 70%)`, animation: 'ob-orb2 24s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Top bar ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: headerBg, backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
          padding: '12px 20px',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Back */}
            <div style={{ width: 36, flexShrink: 0 }}>
              {showBack && (
                <button
                  onClick={prevStep}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
                >
                  <ChevronLeft size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
                </button>
              )}
            </div>

            {/* Progress + step counter */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: '0 0 14px rgba(124,58,237,0.4)' }}>✂</div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary, letterSpacing: '-0.3px' }}>GlowSpot</span>
                </div>

                <div style={{ width: 1, height: 18, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

                <span style={{ fontSize: 12, color: textMuted, fontWeight: 500 }}>
                  Step <span style={{ fontWeight: 700, color: textPrimary }}>{currentStep}</span> of 10
                </span>

                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 99, background: 'rgba(124,58,237,0.12)',
                  color: '#a855f7', border: '1px solid rgba(124,58,237,0.25)',
                  letterSpacing: 0.5,
                }}>
                  {progress < 50 ? '⚡ Takes under 2 min' : progress < 80 ? '🔥 Almost there!' : '🚀 Final stretch!'}
                </span>
              </div>
              <ProgressBar />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: isDark ? 'rgba(255,255,255,0.07)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'all 0.15s',
              }}
            >
              {isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#6366f1" />}
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{
          maxWidth: isSplitLayout ? 1100 : 560,
          margin: '0 auto',
          padding: isSplitLayout ? '32px 20px' : '40px 20px 60px',
          position: 'relative', zIndex: 1,
          display: isSplitLayout ? 'grid' : 'block',
          gridTemplateColumns: isSplitLayout ? '1fr 280px' : undefined,
          gap: isSplitLayout ? 40 : undefined,
          alignItems: isSplitLayout ? 'start' : undefined,
        }}>
          {/* Left / center content */}
          <div>{children}</div>

          {/* Right preview panel */}
          {isSplitLayout && (
            <div className="hidden lg:block">
              <LivePreviewPanel />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
