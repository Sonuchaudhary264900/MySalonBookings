import React, { createContext, useContext, useState, useCallback } from 'react';

const OnboardingContext = createContext(null);
export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider');
  return ctx;
};

// Step → progress % mapping (11 steps)
const STEP_PROGRESS = { 1:9, 2:18, 3:27, 4:36, 5:45, 6:55, 7:64, 8:73, 9:82, 10:91, 11:98 };

const getProgressMessage = (pct) => {
  if (pct <= 20)  return "Let's get started!";
  if (pct <= 40)  return 'Great momentum!';
  if (pct <= 60)  return "You're halfway there!";
  if (pct <= 80)  return 'Almost done — looking great!';
  if (pct < 100)  return 'One last step!';
  return 'Your salon is ready! 🎉';
};

export function OnboardingProvider({ children }) {
  const [currentStep, setCurrentStep]       = useState(1);
  const [direction, setDirection]           = useState(1);   // 1=forward -1=back
  const [completedSteps, setCompletedSteps] = useState([]);

  /* ── Onboarding data (flat so updates are cheap) ── */
  const [data, setData] = useState({
    // Phase 1 — auth
    phone:             '',
    confirmationResult: null,
    firebaseToken:     '',

    // Step 3 — profile
    name:       '',
    email:      '',
    password:   '',
    gender:     '',   // 'male' | 'female' | 'other'
    referralCode: '',

    // Step 4 — salon type
    businessType: '',  // 'barbershop' | 'salon' | 'spa_wellness' | 'makeup_bridal' | 'skin_derma'

    // Step 5 — salon identity
    salonName:    '',
    servedGender: '',  // 'male' | 'female' | 'unisex'
    description:  '',

    // Step 5 — location
    lat:      null,
    lng:      null,
    address:  '',
    city:     '',
    district: '',
    state:    '',
    pincode:  '',

    // Step 6 — working hours
    workingDays:    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    openTime:       '09:00',
    closeTime:      '21:00',
    hasLunchBreak:  false,
    lunchStart:     '13:00',
    lunchEnd:       '14:00',

    // Step 7 — media
    videoUrl:                 '',
    videoPublicId:            '',
    photos:                   [],   // [{url, publicId, isCover}]
    businessLicenseUrl:       '',
    businessRegistrationUrl:  '',

    // Step 8 — services
    // [{categoryKey, categoryLabel, categoryIcon, serviceName}]
    selectedServices: [],

    // Step 9 — pricing
    // {serviceName: {price:'', duration:''}}
    servicePricing: {},

    // UX flags
    quickSetup: false,
  });

  const update = useCallback((patch) => setData(prev => ({ ...prev, ...patch })), []);

  const nextStep = useCallback(() => {
    setDirection(1);
    setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
    setCurrentStep(prev => Math.min(prev + 1, 11));
  }, [currentStep]);

  const prevStep = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  const progress        = STEP_PROGRESS[currentStep] ?? 10;
  const progressMessage = getProgressMessage(progress);

  return (
    <OnboardingContext.Provider value={{
      data, update,
      currentStep, direction, completedSteps,
      nextStep, prevStep, goToStep,
      progress, progressMessage,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}
