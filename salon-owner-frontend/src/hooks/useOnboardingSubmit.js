import { useCallback, useState } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { useSalon } from './useSalon';
import { useAuth } from './useAuth';
import api from '../services/api';

/* ─── Build workingHours object for backend ─────────────────── */
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS   = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function buildWorkingHours(data) {
  const wh = {};
  DAY_KEYS.forEach((key, i) => {
    const isClosed = !data.workingDays.includes(DAY_LABELS[i]);
    wh[key] = {
      open:     isClosed ? '09:00' : data.openTime,
      close:    isClosed ? '21:00' : data.closeTime,
      isClosed,
      ...(data.hasLunchBreak && !isClosed
        ? { lunchStart: data.lunchStart, lunchEnd: data.lunchEnd }
        : {}),
    };
  });
  return wh;
}

/* ─── Group selected services into offeredCategories ─────────── */
function buildOfferedCategories(selectedServices, servicePricing) {
  const map = {};
  selectedServices.forEach(({ categoryKey, categoryLabel, serviceName }) => {
    if (!map[categoryKey]) map[categoryKey] = { name: categoryLabel, subServices: [] };
    const pricing = servicePricing[serviceName] || {};
    map[categoryKey].subServices.push({
      name:     serviceName,
      price:    parseFloat(pricing.price)    || 0,
      duration: parseInt(pricing.duration, 10) || 30,
    });
  });
  return Object.values(map);
}

/* ─── Hook ──────────────────────────────────────────────────── */
export function useOnboardingSubmit() {
  const { data } = useOnboarding();
  const { createSalon } = useSalon();
  const { user, refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState('');  // 'uploading' | 'creating' | 'done'

  const submit = useCallback(async () => {
    setSubmitting(true);
    setPhase('creating');
    try {
      const workingHours      = buildWorkingHours(data);
      const offeredCategories = buildOfferedCategories(data.selectedServices, data.servicePricing);

      const photoUrls  = data.photos.map(p => p.url);
      const coverPhoto = data.photos.find(p => p.isCover)?.url || photoUrls[0] || '';

      const phone = user?.phone || data.phone;

      const payload = {
        name:             data.salonName,
        phone:            phone,
        email:            user?.email || data.email || '',
        address:          data.address || `${data.district}, ${data.state}`,
        city:             data.district || data.city,
        state:            data.state,
        pincode:          data.pincode,
        description:      data.description,
        businessType:        data.businessType || 'salon',
        servedGender:     data.servedGender,
        workingHours,
        offeredCategories,
        photos:           photoUrls,
        coverPhoto,
        kidsHaircut:      false,
        atHomeServices:   false,
      };

      if (data.videoUrl)  payload.videoUrl  = data.videoUrl;
      if (data.businessLicenseUrl)      payload.businessLicenseUrl      = data.businessLicenseUrl;
      if (data.businessRegistrationUrl) payload.businessRegistrationUrl = data.businessRegistrationUrl;
      if (data.lat && data.lng) {
        payload.location = { latitude: data.lat, longitude: data.lng };
      }

      console.log('[onboarding submit] payload.businessType:', payload.businessType, '| data.businessType:', data.businessType);
      await createSalon(payload);
      await refreshUser();
      setPhase('done');
      return { success: true };
    } catch (err) {
      setPhase('');
      const status  = err?.response?.status || err?.status;
      const message = err?.response?.data?.message || err?.message || 'Something went wrong';

      // Already registered → still treat as success and redirect
      if (status === 409 && message.toLowerCase().includes('already')) {
        await refreshUser();
        setPhase('done');
        return { success: true };
      }
      return { success: false, message };
    } finally {
      setSubmitting(false);
    }
  }, [data, user, createSalon, refreshUser]);

  return { submit, submitting, phase };
}
