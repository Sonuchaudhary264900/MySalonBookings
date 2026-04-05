import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

export default function ProgressBar() {
  const { progress, progressMessage, currentStep } = useOnboarding();

  return (
    <div style={{ width: '100%' }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(139,92,246,0.9)', letterSpacing: 0.3 }}>
          {progressMessage}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(139,92,246,0.9)' }}>
          {progress}%
        </span>
      </div>

      {/* Track */}
      <div style={{
        height: 6, borderRadius: 99,
        background: 'rgba(139,92,246,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 99,
          background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)',
          transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 0 10px rgba(168,85,247,0.5)',
        }} />
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const step = i + 1;
          const done    = step < currentStep;
          const active  = step === currentStep;
          return (
            <div key={step} style={{
              width:  active ? 20 : 8,
              height: 8,
              borderRadius: 99,
              transition: 'all 0.3s ease',
              background: done
                ? 'linear-gradient(90deg,#7c3aed,#a855f7)'
                : active
                ? 'linear-gradient(90deg,#a855f7,#ec4899)'
                : 'rgba(139,92,246,0.18)',
              boxShadow: active ? '0 0 8px rgba(168,85,247,0.5)' : 'none',
            }} />
          );
        })}
      </div>
    </div>
  );
}
