import React from 'react';
import { Check } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';

const TOTAL = 7;
const LABELS = ['You', 'Type', 'Identity', 'Location', 'Hours', 'Media', 'Review'];

const PB_CSS = `
  @keyframes pb-pop{0%{transform:scale(0.6)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
  @keyframes pb-fill{from{width:0%}to{width:100%}}
  @keyframes pb-check{from{opacity:0;transform:scale(0) rotate(-45deg)}to{opacity:1;transform:scale(1) rotate(0)}}
  .pb-node{transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);}
  .pb-node.active{animation:pb-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both}
  .pb-check{animation:pb-check 0.3s 0.1s cubic-bezier(0.34,1.56,0.64,1) both}
  .pb-label{transition:color 0.25s,font-weight 0.25s;}
  @media(max-width:500px){.pb-label{display:none!important;}}
`;

export default function ProgressBar() {
  const { currentStep } = useOnboarding();
  const { isDark } = useTheme();

  const trackBg  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.1)';
  const doneLine = 'linear-gradient(90deg,#7c3aed,#a855f7)';

  return (
    <>
      <style>{PB_CSS}</style>
      <div style={{ padding: '20px 0 4px', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          {Array.from({ length: TOTAL }, (_, i) => {
            const step   = i + 1;
            const done   = step < currentStep;
            const active = step === currentStep;
            const future = step > currentStep;
            const isLast = step === TOTAL;

            const nodeSize = active ? 32 : 26;
            const nodeBg   = done
              ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
              : active
              ? 'linear-gradient(135deg,#7c3aed,#ec4899)'
              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)');
            const nodeBorder = done
              ? 'none'
              : active
              ? 'none'
              : `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(124,58,237,0.2)'}`;
            const nodeBox = active
              ? '0 0 0 4px rgba(124,58,237,0.15), 0 4px 20px rgba(124,58,237,0.45)'
              : done
              ? '0 2px 10px rgba(124,58,237,0.25)'
              : 'none';

            return (
              <React.Fragment key={step}>
                {/* Node + label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                  <div
                    className={`pb-node${active ? ' active' : ''}`}
                    style={{
                      width: nodeSize, height: nodeSize,
                      borderRadius: '50%',
                      background: nodeBg,
                      border: nodeBorder,
                      boxShadow: nodeBox,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: active ? 0 : (32 - 26) / 2,
                    }}
                  >
                    {done ? (
                      <Check size={12} color="#fff" strokeWidth={3} className="pb-check" />
                    ) : (
                      <span style={{
                        fontSize: active ? 13 : 11,
                        fontWeight: 700,
                        color: (done || active) ? '#fff' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(124,58,237,0.4)'),
                        lineHeight: 1,
                      }}>{step}</span>
                    )}
                  </div>

                  <span className="pb-label" style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : done ? 600 : 500,
                    color: active
                      ? (isDark ? '#c4b5fd' : '#7c3aed')
                      : done
                      ? (isDark ? 'rgba(255,255,255,0.5)' : '#a78bfa')
                      : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.3)'),
                    letterSpacing: 0.3,
                    whiteSpace: 'nowrap',
                  }}>
                    {LABELS[i]}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div style={{
                    flex: 1, height: 2, marginTop: 15,
                    borderRadius: 99,
                    background: trackBg,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {done && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: doneLine,
                        borderRadius: 99,
                      }} />
                    )}
                    {active && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(90deg,#7c3aed,transparent)',
                        borderRadius: 99,
                        width: '50%',
                      }} />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}
