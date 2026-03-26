import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, FileText, Camera, ChevronRight, ChevronLeft, Check, Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhotoUpload from '../../components/salon/PhotoUpload';
import DocumentUpload from '../../components/salon/DocumentUpload';
import { useSalon } from '../../hooks/useSalon';
import { useAuth } from '../../hooks/useAuth';
import { uploadSalonPhotos } from '../../services/salonService';
import ROUTES from '../../routes';

/* ─── CSS injected once ─────────────────────────────────────────────────── */
const SR_CSS = `
  @keyframes sr-orb1 {
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(40px,-50px) scale(1.15)}
    66%{transform:translate(-30px,30px) scale(0.9)}
  }
  @keyframes sr-orb2 {
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(-40px,40px) scale(1.1)}
    66%{transform:translate(30px,-30px) scale(0.95)}
  }
  @keyframes sr-fadeup {
    from{opacity:0;transform:translateY(20px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes sr-spin { to{transform:rotate(360deg)} }

  .sr-inp {
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:12px;
    color:#f1f5f9;
    padding:12px 16px;
    width:100%;
    outline:none;
    font-size:14px;
    transition:border-color 0.2s, box-shadow 0.2s;
    box-sizing:border-box;
    font-family:inherit;
  }
  .sr-inp:focus {
    border-color:rgba(139,92,246,0.7);
    box-shadow:0 0 0 3px rgba(139,92,246,0.15);
  }
  .sr-inp::placeholder { color:rgba(255,255,255,0.28); }
  .sr-inp:disabled { opacity:0.5; cursor:not-allowed; }
  .sr-inp-err { border-color:rgba(248,113,113,0.6) !important; }

  .sr-textarea {
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:12px;
    color:#f1f5f9;
    padding:12px 16px;
    width:100%;
    outline:none;
    font-size:14px;
    resize:vertical;
    min-height:88px;
    transition:border-color 0.2s, box-shadow 0.2s;
    box-sizing:border-box;
    font-family:inherit;
  }
  .sr-textarea:focus {
    border-color:rgba(139,92,246,0.7);
    box-shadow:0 0 0 3px rgba(139,92,246,0.15);
  }
  .sr-textarea::placeholder { color:rgba(255,255,255,0.28); }

  .sr-time {
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:12px;
    color:#f1f5f9;
    padding:12px 14px;
    width:100%;
    outline:none;
    font-size:15px;
    transition:border-color 0.2s, box-shadow 0.2s;
    box-sizing:border-box;
    font-family:inherit;
    color-scheme:dark;
  }
  .sr-time:focus {
    border-color:rgba(139,92,246,0.7);
    box-shadow:0 0 0 3px rgba(139,92,246,0.15);
  }

  .sr-label {
    display:block;
    font-size:13px;
    font-weight:500;
    color:rgba(255,255,255,0.6);
    margin-bottom:6px;
  }
  .sr-err { color:#f87171; font-size:12px; margin-top:5px; display:block; }

  .sr-btn-primary {
    background:linear-gradient(135deg,#7c3aed,#3b82f6);
    border:none;
    border-radius:12px;
    color:#fff;
    font-weight:700;
    font-size:15px;
    padding:13px 28px;
    cursor:pointer;
    transition:transform 0.15s, box-shadow 0.15s;
    display:inline-flex;
    align-items:center;
    gap:8px;
    font-family:inherit;
  }
  .sr-btn-primary:hover:not(:disabled) {
    transform:scale(1.03);
    box-shadow:0 8px 30px rgba(124,58,237,0.4);
  }
  .sr-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }

  .sr-btn-outline {
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.14);
    border-radius:12px;
    color:#cbd5e1;
    font-weight:600;
    font-size:15px;
    padding:12px 24px;
    cursor:pointer;
    transition:background 0.15s;
    display:inline-flex;
    align-items:center;
    gap:8px;
    font-family:inherit;
  }
  .sr-btn-outline:hover:not(:disabled) { background:rgba(255,255,255,0.1); }
  .sr-btn-outline:disabled { opacity:0.4; cursor:not-allowed; }

  .sr-gender {
    background:rgba(255,255,255,0.05);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:12px;
    padding:14px 8px;
    cursor:pointer;
    transition:all 0.18s;
    text-align:center;
    color:#cbd5e1;
    font-family:inherit;
    width:100%;
  }
  .sr-gender:hover { border-color:rgba(139,92,246,0.5); background:rgba(139,92,246,0.1); }
  .sr-gender.active { background:rgba(139,92,246,0.18); border-color:rgba(139,92,246,0.7); color:#a78bfa; }

  .sr-day {
    background:rgba(255,255,255,0.05);
    border:1.5px solid rgba(255,255,255,0.09);
    border-radius:10px;
    padding:10px 4px;
    cursor:pointer;
    transition:all 0.18s;
    text-align:center;
    color:#94a3b8;
    font-size:12px;
    font-weight:500;
    font-family:inherit;
    width:100%;
  }
  .sr-day:hover { border-color:rgba(139,92,246,0.4); }
  .sr-day.active { background:rgba(139,92,246,0.18); border-color:rgba(139,92,246,0.7); color:#a78bfa; font-weight:700; }

  .sr-card-inner {
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(255,255,255,0.07);
    border-radius:14px;
    padding:18px 20px;
  }
  .sr-photo-wrap {
    background:rgba(255,255,255,0.03);
    border-radius:14px;
    padding:16px;
  }

  @media(max-width:600px) {
    .sr-grid2 { grid-template-columns:1fr !important; }
    .sr-days-grid { grid-template-columns:repeat(4,1fr) !important; }
  }
`;

const STEP_META = [
  { num: 1, label: 'Basic Info',  Icon: FileText },
  { num: 2, label: 'Location',   Icon: MapPin   },
  { num: 3, label: 'Hours',      Icon: Clock    },
  { num: 4, label: 'Photos',     Icon: Camera   },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
const SalonRegistration = () => {
  const navigate = useNavigate();
  const { createSalon, fetchSalon } = useSalon();
  const { user } = useAuth();

  // Redirect if owner already has a salon
  useEffect(() => {
    fetchSalon().then((res) => {
      if (res?.data) navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    });
  }, []);

  const mapRef = useRef(null);

  /* ── Step state ── */
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Step 1 data ── */
  const [step1Data, setStep1Data] = useState({
    name: '', description: '', servedGender: '', phone: '', email: '', address: '',
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

  /* ── Step 2 data ── */
  const [step2Data, setStep2Data] = useState({ address: '', latitude: null, longitude: null });
  const [step2Errors, setStep2Errors] = useState({});
  const [map, setMap] = useState(null);
  const markerRef = useRef(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  const stopWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const getFineLocation = (mapInstance) => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported. Enter address manually.');
      return;
    }
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
          () => {
            stopWatch();
            setLocationLoading(false);
            setLocationStatus(`Location set (±${acc}m). Drag the pin to fine-tune.`);
          },
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

  /* ── Step 3 data ── */
  const [step3Data, setStep3Data] = useState({
    openingTime: '09:00',
    closingTime: '21:00',
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
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

  /* ── Step 4 data ── */
  const [step4Data, setStep4Data] = useState({
    photos: [], businessLicense: [], businessRegistration: [],
  });
  const [step4Errors, setStep4Errors] = useState({});

  /* ── Google Maps ── */
  const placeMarker = (mapInstance, lat, lng) => {
    if (markerRef.current) markerRef.current.setMap(null);
    const newMarker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      draggable: true,
      title: 'Drag to adjust location',
    });
    setStep2Data(prev => ({ ...prev, latitude: lat, longitude: lng }));
    mapInstance.panTo({ lat, lng });
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setStep2Data(prev => ({ ...prev, address: results[0].formatted_address }));
      }
    });
    newMarker.addListener('dragend', () => {
      const pos = newMarker.getPosition();
      const dLat = pos.lat();
      const dLng = pos.lng();
      setStep2Data(prev => ({ ...prev, latitude: dLat, longitude: dLng }));
      geocoder.geocode({ location: { lat: dLat, lng: dLng } }, (res, s) => {
        if (s === 'OK' && res[0]) {
          setStep2Data(prev => ({ ...prev, address: res[0].formatted_address }));
        }
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
    newMap.addListener('click', (event) => {
      placeMarker(newMap, event.latLng.lat(), event.latLng.lng());
    });
    setMap(newMap);
    getFineLocation(newMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, map]);

  useEffect(() => {
    if (currentStep !== 2) stopWatch();
    return () => stopWatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  /* ── Handlers ── */
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
    if (!step1Data.address.trim()) errors.address = 'Full address is required';
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
      daysOfOperation: prev.daysOfOperation.map((d, i) =>
        i === dayIndex ? { ...d, selected: !d.selected } : d
      ),
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
    const errors = {};
    if (step4Data.photos.length === 0) errors.photos = 'Please upload at least one salon photo';
    setStep4Errors(errors);
    return Object.keys(errors).length === 0;
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
    setLoading(true);
    setError('');
    try {
      const dayMap = {
        Monday: 'monday', Tuesday: 'tuesday', Wednesday: 'wednesday',
        Thursday: 'thursday', Friday: 'friday', Saturday: 'saturday', Sunday: 'sunday',
      };
      const workingHours = {};
      Object.entries(dayMap).forEach(([label, key]) => {
        const dayObj = step3Data.daysOfOperation.find(d => d.day === label);
        const isClosed = !dayObj?.selected;
        workingHours[key] = {
          open: isClosed ? '09:00' : step3Data.openingTime,
          close: isClosed ? '18:00' : step3Data.closingTime,
          isClosed,
        };
      });

      let photoUrls = [];
      if (step4Data.photos.length > 0) {
        toast.loading('Uploading photos...', { id: 'photo-upload' });
        photoUrls = await uploadSalonPhotos(step4Data.photos);
        toast.dismiss('photo-upload');
      }

      const salonPayload = {
        name: step1Data.name,
        description: step1Data.description,
        servedGender: step1Data.servedGender,
        offeredCategories: [],
        kidsHaircut: false,
        atHomeServices: false,
        phone: step1Data.phone,
        email: step1Data.email,
        address: step1Data.address,
        city: step1Data.address,
        workingHours,
        photos: photoUrls,
      };
      if (step2Data.latitude && step2Data.longitude) {
        salonPayload.location = { latitude: step2Data.latitude, longitude: step2Data.longitude };
      }

      await createSalon(salonPayload);
      toast.success('Salon registered successfully!');
      navigate(ROUTES.APPROVAL_WAITING);
    } catch (err) {
      if (err.response?.status === 409 || err.status === 409 || err.message?.includes('already')) {
        navigate(ROUTES.APPROVAL_WAITING, { replace: true });
        return;
      }
      const backendErrors = err.data?.errors;
      if (backendErrors && Array.isArray(backendErrors) && backendErrors.length > 0) {
        setError(`Validation failed:\n• ${backendErrors.join('\n• ')}`);
        console.error('❌ Backend validation errors:', backendErrors);
      } else {
        setError(err.message || 'Failed to register salon');
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const progressPct = ((currentStep - 1) / 3) * 100;

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{SR_CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: '#06060f',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }}>
        {/* Orbs */}
        <div style={{ position:'fixed', top:'-20%', left:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)', animation:'sr-orb1 18s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)', animation:'sr-orb2 22s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />

        <div style={{ position:'relative', zIndex:1, maxWidth:780, margin:'0 auto', padding:'40px 20px 64px' }}>

          {/* ── Header ── */}
          <div style={{ textAlign:'center', marginBottom:36, animation:'sr-fadeup 0.5s ease' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Store size={20} color="#fff" />
              </div>
              <span style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>My Salon Bookings</span>
            </div>
            <h1 style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', margin:0, marginBottom:8, letterSpacing:'-0.5px' }}>Register Your Salon</h1>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, margin:0 }}>Complete all 4 steps to get your salon listed</p>
          </div>

          {/* ── Step Indicator ── */}
          <div style={{ display:'flex', alignItems:'center', marginBottom:32, animation:'sr-fadeup 0.5s ease 0.08s both' }}>
            {STEP_META.map((step, idx) => (
              <React.Fragment key={step.num}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 15, transition: 'all 0.3s',
                    background: currentStep >= step.num ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : 'rgba(255,255,255,0.07)',
                    color: currentStep >= step.num ? '#fff' : 'rgba(255,255,255,0.3)',
                    boxShadow: currentStep === step.num ? '0 0 20px rgba(124,58,237,0.45)' : 'none',
                    border: currentStep === step.num ? '2px solid rgba(167,139,250,0.4)' : '2px solid transparent',
                  }}>
                    {currentStep > step.num ? <Check size={18} /> : step.num}
                  </div>
                  <span style={{ fontSize:11, fontWeight: currentStep === step.num ? 600 : 400, color: currentStep >= step.num ? '#a78bfa' : 'rgba(255,255,255,0.28)', whiteSpace:'nowrap' }}>
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div style={{ flex:1, height:2, margin:'0 6px 20px', background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden', position:'relative' }}>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,#7c3aed,#3b82f6)', transform: currentStep > step.num ? 'scaleX(1)' : 'scaleX(0)', transformOrigin:'left', transition:'transform 0.4s ease' }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Error Banner ── */}
          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1.5px solid rgba(239,68,68,0.3)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', animation:'sr-fadeup 0.3s ease' }}>
              <div>
                <p style={{ color:'#f87171', fontWeight:700, fontSize:14, margin:0, marginBottom:4 }}>Registration Error</p>
                <pre style={{ color:'#fca5a5', fontSize:13, margin:0, whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{error}</pre>
              </div>
              <button onClick={() => setError('')} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:22, lineHeight:1, padding:0, marginLeft:12 }}>×</button>
            </div>
          )}

          {/* ── Main Card ── */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1.5px solid rgba(255,255,255,0.08)', borderRadius:20, overflow:'hidden', animation:'sr-fadeup 0.5s ease 0.14s both' }}>

            {/* Progress bar */}
            <div style={{ height:3, background:'rgba(255,255,255,0.06)' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#7c3aed,#3b82f6)', width:`${progressPct}%`, transition:'width 0.4s ease', borderRadius:'0 3px 3px 0' }} />
            </div>

            <div style={{ padding:'32px 36px' }}>

              {/* ══ STEP 1: BASIC INFO ══ */}
              {currentStep === 1 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:'rgba(124,58,237,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={19} color="#a78bfa" />
                    </div>
                    <div>
                      <h2 style={{ color:'#f1f5f9', fontWeight:700, fontSize:19, margin:0 }}>Basic Information</h2>
                      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, margin:0 }}>Tell us about your salon</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    {/* Salon Name */}
                    <div>
                      <label className="sr-label">Salon Name <span style={{ color:'#f87171' }}>*</span></label>
                      <input className={`sr-inp${step1Errors.name ? ' sr-inp-err' : ''}`} name="name" value={step1Data.name} onChange={handleStep1Change} placeholder="e.g. Glamour Studio" />
                      {step1Errors.name && <span className="sr-err">{step1Errors.name}</span>}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="sr-label">Description <span style={{ color:'rgba(255,255,255,0.28)', fontWeight:400 }}>(Optional)</span></label>
                      <textarea className="sr-textarea" name="description" value={step1Data.description} onChange={handleStep1Change} placeholder="Describe your salon, specialties, and what makes you unique…" />
                    </div>

                    {/* Served Gender */}
                    <div>
                      <label className="sr-label">Services For <span style={{ color:'#f87171' }}>*</span></label>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                        {[
                          { value:'male',   label:'Male',   icon:'♂' },
                          { value:'female', label:'Female', icon:'♀' },
                          { value:'unisex', label:'Unisex', icon:'⚥' },
                        ].map(({ value, label, icon }) => (
                          <button key={value} type="button" className={`sr-gender${step1Data.servedGender === value ? ' active' : ''}`} onClick={() => setStep1Data(prev => ({ ...prev, servedGender: value }))}>
                            <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                          </button>
                        ))}
                      </div>
                      {step1Errors.servedGender && <span className="sr-err">{step1Errors.servedGender}</span>}
                    </div>

                    {/* Phone & Email */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="sr-grid2">
                      <div>
                        <label className="sr-label">Phone Number <span style={{ color:'#f87171' }}>*</span></label>
                        <input className={`sr-inp${step1Errors.phone ? ' sr-inp-err' : ''}`} name="phone" type="tel" value={step1Data.phone} onChange={handleStep1Change} placeholder="+91 98765 43210" readOnly={!!user?.phone} disabled={!!user?.phone} />
                        {step1Errors.phone && <span className="sr-err">{step1Errors.phone}</span>}
                      </div>
                      <div>
                        <label className="sr-label">Email Address <span style={{ color:'#f87171' }}>*</span></label>
                        <input className={`sr-inp${step1Errors.email ? ' sr-inp-err' : ''}`} name="email" type="email" value={step1Data.email} onChange={handleStep1Change} placeholder="salon@email.com" readOnly={!!user?.email} disabled={!!user?.email} />
                        {step1Errors.email && <span className="sr-err">{step1Errors.email}</span>}
                      </div>
                    </div>

                    {/* Full Address */}
                    <div>
                      <label className="sr-label">Full Address <span style={{ color:'#f87171' }}>*</span></label>
                      <input className={`sr-inp${step1Errors.address ? ' sr-inp-err' : ''}`} name="address" value={step1Data.address} onChange={handleStep1Change} placeholder="e.g. 123 MG Road, Koramangala, Bangalore, Karnataka" />
                      {step1Errors.address && <span className="sr-err">{step1Errors.address}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 2: LOCATION ══ */}
              {currentStep === 2 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:'rgba(59,130,246,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <MapPin size={19} color="#60a5fa" />
                    </div>
                    <div>
                      <h2 style={{ color:'#f1f5f9', fontWeight:700, fontSize:19, margin:0 }}>Pin Your Location</h2>
                      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, margin:0 }}>Help customers find you on the map</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {/* Location status */}
                    {locationStatus && (
                      <div style={{
                        padding:'11px 16px', borderRadius:10, fontSize:13,
                        display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
                        background: locationLoading ? 'rgba(234,179,8,0.1)' : step2Data.latitude ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)',
                        border: `1.5px solid ${locationLoading ? 'rgba(234,179,8,0.3)' : step2Data.latitude ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
                        color: locationLoading ? '#fde047' : step2Data.latitude ? '#86efac' : '#fdba74',
                      }}>
                        <span>{locationLoading ? '📍 ' : step2Data.latitude ? '✅ ' : '⚠️ '}{locationStatus}</span>
                        {!locationLoading && (
                          <button type="button" onClick={() => getFineLocation(map)} style={{ background:'none', border:'none', fontSize:12, fontWeight:600, textDecoration:'underline', cursor:'pointer', color:'inherit', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                            Re-detect
                          </button>
                        )}
                      </div>
                    )}

                    {/* Map */}
                    <div>
                      <label className="sr-label">Click on the map or drag the pin <span style={{ color:'rgba(255,255,255,0.28)', fontWeight:400 }}>(auto-detects location)</span></label>
                      <div ref={mapRef} style={{ width:'100%', height:380, borderRadius:14, border:'1.5px solid rgba(255,255,255,0.1)', overflow:'hidden' }} />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="sr-label">Address <span style={{ color:'#f87171' }}>*</span> <span style={{ color:'rgba(255,255,255,0.28)', fontWeight:400 }}>(auto-filled from map)</span></label>
                      <input className={`sr-inp${step2Errors.address ? ' sr-inp-err' : ''}`} name="address" value={step2Data.address} onChange={handleAddressChange} placeholder="Auto-filled from map — or type manually" />
                      {step2Errors.address && <span className="sr-err">{step2Errors.address}</span>}
                    </div>

                    {/* Coordinates badge */}
                    {step2Data.latitude && step2Data.longitude && (
                      <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.22)', borderRadius:10, padding:'11px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                        <p style={{ color:'#93c5fd', fontSize:13, margin:0 }}>
                          <strong>Coordinates:</strong> {step2Data.latitude.toFixed(6)}, {step2Data.longitude.toFixed(6)}
                        </p>
                        {locationAccuracy !== null && (
                          <span style={{
                            fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                            background: locationAccuracy <= 10 ? 'rgba(34,197,94,0.2)' : locationAccuracy <= 30 ? 'rgba(59,130,246,0.2)' : 'rgba(234,179,8,0.2)',
                            color: locationAccuracy <= 10 ? '#86efac' : locationAccuracy <= 30 ? '#93c5fd' : '#fde047',
                          }}>
                            {locationAccuracy <= 10 ? '🎯' : locationAccuracy <= 30 ? '📍' : '⚠️'} ±{locationAccuracy}m accuracy
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══ STEP 3: WORKING HOURS ══ */}
              {currentStep === 3 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:'rgba(16,185,129,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Clock size={19} color="#34d399" />
                    </div>
                    <div>
                      <h2 style={{ color:'#f1f5f9', fontWeight:700, fontSize:19, margin:0 }}>Working Hours</h2>
                      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, margin:0 }}>Set when customers can book appointments</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    {/* Opening & Closing */}
                    <div className="sr-card-inner">
                      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Operating Hours</p>
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

                    {/* Lunch Break */}
                    <div className="sr-card-inner">
                      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        Lunch Break <span style={{ color:'rgba(255,255,255,0.28)', textTransform:'none', fontWeight:400, fontSize:11 }}>(Optional)</span>
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

                    {/* Days */}
                    <div className="sr-card-inner">
                      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Days of Operation</p>
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

              {/* ══ STEP 4: PHOTOS & DOCUMENTS ══ */}
              {currentStep === 4 && (
                <div style={{ animation:'sr-fadeup 0.4s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:'rgba(245,158,11,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Camera size={19} color="#fbbf24" />
                    </div>
                    <div>
                      <h2 style={{ color:'#f1f5f9', fontWeight:700, fontSize:19, margin:0 }}>Photos & Documents</h2>
                      <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, margin:0 }}>Showcase your salon to attract customers</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                    {/* Photos */}
                    <div>
                      <label className="sr-label">
                        Salon Photos <span style={{ color:'#f87171' }}>*</span>
                        <span style={{ color:'rgba(255,255,255,0.28)', fontWeight:400, fontSize:12 }}> — at least one required</span>
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
                    <div style={{ background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:14, padding:20 }}>
                      <p style={{ color:'#93c5fd', fontSize:12, fontWeight:700, margin:'0 0 16px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Registration Summary</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="sr-grid2">
                        {[
                          { label:'Salon Name',  value: step1Data.name || '—' },
                          { label:'Services For', value: step1Data.servedGender ? step1Data.servedGender.charAt(0).toUpperCase() + step1Data.servedGender.slice(1) : '—' },
                          { label:'Address',      value: step2Data.address || step1Data.address || '—' },
                          { label:'Hours',        value: `${step3Data.openingTime} – ${step3Data.closingTime}` },
                          { label:'Open Days',    value: `${step3Data.daysOfOperation.filter(d => d.selected).length} days/week` },
                          { label:'Photos',       value: step4Data.photos.length === 0 ? 'None — required' : `${step4Data.photos.length} uploaded`, warn: step4Data.photos.length === 0 },
                        ].map(({ label, value, warn }) => (
                          <div key={label}>
                            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:'0 0 3px' }}>{label}</p>
                            <p style={{ color: warn ? '#f87171' : '#e2e8f0', fontSize:14, fontWeight:600, margin:0 }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Navigation Buttons ── */}
          <div style={{ display:'flex', gap:12, marginTop:24, animation:'sr-fadeup 0.5s ease 0.2s both' }}>
            <button className="sr-btn-outline" onClick={handlePrev} disabled={currentStep === 1 || loading}>
              <ChevronLeft size={18} />
              Previous
            </button>

            <div style={{ flex:1 }} />

            {currentStep < 4 ? (
              <button className="sr-btn-primary" onClick={handleNext} disabled={loading}>
                Next
                <ChevronRight size={18} />
              </button>
            ) : (
              <button className="sr-btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'sr-spin 0.7s linear infinite' }} />
                    Registering…
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>

          {/* Footer */}
          <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12, marginTop:36 }}>
            © 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default SalonRegistration;
