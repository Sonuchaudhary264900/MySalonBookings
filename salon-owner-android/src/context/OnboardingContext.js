import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const OnboardingContext = createContext(null);

// 7-step flow matching the website: auth handled by Login/Register,
// services & pricing set up post-approval in the dashboard.
export const TOTAL_STEPS = 7;

export const STEP_LABELS = [
  'Profile', 'Type', 'Identity',
  'Location', 'Hours', 'Media', 'Preview',
];

// Day-name translation between Android state (lowercase keys) and
// the web draft format ('Mon'…'Sun') so drafts sync across platforms.
const DAY_KEY_TO_LABEL = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
const DAY_LABEL_TO_KEY = { Mon:'monday', Tue:'tuesday', Wed:'wednesday', Thu:'thursday', Fri:'friday', Sat:'saturday', Sun:'sunday' };

export const OnboardingProvider = ({ children, initialStep = 1 }) => {
  const [step, setStep] = useState(initialStep);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const minStep = 1;

  // ── Step 1: Profile ───────────────────────────────────────────
  const [ownerName, setOwnerName]       = useState('');
  const [referralCode, setReferralCode] = useState('');

  // ── Step 2: Business Type ─────────────────────────────────────
  const [businessType, setBusinessType] = useState('');

  // ── Step 3: Identity ──────────────────────────────────────────
  const [salonName, setSalonName]       = useState('');
  const [servedGender, setServedGender] = useState('');
  const [description, setDescription]   = useState('');
  const [quickSetup, setQuickSetup]     = useState(false);

  // ── Step 4: Location ──────────────────────────────────────────
  const [lat, setLat]           = useState(20.5937);
  const [lng, setLng]           = useState(78.9629);
  const [address, setAddress]   = useState('');
  const [city, setCity]         = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode]   = useState('');

  // ── Step 5: Working Hours ─────────────────────────────────────
  const [workingDays, setWorkingDays] = useState(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']);
  const [openTime, setOpenTime]       = useState('09:00');
  const [closeTime, setCloseTime]     = useState('20:00');
  const [lunchBreak, setLunchBreak]   = useState(false);
  const [lunchStart, setLunchStart]   = useState('13:00');
  const [lunchEnd, setLunchEnd]       = useState('14:00');

  // ── Step 6: Media ─────────────────────────────────────────────
  const [photos, setPhotos]                         = useState([]); // [{uri?, url, publicId?, isCover?}]
  const [videoUrl, setVideoUrl]                     = useState('');
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('');
  const [businessRegUrl, setBusinessRegUrl]         = useState('');

  // ── Draft persistence (same endpoints + shape as the website) ──
  const stateRef = useRef({});
  stateRef.current = {
    ownerName, referralCode, businessType,
    salonName, servedGender, description, quickSetup,
    lat, lng, address, city, district, stateName, pincode,
    workingDays, openTime, closeTime, lunchBreak, lunchStart, lunchEnd,
    photos, videoUrl, businessLicenseUrl, businessRegUrl,
  };

  const buildDraftData = () => {
    const s = stateRef.current;
    return {
      name:         s.ownerName,
      referralCode: s.referralCode,
      businessType: s.businessType,
      salonName:    s.salonName,
      servedGender: s.servedGender,
      description:  s.description,
      quickSetup:   s.quickSetup,
      lat: s.lat, lng: s.lng,
      address: s.address, city: s.city, district: s.district,
      state: s.stateName, pincode: s.pincode,
      workingDays:   s.workingDays.map(d => DAY_KEY_TO_LABEL[d]).filter(Boolean),
      openTime:      s.openTime,
      closeTime:     s.closeTime,
      hasLunchBreak: s.lunchBreak,
      lunchStart:    s.lunchStart,
      lunchEnd:      s.lunchEnd,
      photos: s.photos.map(p => ({ url: p.url, publicId: p.publicId || '', isCover: Boolean(p.isCover) })),
      videoUrl:                s.videoUrl,
      businessLicenseUrl:      s.businessLicenseUrl,
      businessRegistrationUrl: s.businessRegUrl,
    };
  };

  const savedTimerRef = useRef(null);
  const saveDraft = useCallback(async (targetStep, attempt = 0) => {
    setSaveStatus('saving');
    try {
      await api.put('/owner/onboarding/draft', {
        currentStep: targetStep,
        data: buildDraftData(),
      });
      setSaveStatus('saved');
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800);
    } catch {
      // Never block the user — retry once quietly, then surface a brief "offline" hint.
      if (attempt < 1) {
        setTimeout(() => saveDraft(targetStep, attempt + 1), 1200);
      } else {
        setSaveStatus('error');
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2200);
      }
    }
  }, []);

  const saveTimerRef = useRef(null);
  const debouncedSave = useCallback((targetStep) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDraft(targetStep), 800);
  }, [saveDraft]);

  // Restore draft on mount (mirrors website OnboardingContext)
  useEffect(() => {
    let cancelled = false;
    api.get('/owner/onboarding/draft')
      .then(res => {
        if (cancelled) return;
        const draft = res.data?.data;
        const d = draft?.data;
        if (d && Object.keys(d).length > 0) {
          if (d.name)          setOwnerName(d.name);
          if (d.referralCode)  setReferralCode(d.referralCode);
          if (d.businessType)  setBusinessType(d.businessType);
          if (d.salonName)     setSalonName(d.salonName);
          if (d.servedGender)  setServedGender(d.servedGender);
          if (d.description)   setDescription(d.description);
          if (d.quickSetup != null) setQuickSetup(Boolean(d.quickSetup));
          if (d.lat != null)   setLat(d.lat);
          if (d.lng != null)   setLng(d.lng);
          if (d.address)       setAddress(d.address);
          if (d.city)          setCity(d.city);
          if (d.district)      setDistrict(d.district);
          if (d.state)         setStateName(d.state);
          if (d.pincode)       setPincode(d.pincode);
          if (Array.isArray(d.workingDays) && d.workingDays.length) {
            const mapped = d.workingDays.map(x => DAY_LABEL_TO_KEY[x] || (DAY_KEY_TO_LABEL[x] ? x : null)).filter(Boolean);
            if (mapped.length) setWorkingDays(mapped);
          }
          if (d.openTime)      setOpenTime(d.openTime);
          if (d.closeTime)     setCloseTime(d.closeTime);
          if (d.hasLunchBreak != null) setLunchBreak(Boolean(d.hasLunchBreak));
          if (d.lunchStart)    setLunchStart(d.lunchStart);
          if (d.lunchEnd)      setLunchEnd(d.lunchEnd);
          if (Array.isArray(d.photos) && d.photos.length) setPhotos(d.photos);
          if (d.videoUrl)      setVideoUrl(d.videoUrl);
          if (d.businessLicenseUrl)      setBusinessLicenseUrl(d.businessLicenseUrl);
          if (d.businessRegistrationUrl) setBusinessRegUrl(d.businessRegistrationUrl);
        }
        const savedStep = draft?.currentStep;
        if (savedStep && savedStep >= 1 && savedStep <= TOTAL_STEPS) setStep(savedStep);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDraftLoaded(true); });
    return () => { cancelled = true; clearTimeout(saveTimerRef.current); clearTimeout(savedTimerRef.current); };
  }, []);

  // Auto-save whenever data changes (after initial restore)
  useEffect(() => {
    if (!draftLoaded) return;
    debouncedSave(step);
  }, [
    draftLoaded, step, debouncedSave,
    ownerName, referralCode, businessType,
    salonName, servedGender, description, quickSetup,
    lat, lng, address, city, district, stateName, pincode,
    workingDays, openTime, closeTime, lunchBreak, lunchStart, lunchEnd,
    photos, videoUrl, businessLicenseUrl, businessRegUrl,
  ]);

  // ── Navigation ────────────────────────────────────────────────
  const nextStep = () => setStep(s => {
    const n = Math.min(s + 1, TOTAL_STEPS);
    saveDraft(n);
    return n;
  });
  const prevStep = () => setStep(s => {
    const n = Math.max(s - 1, minStep);
    saveDraft(n);
    return n;
  });
  const goToStep = (n) => { setStep(n); saveDraft(n); };

  return (
    <OnboardingContext.Provider value={{
      step, nextStep, prevStep, goToStep, minStep, draftLoaded, saveStatus,

      // Profile
      ownerName, setOwnerName,
      referralCode, setReferralCode,

      // Business type
      businessType, setBusinessType,

      // Identity
      salonName, setSalonName,
      servedGender, setServedGender,
      description, setDescription,
      quickSetup, setQuickSetup,

      // Location
      lat, setLat,
      lng, setLng,
      address, setAddress,
      city, setCity,
      district, setDistrict,
      stateName, setStateName,
      pincode, setPincode,

      // Hours
      workingDays, setWorkingDays,
      openTime, setOpenTime,
      closeTime, setCloseTime,
      lunchBreak, setLunchBreak,
      lunchStart, setLunchStart,
      lunchEnd, setLunchEnd,

      // Media
      photos, setPhotos,
      videoUrl, setVideoUrl,
      businessLicenseUrl, setBusinessLicenseUrl,
      businessRegUrl, setBusinessRegUrl,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider');
  return ctx;
};
