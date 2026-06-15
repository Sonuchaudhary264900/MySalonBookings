import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

export const TOTAL_STEPS = 10;

export const STEP_LABELS = [
  'Phone', 'Verify', 'Profile',
  'Identity', 'Location', 'Hours',
  'Media', 'Services', 'Pricing', 'Preview',
];

export const OnboardingProvider = ({ children, initialStep = 1, prefillPhone = '', prefillToken = '' }) => {
  const [step, setStep] = useState(initialStep);
  const minStep = initialStep;

  // ── Step 1-3: Auth ──────────────────────────────────────────
  const [phone, setPhone]               = useState(prefillPhone);
  const [firebaseToken, setFirebaseToken] = useState(prefillToken);

  // Step 3: Profile
  const [ownerName, setOwnerName]       = useState('');
  const [ownerEmail, setOwnerEmail]     = useState('');
  const [ownerGender, setOwnerGender]   = useState('');
  const [referralCode, setReferralCode] = useState('');

  // ── Step 4: Salon Identity ────────────────────────────────────
  const [salonName, setSalonName]           = useState('');
  const [salonCategory, setSalonCategory]   = useState('barber');
  const [servedGender, setServedGender]     = useState('');
  const [description, setDescription]       = useState('');
  const [quickSetup, setQuickSetup]         = useState(false);

  // ── Step 5: Location ─────────────────────────────────────────
  const [lat, setLat]         = useState(20.5937);
  const [lng, setLng]         = useState(78.9629);
  const [address, setAddress] = useState('');
  const [city, setCity]       = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  // ── Step 6: Working Hours ─────────────────────────────────────
  const [workingDays, setWorkingDays] = useState(['monday','tuesday','wednesday','thursday','friday','saturday']);
  const [openTime, setOpenTime]       = useState('09:00');
  const [closeTime, setCloseTime]     = useState('20:00');
  const [lunchBreak, setLunchBreak]   = useState(false);
  const [lunchStart, setLunchStart]   = useState('13:00');
  const [lunchEnd, setLunchEnd]       = useState('14:00');

  // ── Step 7: Media ─────────────────────────────────────────────
  const [photos, setPhotos]                         = useState([]); // [{uri, url}]
  const [videoUrl, setVideoUrl]                     = useState('');
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('');
  const [businessRegUrl, setBusinessRegUrl]         = useState('');

  // ── Step 8: Services ─────────────────────────────────────────
  // { 'catKey|||serviceName': true }
  const [selectedServices, setSelectedServices] = useState({});

  const toggleService = (catKey, name) => {
    const k = `${catKey}|||${name}`;
    setSelectedServices(prev => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = true;
      return next;
    });
  };

  // ── Step 9: Pricing ──────────────────────────────────────────
  // { 'catKey|||serviceName': { price: '', duration: '' } }
  const [servicePricing, setServicePricing] = useState({});

  const setPricing = (catKey, name, field, value) => {
    const k = `${catKey}|||${name}`;
    setServicePricing(prev => ({
      ...prev,
      [k]: { ...prev[k], [field]: value },
    }));
  };

  // ── Navigation ────────────────────────────────────────────────
  const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => setStep(s => Math.max(s - 1, minStep));
  const goToStep = (n) => setStep(n);

  return (
    <OnboardingContext.Provider value={{
      step, nextStep, prevStep, goToStep, minStep,

      // Auth
      phone, setPhone,
      firebaseToken, setFirebaseToken,
      ownerName, setOwnerName,
      ownerEmail, setOwnerEmail,
      ownerGender, setOwnerGender,
      referralCode, setReferralCode,

      // Salon
      salonName, setSalonName,
      salonCategory, setSalonCategory,
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

      // Services
      selectedServices, toggleService, setSelectedServices,

      // Pricing
      servicePricing, setPricing, setServicePricing,
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
