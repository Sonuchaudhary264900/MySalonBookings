import React from 'react';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';
import ProgressBar from './ProgressBar';

const TOTAL = 7;

const OB_CSS = `
  @keyframes ob-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(60px,-50px) scale(1.12)}70%{transform:translate(-35px,30px) scale(0.92)}}
  @keyframes ob-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-60px,45px) scale(1.08)}65%{transform:translate(45px,-28px) scale(0.94)}}
  @keyframes ob-fadein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}

  .ob-layout-scrollbar::-webkit-scrollbar{width:4px}
  .ob-layout-scrollbar::-webkit-scrollbar-track{background:transparent}
  .ob-layout-scrollbar::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.22);border-radius:99px}

  .ob-back-btn{transition:all 0.18s ease;}
  .ob-back-btn:hover{background:rgba(139,92,246,0.1)!important;border-color:rgba(139,92,246,0.3)!important;}
  .ob-theme-btn{transition:all 0.18s ease;}
  .ob-theme-btn:hover{transform:scale(1.1);}

  .ob-content-wrap{animation:ob-fadein 0.4s ease both}

  [data-ob-light] .ob-inp{background:#fff!important;border-color:#d1d5db!important;color:#111827!important;}
  [data-ob-light] .ob-inp::placeholder{color:#9ca3af!important;}
  [data-ob-light] .ob-inp:focus{border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,0.12)!important;}
  [data-ob-light] .ob-label{color:#374151!important;}
  [data-ob-light] .ob-sub{color:#6b7280!important;}
  [data-ob-light] .ob-card{background:#ffffff!important;border-color:#e5e7eb!important;}
  [data-ob-light] .ob-inner{background:#f9fafb!important;border-color:#e5e7eb!important;}
`;

export default function OnboardingLayout({ children }) {
  const { currentStep, prevStep } = useOnboarding();
  const { isDark, toggleTheme } = useTheme();

  const showBack  = currentStep > 1;
  const bg        = isDark ? '#070714' : '#f8f7ff';
  const navBg     = isDark ? 'rgba(7,7,20,0.88)' : 'rgba(248,247,255,0.9)';
  const navBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const text      = isDark ? '#f1f5f9' : '#0f172a';
  const muted     = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8';
  const progBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.08)';

  return (
    <>
      <style>{OB_CSS}</style>
      <div
        data-ob-light={!isDark ? '1' : undefined}
        className="ob-layout-scrollbar"
        style={{
          minHeight: '100dvh', background: bg,
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
          overflowX: 'hidden', position: 'relative',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position: 'fixed', top: '-20%', left: '-12%', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle,${isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)'} 0%,transparent 70%)`, animation: 'ob-orb1 22s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle,${isDark ? 'rgba(236,72,153,0.06)' : 'rgba(236,72,153,0.04)'} 0%,transparent 70%)`, animation: 'ob-orb2 26s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Top nav bar ── minimal: back | brand | step count | theme */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: navBg,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${navBorder}`,
          padding: '12px 20px',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Back */}
            <div style={{ width: 34, flexShrink: 0 }}>
              {showBack && (
                <button className="ob-back-btn" onClick={prevStep} style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'transparent',
                  border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(124,58,237,0.15)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChevronLeft size={17} color={isDark ? '#94a3b8' : '#7c3aed'} />
                </button>
              )}
            </div>

            {/* Brand */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>✂</div>
              <span style={{ fontSize: 13, fontWeight: 800, color: text, letterSpacing: '-0.3px' }}>GlowLoox</span>
            </div>

            {/* Step counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#a855f7' : '#7c3aed' }}>{currentStep}</span>
              <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>/ {TOTAL}</span>
            </div>

            {/* Theme */}
            <button className="ob-theme-btn" onClick={toggleTheme} style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'transparent',
              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(124,58,237,0.15)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
            </button>
          </div>
        </div>

        {/* ── Progress bar — full width strip below nav ── */}
        <div style={{
          borderBottom: `1px solid ${progBorder}`,
          background: isDark ? 'rgba(7,7,20,0.6)' : 'rgba(248,247,255,0.7)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px' }}>
            <ProgressBar />
          </div>
        </div>

        {/* ── Page content ── */}
        <div
          className="ob-content-wrap"
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '36px 20px 80px',
            position: 'relative', zIndex: 1,
          }}
        >
          {children}
        </div>

        {/* Ghosted footer brand */}
        <div style={{
          position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 10, pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(124,58,237,0.2)', letterSpacing: '-0.2px' }}>GlowLoox</span>
        </div>
      </div>
    </>
  );
}
