import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';

const OnboardingContext = createContext(null);
export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider');
  return ctx;
};

// Step → progress % mapping (7 steps — phone/OTP handled by Register, services set up post-login)
const STEP_PROGRESS = { 1:14, 2:28, 3:43, 4:57, 5:71, 6:86, 7:100 };

const getProgressMessage = (pct) => {
  if (pct <= 20)  return "Let's get started!";
  if (pct <= 40)  return 'Great momentum!';
  if (pct <= 60)  return "You're halfway there!";
  if (pct <= 80)  return 'Almost done — looking great!';
  if (pct < 100)  return 'One last step!';
  return 'Your salon is ready! 🎉';
};

const INITIAL_DATA = {
  // Phase 1 — auth
  phone:             '',
  confirmationResult: null,
  firebaseToken:     '',

  // Step 3 — profile
  name:       '',
  email:      '',
  password:   '',
  gender:     '',
  referralCode: '',

  // Step 4 — salon type
  businessType: '',

  // Step 5 — salon identity
  salonName:    '',
  servedGender: '',
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
  workingDays:    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  openTime:       '09:00',
  closeTime:      '18:00',
  hasLunchBreak:  false,
  lunchStart:     '13:00',
  lunchEnd:       '14:00',

  // Step 7 — media
  videoUrl:                 '',
  videoPublicId:            '',
  photos:                   [],
  businessLicenseUrl:       '',
  businessRegistrationUrl:  '',

  // Step 8 — services
  selectedServices: [],

  // Step 9 — pricing
  servicePricing: {},

  // UX flags
  quickSetup: false,
};

// Fields that must NOT be saved to DB (runtime-only)
const SKIP_FIELDS = new Set(['confirmationResult', 'firebaseToken', 'password']);

function stripRuntime(data) {
  const clean = { ...data };
  SKIP_FIELDS.forEach(k => delete clean[k]);
  return clean;
}

export function OnboardingProvider({ children }) {
  const [currentStep, setCurrentStep]       = useState(1);
  const [direction, setDirection]           = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [data, setData]                     = useState(INITIAL_DATA);
  const [draftLoaded, setDraftLoaded]       = useState(false);

  const saveTimerRef = useRef(null);

  /* ── helpers ── */
  const hasToken = () => !!localStorage.getItem('token');

  const saveDraft = useCallback(async (step, latestData) => {
    if (!hasToken()) return;
    try {
      await api.put('/owner/onboarding/draft', {
        currentStep: step,
        data: stripRuntime(latestData),
      });
    } catch { /* silent — don't block the user */ }
  }, []);

  const debouncedSave = useCallback((step, latestData) => {
    if (!hasToken()) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDraft(step, latestData), 800);
  }, [saveDraft]);

  /* ── restore draft on mount if token exists ── */
  useEffect(() => {
    if (!hasToken()) { setDraftLoaded(true); return; }
    api.get('/owner/onboarding/draft')
      .then(res => {
        const draft = res.data?.data;
        const effectiveStep = draft?.currentStep ?? 1;
        setCurrentStep(effectiveStep);
        setCompletedSteps(Array.from({ length: effectiveStep - 1 }, (_, i) => i + 1));
        if (draft?.data && Object.keys(draft.data).length > 0) {
          setData(prev => ({ ...prev, ...draft.data }));
        }
      })
      .catch(() => {
        setCurrentStep(1);
      })
      .finally(() => setDraftLoaded(true));
  }, []);

  /* ── update — patch data and auto-save ── */
  const update = useCallback((patch) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      debouncedSave(currentStep, next);
      return next;
    });
  }, [currentStep, debouncedSave]);

  /* ── navigation ── */
  const nextStep = useCallback(() => {
    setDirection(1);
    setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
    setCurrentStep(prev => {
      const next = Math.min(prev + 1, 7);
      setData(d => { saveDraft(next, d); return d; });
      return next;
    });
  }, [currentStep, saveDraft]);

  const prevStep = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => {
      const next = Math.max(prev - 1, 1);
      setData(d => { saveDraft(next, d); return d; });
      return next;
    });
  }, [saveDraft]);

  const goToStep = useCallback((step) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    setData(d => { saveDraft(step, d); return d; });
  }, [currentStep, saveDraft]);

  const progress        = STEP_PROGRESS[currentStep] ?? 10;
  const progressMessage = getProgressMessage(progress);

  return (
    <OnboardingContext.Provider value={{
      data, update,
      currentStep, direction, completedSteps,
      nextStep, prevStep, goToStep,
      progress, progressMessage,
      draftLoaded,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}
