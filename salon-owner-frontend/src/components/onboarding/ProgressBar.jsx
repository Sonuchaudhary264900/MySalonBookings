import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

const TOTAL = 7;

export default function ProgressBar() {
  const { currentStep, completedSteps } = useOnboarding();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: TOTAL }, (_, i) => {
        const step   = i + 1;
        const done   = completedSteps.includes(step) || step < currentStep;
        const active = step === currentStep;
        return (
          <div key={step} style={{
            height: 5,
            width:  active ? 28 : done ? 20 : 8,
            borderRadius: 99,
            transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            background: done
              ? 'linear-gradient(90deg,#7c3aed,#a855f7)'
              : active
              ? 'linear-gradient(90deg,#a855f7,#ec4899)'
              : 'rgba(139,92,246,0.2)',
            boxShadow: active ? '0 0 8px rgba(168,85,247,0.55)' : 'none',
          }} />
        );
      })}
    </div>
  );
}
