import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, FileText, Camera, ChevronRight, ChevronLeft, Check, Store, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhotoUpload from '../../components/salon/PhotoUpload';
import DocumentUpload from '../../components/salon/DocumentUpload';
import { useSalon } from '../../hooks/useSalon';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { uploadSalonPhotos } from '../../services/salonService';
import ROUTES from '../../routes';

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const SR_CSS = `
  @keyframes sr-orb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.15)}66%{transform:translate(-30px,30px) scale(0.9)}}
  @keyframes sr-orb2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-40px,40px) scale(1.1)}66%{transform:translate(30px,-30px) scale(0.95)}}
  @keyframes sr-fadeup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sr-spin{to{transform:rotate(360deg)}}
  @keyframes sr-pop{0%{transform:scale(0.94)}60%{transform:scale(1.04)}100%{transform:scale(1)}}

  /* ── Inputs (dark default) ── */
  .sr-inp{
    background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.14);border-radius:12px;
    color:#f1f5f9;padding:13px 16px;width:100%;outline:none;font-size:14px;
    transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;box-sizing:border-box;font-family:inherit;
  }
  .sr-inp:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(99,102,241,0.22);background:rgba(255,255,255,0.1);}
  .sr-inp::placeholder{color:rgba(255,255,255,0.28);}
  .sr-inp:disabled{opacity:0.45;cursor:not-allowed;}
  .sr-inp-err{border-color:rgba(248,113,113,0.75)!important;box-shadow:0 0 0 3px rgba(239,68,68,0.14)!important;}

  .sr-textarea{
    background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.14);border-radius:12px;
    color:#f1f5f9;padding:13px 16px;width:100%;outline:none;font-size:14px;resize:vertical;min-height:96px;
    transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;box-sizing:border-box;font-family:inherit;
  }
  .sr-textarea:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(99,102,241,0.22);background:rgba(255,255,255,0.1);}
  .sr-textarea::placeholder{color:rgba(255,255,255,0.28);}

  .sr-time{
    background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.14);border-radius:12px;
    color:#f1f5f9;padding:13px 14px;width:100%;outline:none;font-size:15px;
    transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;box-sizing:border-box;font-family:inherit;color-scheme:dark;
  }
  .sr-time:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(99,102,241,0.22);}

  /* ── Labels ── */
  .sr-label{display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,0.65);margin-bottom:7px;}
  .sr-err{color:#f87171;font-size:12px;margin-top:5px;display:block;font-weight:500;}
  .sr-req{color:#f87171;margin-left:2px;}
  .sr-opt{font-weight:400;margin-left:4px;font-size:12px;color:rgba(255,255,255,0.3);}

  /* ── Buttons ── */
  .sr-btn-primary{
    background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;
    font-weight:700;font-size:15px;padding:14px 28px;cursor:pointer;
    transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;
    display:inline-flex;align-items:center;gap:8px;font-family:inherit;letter-spacing:-0.2px;
  }
  .sr-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px rgba(99,102,241,0.45);}
  .sr-btn-primary:active:not(:disabled){transform:translateY(0);}
  .sr-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}

  .sr-btn-outline{
    background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;
    color:#cbd5e1;font-weight:600;font-size:15px;padding:13px 24px;cursor:pointer;
    transition:background 0.15s,border-color 0.15s,color 0.15s;
    display:inline-flex;align-items:center;gap:8px;font-family:inherit;
  }
  .sr-btn-outline:hover:not(:disabled){background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.25);color:#f1f5f9;}
  .sr-btn-outline:disabled{opacity:0.35;cursor:not-allowed;}

  .sr-theme-btn{
    background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.14);border-radius:10px;
    color:#94a3b8;cursor:pointer;padding:9px 11px;display:inline-flex;align-items:center;justify-content:center;
    transition:background 0.2s,border-color 0.2s,color 0.2s;font-family:inherit;
  }
  .sr-theme-btn:hover{background:rgba(99,102,241,0.2);border-color:rgba(99,102,241,0.5);color:#a5b4fc;}

  /* ── Gender cards ── */
  .sr-gender{
    background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.1);border-radius:14px;
    padding:18px 8px 16px;cursor:pointer;transition:all 0.2s ease;text-align:center;
    color:#94a3b8;font-family:inherit;width:100%;position:relative;overflow:hidden;
  }
  .sr-gender:hover{border-color:rgba(99,102,241,0.55);background:rgba(99,102,241,0.1);color:#a5b4fc;transform:translateY(-2px);}
  .sr-gender.active{
    background:rgba(99,102,241,0.18);border-color:#6366f1;color:#a5b4fc;
    transform:translateY(-2px);box-shadow:0 6px 22px rgba(99,102,241,0.3);animation:sr-pop 0.25s ease;
  }
  .sr-gender-icon{font-size:32px;margin-bottom:8px;display:block;line-height:1;}
  .sr-gender-label{font-size:13px;font-weight:700;display:block;letter-spacing:0.01em;}
  .sr-gender-desc{font-size:11px;opacity:0.65;display:block;margin-top:3px;}
  .sr-gender.active .sr-gender-check{
    position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;
    background:#6366f1;display:flex;align-items:center;justify-content:center;
  }
  .sr-gender-check{display:none;}
  .sr-gender.active .sr-gender-check{display:flex;}

  /* ── Day chips ── */
  .sr-day{
    background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;
    padding:10px 4px;cursor:pointer;transition:all 0.18s;text-align:center;
    color:#94a3b8;font-size:12px;font-weight:600;font-family:inherit;width:100%;
  }
  .sr-day:hover{border-color:rgba(99,102,241,0.5);background:rgba(99,102,241,0.1);color:#a5b4fc;}
  .sr-day.active{background:rgba(99,102,241,0.2);border-color:#6366f1;color:#a5b4fc;font-weight:700;}

  /* ── Inner cards ── */
  .sr-card-inner{
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    border-radius:14px;padding:20px;transition:background 0.2s,border-color 0.2s;
  }
  .sr-photo-wrap{
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    border-radius:14px;padding:16px;transition:background 0.2s;
  }

  /* ── Section heading ── */
  .sr-section-hd{
    font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;
    color:rgba(255,255,255,0.4);margin:0 0 16px;
  }

  /* ══ LIGHT MODE ══ */
  [data-lm] .sr-inp{background:#fff;border:1.5px solid #d1d5db;color:#111827;}
  [data-lm] .sr-inp::placeholder{color:#9ca3af;}
  [data-lm] .sr-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.15);background:#fff;}
  [data-lm] .sr-inp:disabled{background:#f3f4f6;}
  [data-lm] .sr-inp-err{border-color:rgba(220,38,38,0.7)!important;box-shadow:0 0 0 3px rgba(220,38,38,0.1)!important;}

  [data-lm] .sr-textarea{background:#fff;border:1.5px solid #d1d5db;color:#111827;}
  [data-lm] .sr-textarea::placeholder{color:#9ca3af;}
  [data-lm] .sr-textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.15);background:#fff;}

  [data-lm] .sr-time{background:#fff;border:1.5px solid #d1d5db;color:#111827;color-scheme:light;}
  [data-lm] .sr-time:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.15);}

  [data-lm] .sr-label{color:#374151;}
  [data-lm] .sr-opt{color:#9ca3af;}
  [data-lm] .sr-err{color:#dc2626;}

  [data-lm] .sr-btn-outline{background:#fff;border:1.5px solid #d1d5db;color:#374151;}
  [data-lm] .sr-btn-outline:hover:not(:disabled){background:#f5f3ff;border-color:#6366f1;color:#4f46e5;}

  [data-lm] .sr-theme-btn{background:#f5f3ff;border:1.5px solid #c7d2fe;color:#6d28d9;}
  [data-lm] .sr-theme-btn:hover{background:#ede9fe;border-color:#6366f1;color:#4f46e5;}

  [data-lm] .sr-gender{background:#fff;border:2px solid #e5e7eb;color:#374151;}
  [data-lm] .sr-gender:hover{border-color:#6366f1;background:#eef2ff;color:#4338ca;transform:translateY(-2px);}
  [data-lm] .sr-gender.active{background:#eef2ff;border-color:#6366f1;color:#4338ca;box-shadow:0 6px 22px rgba(99,102,241,0.18);}
  [data-lm] .sr-gender-desc{color:#6b7280;}

  [data-lm] .sr-day{background:#f9fafb;border:1.5px solid #e5e7eb;color:#6b7280;}
  [data-lm] .sr-day:hover{border-color:#6366f1;background:#eef2ff;color:#4338ca;}
  [data-lm] .sr-day.active{background:#eef2ff;border-color:#6366f1;color:#4338ca;font-weight:700;}

  [data-lm] .sr-card-inner{background:#f9fafb;border:1px solid #e5e7eb;}
  [data-lm] .sr-photo-wrap{background:#f9fafb;border:1px solid #e5e7eb;}
  [data-lm] .sr-section-hd{color:#6b7280;}

  /* ── Responsive ── */
  @media(max-width:640px){
    .sr-grid2{grid-template-columns:1fr!important;}
    .sr-days-grid{grid-template-columns:repeat(4,1fr)!important;}
    .sr-gender-grid{grid-template-columns:repeat(3,1fr)!important;}
    .sr-card-pad{padding:20px 18px!important;}
    .sr-header-title{font-size:22px!important;}
    .sr-step-label{display:none!important;}
  }
  @media(max-width:400px){
    .sr-days-grid{grid-template-columns:repeat(4,1fr)!important;}
  }
`;

const INDIAN_STATES = [
  'Andaman & Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam',
  'Bihar','Chandigarh','Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand',
  'Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Puducherry','Punjab','Rajasthan','Sikkim',
  'Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
];

const STEP_META = [
  { num: 1, label: 'Basic Info', Icon: FileText },
  { num: 2, label: 'Location',  Icon: MapPin   },
  { num: 3, label: 'Hours',     Icon: Clock    },
  { num: 4, label: 'Photos',    Icon: Camera   },
];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male',   icon: '♂',  desc: 'Men only'    },
  { value: 'female', label: 'Female', icon: '♀',  desc: 'Women only'  },
  { value: 'unisex', label: 'Unisex', icon: '⚥',  desc: 'Everyone'   },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
const SalonRegistration = () => {
  const navigate = useNavigate();
  const { createSalon, fetchSalon } = useSalon();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    fetchSalon().then((res) => {
      if (res?.data) navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    });
  }, []);

  const mapRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const [step1Data, setStep1Data] = useState({
    name: '', description: '', servedGender: '', phone: '', email: '', state: '', district: '',
  });
  const [step1Errors, setStep1Errors] = useState({});

  useEffect(() => {
    if (user) {
      setStep1Data(prev => ({
        ...prev,
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const [step2Data, setStep2Data]           = useState({ address: '', latitude: null, longitude: null });
  const [step2Errors, setStep2Errors]       = useState({});
  const [map, setMap]                       = useState(null);
  const markerRef                           = useRef(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus]   = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const watchIdRef                            = useRef(null);

  const stopWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const getFineLocation = (mapInstance) => {
    if (!navigator.geolocation) { setLocationStatus('Geolocation not supported. Enter address manually.'); return; }
    stopWatch();
    setLocationLoading(true);
    setLocationAccuracy(null);
    setLocationStatus('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        mapInstance.setCenter({ lat, lng });
        mapInstance.setZoom(17);
        placeMarker(mapInstance, lat, lng);
        setLocationAccuracy(acc);
        setLocationStatus(`Refining accuracy… (currently ±${acc}m)`);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (refined) => {
            const rLat = refined.coords.latitude;
            const rLng = refined.coords.longitude;
            const rAcc = Math.round(refined.coords.accuracy);
            placeMarker(mapInstance, rLat, rLng);
            setLocationAccuracy(rAcc);
            if (rAcc <= 10) {
              stopWatch();
              setLocationLoading(false);
              setLocationStatus(`Fine location locked (±${rAcc}m). Drag the pin to adjust.`);
            } else {
              setLocationStatus(`Refining accuracy… (±${rAcc}m)`);
            }
          },
          () => { stopWatch(); setLocationLoading(false); setLocationStatus(`Location set (±${acc}m). Drag the pin to fine-tune.`); },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
        setTimeout(() => {
          if (watchIdRef.current !== null) {
            stopWatch();
            setLocationLoading(false);
            setLocationStatus(`Location set (±${locationAccuracy ?? acc}m). Drag the pin to adjust.`);
          }
        }, 20000);
      },
      (err) => {
        setLocationLoading(false);
        setLocationStatus('Could not detect location. Click on the map to set it manually.');
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 8000 }
    );
  };

  const [step3Data, setStep3Data] = useState({
    openingTime: '09:00', closingTime: '21:00',
    lunchBreakStart: '13:00', lunchBreakEnd: '14:00',
    daysOfOperation: [
      { day: 'Monday',    selected: true  },
      { day: 'Tuesday',   selected: true  },
      { day: 'Wednesday', selected: true  },
      { day: 'Thursday',  selected: true  },
      { day: 'Friday',    selected: true  },
      { day: 'Saturday',  selected: true  },
      { day: 'Sunday',    selected: false },
    ],
  });
  const [step3Errors, setStep3Errors] = useState({});

  const [step4Data, setStep4Data] = useState({
    photos: [], businessLicense: [], businessRegistration: [],
  });
  const [step4Errors, setStep4Errors] = useState({});

  const placeMarker = (mapInstance, lat, lng) => {
    if (markerRef.current) markerRef.current.setMap(null);
    const newMarker = new window.google.maps.Marker({
      position: { lat, lng }, map: mapInstance, draggable: true, title: 'Drag to adjust location',
    });
    setStep2Data(prev => ({ ...prev, latitude: lat, longitude: lng }));
    mapInstance.panTo({ lat, lng });
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) setStep2Data(prev => ({ ...prev, address: results[0].formatted_address }));
    });
    newMarker.addListener('dragend', () => {
      const pos = newMarker.getPosition();
      const dLat = pos.lat(); const dLng = pos.lng();
      setStep2Data(prev => ({ ...prev, latitude: dLat, longitude: dLng }));
      geocoder.geocode({ location: { lat: dLat, lng: dLng } }, (res, s) => {
        if (s === 'OK' && res[0]) setStep2Data(prev => ({ ...prev, address: res[0].formatted_address }));
      });
    });
    markerRef.current = newMarker;
    return newMarker;
  };

  useEffect(() => {
    if (currentStep !== 2 || !mapRef.current || map) return;
    const defaultLocation = { lat: 28.7041, lng: 77.1025 };
    const newMap = new window.google.maps.Map(mapRef.current, {
      zoom: 15, center: defaultLocation, mapTypeControl: false, streetViewControl: false,
    });
    newMap.addListener('click', (event) => { placeMarker(newMap, event.latLng.lat(), event.latLng.lng()); });
    setMap(newMap);
    getFineLocation(newMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, map]);

  useEffect(() => {
    if (currentStep !== 2) stopWatch();
    return () => stopWatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleStep1Change = (e) => {
    const { name, value } = e.target;
    setStep1Data(prev => ({ ...prev, [name]: value }));
    if (step1Errors[name]) setStep1Errors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = () => {
    const errors = {};
    if (!step1Data.name.trim()) errors.name = 'Salon name is required';
    if (!step1Data.phone.trim()) errors.phone = 'Phone is required';
    else if (!/^\+?[\d\s\-()]{9,}$/.test(step1Data.phone)) errors.phone = 'Phone is invalid';
    if (!step1Data.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(step1Data.email)) errors.email = 'Email is invalid';
    if (!step1Data.state) errors.state = 'State is required';
    if (!step1Data.district.trim()) errors.district = 'District is required';
    if (!step1Data.servedGender) errors.servedGender = 'Please select who you serve';
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!step2Data.address.trim()) errors.address = 'Address is required';
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (e) => {
    setStep2Data(prev => ({ ...prev, address: e.target.value }));
    if (step2Errors.address) setStep2Errors(prev => ({ ...prev, address: '' }));
  };

  const handleStep3Change = (e) => {
    const { name, value } = e.target;
    setStep3Data(prev => ({ ...prev, [name]: value }));
    if (step3Errors[name]) setStep3Errors(prev => ({ ...prev, [name]: '' }));
  };

  const handleDayToggle = (dayIndex) => {
    setStep3Data(prev => ({
      ...prev,
      daysOfOperation: prev.daysOfOperation.map((d, i) => i === dayIndex ? { ...d, selected: !d.selected } : d),
    }));
  };

  const validateStep3 = () => {
    const errors = {};
    if (!step3Data.openingTime) errors.openingTime = 'Opening time is required';
    if (!step3Data.closingTime) errors.closingTime = 'Closing time is required';
    if (step3Data.openingTime >= step3Data.closingTime) errors.closingTime = 'Closing time must be after opening time';
    if (!step3Data.daysOfOperation.some(d => d.selected)) errors.days = 'Select at least one day';
    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep4 = () => {
    // Photos are optional — owners can upload from the Gallery after registration
    setStep4Errors({});
    return true;
  };

  const handleNext = () => {
    let isValid = false;
    switch (currentStep) {
      case 1: isValid = validateStep1(); break;
      case 2: isValid = validateStep2(); break;
      case 3: isValid = validateStep3(); break;
      default: isValid = true;
    }
    if (isValid) { setCurrentStep(prev => prev + 1); setError(''); }
  };

  const handlePrev = () => { setCurrentStep(prev => prev - 1); setError(''); };

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    setLoading(true); setError('');
    try {
      const dayMap = {
        Monday:'monday', Tuesday:'tuesday', Wednesday:'wednesday',
        Thursday:'thursday', Friday:'friday', Saturday:'saturday', Sunday:'sunday',
      };
      const workingHours = {};
      Object.entries(dayMap).forEach(([label, key]) => {
        const dayObj = step3Data.daysOfOperation.find(d => d.day === label);
        const isClosed = !dayObj?.selected;
        workingHours[key] = { open: isClosed ? '09:00' : step3Data.openingTime, close: isClosed ? '18:00' : step3Data.closingTime, isClosed };
      });

      let photoUrls = [];
      if (step4Data.photos.length > 0) {
        toast.loading('Uploading photos...', { id: 'photo-upload' });
        photoUrls = await uploadSalonPhotos(step4Data.photos);
        toast.dismiss('photo-upload');
      }

      const salonPayload = {
        name: step1Data.name, description: step1Data.description,
        servedGender: step1Data.servedGender, offeredCategories: [], kidsHaircut: false, atHomeServices: false,
        phone: step1Data.phone, email: step1Data.email,
        address: `${step1Data.district}, ${step1Data.state}`,
        city: step1Data.district,
        state: step1Data.state,
        workingHours, photos: photoUrls,
      };
      if (step2Data.latitude && step2Data.longitude) {
        salonPayload.location = { latitude: step2Data.latitude, longitude: step2Data.longitude };
      }

      await createSalon(salonPayload);
      toast.success('Salon registered successfully!');
      navigate(ROUTES.APPROVAL_WAITING);
    } catch (err) {
      const status  = err.response?.status || err.status;
      const message = err.response?.data?.message || err.message || '';
      if (status === 409) {
        // "You already have a salon registered" → go to waiting page
        if (message.toLowerCase().includes('already have') || message.toLowerCase().includes('already registered')) {
          navigate(ROUTES.APPROVAL_WAITING, { replace: true }); return;
        }
        // "Phone already in use" or any other 409 → show error, let user fix it
        setError(message || 'A conflict occurred. Please check your details and try again.');
        return;
      }
      const backendErrors = err.response?.data?.errors || err.data?.errors;
      if (backendErrors && Array.isArray(backendErrors) && backendErrors.length > 0) {
        setError(`Validation failed:\n• ${backendErrors.join('\n• ')}`);
      } else {
        setError(message || 'Failed to register salon');
      }
    } finally { setLoading(false); }
  };

  const progressPct = ((currentStep - 1) / 3) * 100;

  /* ── Theme tokens ── */
  const bg           = isDark ? '#07071a' : '#f1f4ff';
  const cardBg       = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder   = isDark ? '1.5px solid rgba(255,255,255,0.09)' : '1.5px solid #e5e7eb';
  const cardShadow   = isDark ? '0 0 0 0 transparent' : '0 10px 48px rgba(99,102,241,0.1), 0 2px 10px rgba(0,0,0,0.06)';
  const textPrimary  = isDark ? '#f8fafc' : '#0f172a';
  const textMuted    = isDark ? 'rgba(255,255,255,0.5)' : '#4b5563';
  const textFaint    = isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af';
  const stepInactive = isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6';
  const stepInactiveBorder = isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';
  const stepLabelInactive  = isDark ? 'rgba(255,255,255,0.28)' : '#9ca3af';
  const stepConnector      = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const sectionHdColor     = isDark ? 'rgba(255,255,255,0.38)' : '#9ca3af';
  const summaryBg    = isDark ? 'rgba(99,102,241,0.07)' : '#f5f3ff';
  const summaryBorder = isDark ? 'rgba(99,102,241,0.22)' : '#ddd6fe';
  const summaryTitle = isDark ? '#a5b4fc' : '#4f46e5';
  const summaryLabelC = isDark ? 'rgba(255,255,255,0.4)' : '#6b7280';
  const summaryValueC = isDark ? '#e2e8f0' : '#111827';
  const coordsBg     = isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff';
  const coordsBorder = isDark ? 'rgba(99,102,241,0.22)' : '#c7d2fe';
  const coordsText   = isDark ? '#a5b4fc' : '#4338ca';
  const mapBorder    = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const orbColor1    = isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.14)';
  const orbColor2    = isDark ? 'rgba(139,92,246,0.16)' : 'rgba(139,92,246,0.1)';
  const footerColor  = isDark ? 'rgba(255,255,255,0.18)' : '#9ca3af';
  const progressTrack = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{SR_CSS}</style>
      {/* data-lm enables [data-lm] CSS selectors for light mode overrides */}
      <div
        data-lm={isDark ? undefined : '1'}
        style={{
          minHeight: '100vh',
          background: bg,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
          transition: 'background 0.3s ease',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position:'fixed', top:'-15%', left:'-8%', width:560, height:560, borderRadius:'50%', background:`radial-gradient(circle,${orbColor1} 0%,transparent 70%)`, animation:'sr-orb1 20s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', bottom:'-15%', right:'-8%', width:480, height:480, borderRadius:'50%', background:`radial-gradient(circle,${orbColor2} 0%,transparent 70%)`, animation:'sr-orb2 24s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />

        <div style={{ position:'relative', zIndex:1, maxWidth:760, margin:'0 auto', padding:'36px 16px 72px' }}>

          {/* ── Header ── */}
          <div style={{ textAlign:'center', marginBottom:32, animation:'sr-fadeup 0.5s ease', position:'relative' }}>
            <button onClick={toggleTheme} className="sr-theme-btn" style={{ position:'absolute', right:0, top:0 }} aria-label="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 20px rgba(99,102,241,0.35)' }}>
                <Store size={20} color="#fff" />
              </div>
              <span style={{ fontSize:17, fontWeight:700, color:textPrimary, letterSpacing:'-0.3px' }}>My Salon Bookings</span>
            </div>
            <h1 className="sr-header-title" style={{ fontSize:26, fontWeight:800, color:textPrimary, margin:0, marginBottom:6, letterSpacing:'-0.5px' }}>Register Your Salon</h1>
            <p style={{ color:textMuted, fontSize:14, margin:0 }}>Complete all 4 steps to get your salon listed</p>
          </div>

          {/* ── Step Indicator ── */}
          <div style={{ display:'flex', alignItems:'center', marginBottom:28, animation:'sr-fadeup 0.5s ease 0.08s both' }}>
            {STEP_META.map((step, idx) => {
              const done    = currentStep > step.num;
              const active  = currentStep === step.num;
              return (
                <React.Fragment key={step.num}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                    <div style={{
                      width:42, height:42, borderRadius:'50%',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize:14, transition:'all 0.3s',
                      background: done ? 'linear-gradient(135deg,#10b981,#059669)' : active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : stepInactive,
                      color: (done || active) ? '#fff' : stepLabelInactive,
                      boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.2), 0 4px 16px rgba(99,102,241,0.4)' : done ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                      border: (!done && !active) ? `1.5px solid ${stepInactiveBorder}` : 'none',
                    }}>
                      {done ? <Check size={17} /> : step.num}
                    </div>
                    <span className="sr-step-label" style={{ fontSize:11, fontWeight: active ? 700 : 400, color: (done || active) ? (isDark ? '#a5b4fc' : '#4f46e5') : stepLabelInactive, whiteSpace:'nowrap' }}>
                      {step.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div style={{ flex:1, height:2, margin:'0 6px 22px', background:stepConnector, borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', transform: done ? 'scaleX(1)' : 'scaleX(0)', transformOrigin:'left', transition:'transform 0.4s ease' }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Error Banner ── */}
          {error && (
            <div style={{ background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', border:`1.5px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`, borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', animation:'sr-fadeup 0.3s ease' }}>
              <div>
                <p style={{ color:'#ef4444', fontWeight:700, fontSize:14, margin:0, marginBottom:4 }}>Registration Error</p>
                <pre style={{ color: isDark ? '#fca5a5' : '#991b1b', fontSize:13, margin:0, whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{error}</pre>
              </div>
              <button onClick={() => setError('')} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:22, lineHeight:1, padding:0, marginLeft:12 }}>×</button>
            </div>
          )}

          {/* ── Main Card ── */}
          <div style={{ background:cardBg, border:cardBorder, borderRadius:20, overflow:'hidden', animation:'sr-fadeup 0.5s ease 0.14s both', transition:'background 0.2s, border-color 0.2s, box-shadow 0.3s', boxShadow:cardShadow }}>

            {/* Progress bar */}
            <div style={{ height:3, background:progressTrack }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', width:`${progressPct}%`, transition:'width 0.4s ease', borderRadius:'0 3px 3px 0' }} />
            </div>

            <div className="sr-card-pad" style={{ padding:'32px 36px' }}>

              {/* ══ STEP 1 ══ */}
              {currentStep === 1 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  {/* Step header */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background: isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={20} color="#6366f1" />
                    </div>
                    <div>
                      <h2 style={{ color:textPrimary, fontWeight:700, fontSize:19, margin:0 }}>Basic Information</h2>
                      <p style={{ color:textFaint, fontSize:13, margin:0 }}>Tell us about your salon</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

                    {/* Salon Name */}
                    <div>
                      <label className="sr-label">Salon Name <span className="sr-req">*</span></label>
                      <input className={`sr-inp${step1Errors.name ? ' sr-inp-err' : ''}`} name="name" value={step1Data.name} onChange={handleStep1Change} placeholder="e.g. Glamour Studio" />
                      {step1Errors.name && <span className="sr-err">{step1Errors.name}</span>}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="sr-label">Description <span className="sr-opt">(Optional)</span></label>
                      <textarea className="sr-textarea" name="description" value={step1Data.description} onChange={handleStep1Change} placeholder="Describe your salon, specialties, and what makes you unique…" />
                    </div>

                    {/* Who Do You Serve — Service Menu Card */}
                    <div className="sr-card-inner" style={{ padding:'20px 22px' }}>
                      {/* Card header */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                        <div style={{ width:34, height:34, borderRadius:9, background: isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontSize:17 }}>💈</span>
                        </div>
                        <div>
                          <p style={{ margin:0, fontWeight:700, fontSize:14, color:textPrimary }}>
                            Who Do You Serve? <span className="sr-req">*</span>
                          </p>
                          <p style={{ margin:0, fontSize:12, color:textFaint }}>Select the type of clients your salon caters to</p>
                        </div>
                      </div>

                      {/* Selection chips */}
                      <div className="sr-gender-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                        {GENDER_OPTIONS.map(({ value, label, icon, desc }) => (
                          <button
                            key={value}
                            type="button"
                            className={`sr-gender${step1Data.servedGender === value ? ' active' : ''}`}
                            onClick={() => { setStep1Data(prev => ({ ...prev, servedGender: value })); if (step1Errors.servedGender) setStep1Errors(prev => ({ ...prev, servedGender: '' })); }}
                          >
                            <span className="sr-gender-check">
                              <Check size={11} color="#fff" />
                            </span>
                            <span className="sr-gender-icon">{icon}</span>
                            <span className="sr-gender-label">{label}</span>
                            <span className="sr-gender-desc">{desc}</span>
                          </button>
                        ))}
                      </div>

                      {/* Selected confirmation */}
                      {step1Data.servedGender && (
                        <div style={{ marginTop:14, padding:'9px 14px', borderRadius:10, background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid #c7d2fe', display:'flex', alignItems:'center', gap:8 }}>
                          <Check size={14} color={isDark ? '#a5b4fc' : '#4f46e5'} />
                          <span style={{ fontSize:13, color: isDark ? '#a5b4fc' : '#4338ca', fontWeight:600 }}>
                            Serving {step1Data.servedGender === 'male' ? 'Men only' : step1Data.servedGender === 'female' ? 'Women only' : 'Everyone (Unisex)'}
                          </span>
                        </div>
                      )}

                      {step1Errors.servedGender && <span className="sr-err" style={{ marginTop:10, display:'block' }}>{step1Errors.servedGender}</span>}
                    </div>

                    {/* Phone + Email */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="sr-grid2">
                      <div>
                        <label className="sr-label">Phone Number <span className="sr-req">*</span></label>
                        <input className={`sr-inp${step1Errors.phone ? ' sr-inp-err' : ''}`} name="phone" type="tel" value={step1Data.phone} onChange={handleStep1Change} placeholder="+91 98765 43210" readOnly={!!user?.phone} disabled={!!user?.phone} />
                        {step1Errors.phone && <span className="sr-err">{step1Errors.phone}</span>}
                      </div>
                      <div>
                        <label className="sr-label">Email Address <span className="sr-req">*</span></label>
                        <input className={`sr-inp${step1Errors.email ? ' sr-inp-err' : ''}`} name="email" type="email" value={step1Data.email} onChange={handleStep1Change} placeholder="salon@email.com" readOnly={!!user?.email} disabled={!!user?.email} />
                        {step1Errors.email && <span className="sr-err">{step1Errors.email}</span>}
                      </div>
                    </div>

                    {/* State + District */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="sr-grid2">
                      <div>
                        <label className="sr-label">State <span className="sr-req">*</span></label>
                        <select
                          className={`sr-inp${step1Errors.state ? ' sr-inp-err' : ''}`}
                          name="state"
                          value={step1Data.state}
                          onChange={handleStep1Change}
                          style={{ appearance:'none', cursor:'pointer' }}
                        >
                          <option value="">Select state…</option>
                          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {step1Errors.state && <span className="sr-err">{step1Errors.state}</span>}
                      </div>
                      <div>
                        <label className="sr-label">District <span className="sr-req">*</span></label>
                        <input
                          className={`sr-inp${step1Errors.district ? ' sr-inp-err' : ''}`}
                          name="district"
                          value={step1Data.district}
                          onChange={handleStep1Change}
                          placeholder="e.g. Koramangala"
                        />
                        {step1Errors.district && <span className="sr-err">{step1Errors.district}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 2 ══ */}
              {currentStep === 2 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <MapPin size={20} color="#3b82f6" />
                    </div>
                    <div>
                      <h2 style={{ color:textPrimary, fontWeight:700, fontSize:19, margin:0 }}>Pin Your Location</h2>
                      <p style={{ color:textFaint, fontSize:13, margin:0 }}>Help customers find you on the map</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {locationStatus && (
                      <div style={{
                        padding:'11px 16px', borderRadius:10, fontSize:13,
                        display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
                        background: locationLoading ? (isDark ? 'rgba(234,179,8,0.1)' : '#fefce8') : step2Data.latitude ? (isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4') : (isDark ? 'rgba(249,115,22,0.1)' : '#fff7ed'),
                        border: `1.5px solid ${locationLoading ? (isDark ? 'rgba(234,179,8,0.3)' : '#fde047') : step2Data.latitude ? (isDark ? 'rgba(34,197,94,0.3)' : '#bbf7d0') : (isDark ? 'rgba(249,115,22,0.3)' : '#fed7aa')}`,
                        color: locationLoading ? (isDark ? '#fde047' : '#854d0e') : step2Data.latitude ? (isDark ? '#86efac' : '#15803d') : (isDark ? '#fdba74' : '#c2410c'),
                      }}>
                        <span>{locationLoading ? '📍 ' : step2Data.latitude ? '✅ ' : '⚠️ '}{locationStatus}</span>
                        {!locationLoading && (
                          <button type="button" onClick={() => getFineLocation(map)} style={{ background:'none', border:'none', fontSize:12, fontWeight:600, textDecoration:'underline', cursor:'pointer', color:'inherit', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                            Re-detect
                          </button>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="sr-label">Click on the map or drag the pin <span className="sr-opt">(auto-detects location)</span></label>
                      <div ref={mapRef} style={{ width:'100%', height:380, borderRadius:14, border:`1.5px solid ${mapBorder}`, overflow:'hidden' }} />
                    </div>
                    <div>
                      <label className="sr-label">Address <span className="sr-req">*</span> <span className="sr-opt">(auto-filled from map)</span></label>
                      <input className={`sr-inp${step2Errors.address ? ' sr-inp-err' : ''}`} name="address" value={step2Data.address} onChange={handleAddressChange} placeholder="Auto-filled from map — or type manually" />
                      {step2Errors.address && <span className="sr-err">{step2Errors.address}</span>}
                    </div>
                    {step2Data.latitude && step2Data.longitude && (
                      <div style={{ background:coordsBg, border:`1px solid ${coordsBorder}`, borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                        <p style={{ color:coordsText, fontSize:13, margin:0, fontWeight:500 }}>
                          📍 {step2Data.latitude.toFixed(6)}, {step2Data.longitude.toFixed(6)}
                        </p>
                        {locationAccuracy !== null && (
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                            background: locationAccuracy <= 10 ? (isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7') : locationAccuracy <= 30 ? (isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe') : (isDark ? 'rgba(234,179,8,0.2)' : '#fef9c3'),
                            color: locationAccuracy <= 10 ? (isDark ? '#86efac' : '#15803d') : locationAccuracy <= 30 ? (isDark ? '#93c5fd' : '#1d4ed8') : '#d97706',
                          }}>
                            {locationAccuracy <= 10 ? '🎯' : locationAccuracy <= 30 ? '📍' : '⚠️'} ±{locationAccuracy}m
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══ STEP 3 ══ */}
              {currentStep === 3 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Clock size={20} color="#10b981" />
                    </div>
                    <div>
                      <h2 style={{ color:textPrimary, fontWeight:700, fontSize:19, margin:0 }}>Working Hours</h2>
                      <p style={{ color:textFaint, fontSize:13, margin:0 }}>Set when customers can book appointments</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div className="sr-card-inner">
                      <p className="sr-section-hd" style={{ color:sectionHdColor }}>Operating Hours</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="sr-grid2">
                        <div>
                          <label className="sr-label">Opening Time</label>
                          <input type="time" name="openingTime" value={step3Data.openingTime} onChange={handleStep3Change} className="sr-time" />
                          {step3Errors.openingTime && <span className="sr-err">{step3Errors.openingTime}</span>}
                        </div>
                        <div>
                          <label className="sr-label">Closing Time</label>
                          <input type="time" name="closingTime" value={step3Data.closingTime} onChange={handleStep3Change} className="sr-time" />
                          {step3Errors.closingTime && <span className="sr-err">{step3Errors.closingTime}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="sr-card-inner">
                      <p className="sr-section-hd" style={{ color:sectionHdColor }}>
                        Lunch Break <span style={{ textTransform:'none', fontWeight:400, fontSize:11 }}>(Optional)</span>
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="sr-grid2">
                        <div>
                          <label className="sr-label">Start</label>
                          <input type="time" name="lunchBreakStart" value={step3Data.lunchBreakStart} onChange={handleStep3Change} className="sr-time" />
                        </div>
                        <div>
                          <label className="sr-label">End</label>
                          <input type="time" name="lunchBreakEnd" value={step3Data.lunchBreakEnd} onChange={handleStep3Change} className="sr-time" />
                        </div>
                      </div>
                    </div>

                    <div className="sr-card-inner">
                      <p className="sr-section-hd" style={{ color:sectionHdColor }}>Days of Operation</p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }} className="sr-days-grid">
                        {step3Data.daysOfOperation.map((dayObj, index) => (
                          <button key={index} type="button" className={`sr-day${dayObj.selected ? ' active' : ''}`} onClick={() => handleDayToggle(index)}>
                            {dayObj.day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                      {step3Errors.days && <span className="sr-err" style={{ marginTop:10 }}>{step3Errors.days}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 4 ══ */}
              {currentStep === 4 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Camera size={20} color="#f59e0b" />
                    </div>
                    <div>
                      <h2 style={{ color:textPrimary, fontWeight:700, fontSize:19, margin:0 }}>Photos & Documents</h2>
                      <p style={{ color:textFaint, fontSize:13, margin:0 }}>Showcase your salon to attract customers</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                    <div>
                      <label className="sr-label">
                        Salon Photos <span className="sr-opt"> — optional, can be added later from Gallery</span>
                      </label>
                      <div className="sr-photo-wrap">
                        <PhotoUpload
                          photos={step4Data.photos}
                          onPhotosChange={(updatedPhotos) => setStep4Data(prev => ({ ...prev, photos: updatedPhotos }))}
                          disabled={loading}
                        />
                      </div>
                      {step4Errors.photos && <span className="sr-err">{step4Errors.photos}</span>}
                    </div>

                    <DocumentUpload
                      label="Business License (Optional)"
                      documents={step4Data.businessLicense}
                      onDocumentsChange={(docs) => setStep4Data(prev => ({ ...prev, businessLicense: docs }))}
                      description="PDF, JPG, PNG • Up to 5MB"
                      disabled={loading}
                    />

                    <DocumentUpload
                      label="Business Registration (Optional)"
                      documents={step4Data.businessRegistration}
                      onDocumentsChange={(docs) => setStep4Data(prev => ({ ...prev, businessRegistration: docs }))}
                      description="PDF, JPG, PNG • Up to 5MB"
                      disabled={loading}
                    />

                    {/* Summary */}
                    <div style={{ background:summaryBg, border:`1px solid ${summaryBorder}`, borderRadius:16, padding:20 }}>
                      <p style={{ color:summaryTitle, fontSize:11, fontWeight:700, margin:'0 0 16px', textTransform:'uppercase', letterSpacing:'0.07em' }}>Registration Summary</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="sr-grid2">
                        {[
                          { label:'Salon Name',   value: step1Data.name || '—' },
                          { label:'Services For', value: step1Data.servedGender ? step1Data.servedGender.charAt(0).toUpperCase() + step1Data.servedGender.slice(1) : '—' },
                          { label:'Address',      value: step2Data.address || step1Data.address || '—' },
                          { label:'Hours',        value: `${step3Data.openingTime} – ${step3Data.closingTime}` },
                          { label:'Open Days',    value: `${step3Data.daysOfOperation.filter(d => d.selected).length} days/week` },
                          { label:'Photos',       value: step4Data.photos.length === 0 ? 'None — required' : `${step4Data.photos.length} uploaded`, warn: step4Data.photos.length === 0 },
                        ].map(({ label, value, warn }) => (
                          <div key={label}>
                            <p style={{ color:summaryLabelC, fontSize:12, margin:'0 0 3px', fontWeight:500 }}>{label}</p>
                            <p style={{ color: warn ? '#ef4444' : summaryValueC, fontSize:14, fontWeight:600, margin:0 }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Navigation ── */}
          <div style={{ display:'flex', gap:12, marginTop:20, animation:'sr-fadeup 0.5s ease 0.2s both', alignItems:'center' }}>
            <button className="sr-btn-outline" onClick={handlePrev} disabled={currentStep === 1 || loading}>
              <ChevronLeft size={18} /> Previous
            </button>
            <div style={{ flex:1 }} />
            <span style={{ fontSize:13, color:textFaint, fontWeight:500 }}>Step {currentStep} of 4</span>
            <div style={{ flex:1 }} />
            {currentStep < 4 ? (
              <button className="sr-btn-primary" onClick={handleNext} disabled={loading}>
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button className="sr-btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'sr-spin 0.7s linear infinite' }} /> Registering…</>
                ) : (
                  <><Check size={18} /> Complete Registration</>
                )}
              </button>
            )}
          </div>

          <p style={{ textAlign:'center', color:footerColor, fontSize:12, marginTop:32 }}>
            © 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default SalonRegistration;
