import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  FileText, 
  Camera, 
  ChevronRight, 
  ChevronLeft,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import PhotoUpload from '../../components/salon/PhotoUpload';
import DocumentUpload from '../../components/salon/DocumentUpload';
import { useSalon } from '../../hooks/useSalon';
import { useAuth } from '../../hooks/useAuth';
import { uploadSalonPhotos } from '../../services/salonService';
import ROUTES from '../../routes';

/**
 * Salon Registration Page
 *
 * 4-Step Form:
 * Step 1: Basic Information
 * Step 2: Location (Google Maps)
 * Step 3: Working Hours
 * Step 4: Photos & Documents
 */
const SalonRegistration = () => {
  const navigate = useNavigate();
  const { createSalon, salon, fetchSalon } = useSalon();
  const { user } = useAuth();

  // If owner already has a salon, go to approval waiting
  useEffect(() => {
    fetchSalon().then((res) => {
      if (res?.data) navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    });
  }, []);
  const mapRef = useRef(null);

  // ========== STEP STATE ==========

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ========== FORM DATA ==========

  // Step 1: Basic Information
  const [step1Data, setStep1Data] = useState({
    name: '',
    description: '',
    servedGender: '',
    phone: '',
    email: '',
    address: '',
  });
  const [step1Errors, setStep1Errors] = useState({});

  // Auto-fill phone and email from owner profile
  useEffect(() => {
    if (user) {
      setStep1Data(prev => ({
        ...prev,
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  // Step 2: Location
  const [step2Data, setStep2Data] = useState({
    address: '',
    latitude: null,
    longitude: null,
  });
  const [step2Errors, setStep2Errors] = useState({});
  const [map, setMap] = useState(null);
  const markerRef = useRef(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null); // metres
  const watchIdRef = useRef(null);

  // Stop any active watchPosition
  const stopWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Fine-location helper: quick rough fix → then refine with watchPosition
  const getFineLocation = (mapInstance) => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported. Enter address manually.');
      return;
    }

    stopWatch();
    setLocationLoading(true);
    setLocationAccuracy(null);
    setLocationStatus('Getting your location…');

    // Pass 1 — quick low-accuracy fix to show map immediately
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

        // Pass 2 — watchPosition for GPS-level fine accuracy
        watchIdRef.current = navigator.geolocation.watchPosition(
          (refined) => {
            const rLat = refined.coords.latitude;
            const rLng = refined.coords.longitude;
            const rAcc = Math.round(refined.coords.accuracy);
            placeMarker(mapInstance, rLat, rLng);
            setLocationAccuracy(rAcc);

            if (rAcc <= 10) {
              // Within 10 metres — stop watching
              stopWatch();
              setLocationLoading(false);
              setLocationStatus(`Fine location locked (±${rAcc}m). Drag the pin to adjust.`);
            } else {
              setLocationStatus(`Refining accuracy… (±${rAcc}m)`);
            }
          },
          () => {
            // watchPosition failed — rough fix is still on the map
            stopWatch();
            setLocationLoading(false);
            setLocationStatus(`Location set (±${acc}m). Drag the pin to fine-tune.`);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );

        // Safety: stop watching after 20s regardless
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

  // Step 3: Working Hours
  const [step3Data, setStep3Data] = useState({
    openingTime: '09:00',
    closingTime: '21:00',
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
    daysOfOperation: [
      { day: 'Monday', selected: true },
      { day: 'Tuesday', selected: true },
      { day: 'Wednesday', selected: true },
      { day: 'Thursday', selected: true },
      { day: 'Friday', selected: true },
      { day: 'Saturday', selected: true },
      { day: 'Sunday', selected: false },
    ],
  });
  const [step3Errors, setStep3Errors] = useState({});

  // Step 4: Photos & Documents
  const [step4Data, setStep4Data] = useState({
    photos: [],
    businessLicense: [],
    businessRegistration: [],
  });
  const [step4Errors, setStep4Errors] = useState({});

  // ========== GOOGLE MAPS INITIALIZATION ==========

  // Place / update draggable marker and reverse-geocode the position
  const placeMarker = (mapInstance, lat, lng) => {
    if (markerRef.current) markerRef.current.setMap(null);

    const newMarker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      draggable: true,
      title: 'Drag to adjust location',
    });

    // Update state immediately
    setStep2Data(prev => ({ ...prev, latitude: lat, longitude: lng }));
    mapInstance.panTo({ lat, lng });

    // Reverse geocode
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setStep2Data(prev => ({
          ...prev,
          address: results[0].formatted_address,
        }));
      }
    });

    // Allow drag to adjust
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

    const defaultLocation = { lat: 28.7041, lng: 77.1025 }; // fallback: Delhi

    const newMap = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: defaultLocation,
      mapTypeControl: false,
      streetViewControl: false,
    });

    // Click anywhere on map to drop/move pin
    newMap.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      placeMarker(newMap, lat, lng);
    });

    setMap(newMap);
    getFineLocation(newMap);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, map]);

  // Clean up watchPosition when leaving step 2 or unmounting
  useEffect(() => {
    if (currentStep !== 2) stopWatch();
    return () => stopWatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ========== STEP 1: BASIC INFO HANDLERS ==========

  const handleStep1Change = (e) => {
    const { name, value } = e.target;
    setStep1Data(prev => ({
      ...prev,
      [name]: value,
    }));
    if (step1Errors[name]) {
      setStep1Errors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateStep1 = () => {
    const errors = {};

    if (!step1Data.name.trim()) {
      errors.name = 'Salon name is required';
    }

    if (!step1Data.phone.trim()) {
      errors.phone = 'Phone is required';
    } else if (!/^\+?[\d\s\-()]{9,}$/.test(step1Data.phone)) {
      errors.phone = 'Phone is invalid';
    }

    if (!step1Data.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(step1Data.email)) {
      errors.email = 'Email is invalid';
    }

    if (!step1Data.address.trim()) {
      errors.address = 'Full address is required';
    }

    if (!step1Data.servedGender) {
      errors.servedGender = 'Please select who you serve';
    }


    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== STEP 2: LOCATION HANDLERS ==========

  const validateStep2 = () => {
    const errors = {};

    if (!step2Data.address.trim()) {
      errors.address = 'Address is required';
    }

    // Coordinates are optional — backend auto-detects from address via Google Maps

    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (e) => {
    setStep2Data(prev => ({
      ...prev,
      address: e.target.value,
    }));
    if (step2Errors.address) {
      setStep2Errors(prev => ({
        ...prev,
        address: '',
      }));
    }
  };

  // ========== STEP 3: WORKING HOURS HANDLERS ==========

  const handleStep3Change = (e) => {
    const { name, value } = e.target;
    setStep3Data(prev => ({
      ...prev,
      [name]: value,
    }));
    if (step3Errors[name]) {
      setStep3Errors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
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

    if (!step3Data.openingTime) {
      errors.openingTime = 'Opening time is required';
    }

    if (!step3Data.closingTime) {
      errors.closingTime = 'Closing time is required';
    }

    if (step3Data.openingTime >= step3Data.closingTime) {
      errors.closingTime = 'Closing time must be after opening time';
    }

    if (!step3Data.daysOfOperation.some(d => d.selected)) {
      errors.days = 'Select at least one day';
    }

    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== STEP 4: PHOTOS & DOCUMENTS HANDLERS ==========


  const validateStep4 = () => {
    const errors = {};

    if (step4Data.photos.length === 0) {
      errors.photos = 'Please upload at least one salon photo';
    }

    // Documents are optional — backend handles them separately
    setStep4Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== NAVIGATION HANDLERS ==========

  const handleNext = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep(prev => prev + 1);
      setError('');
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep4()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build workingHours in backend format:
      // { monday: { open, close, isClosed }, ... }
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

      // Upload photos to Cloudinary first
      let photoUrls = [];
      if (step4Data.photos.length > 0) {
        toast.loading('Uploading photos...', { id: 'photo-upload' });
        photoUrls = await uploadSalonPhotos(step4Data.photos);
        toast.dismiss('photo-upload');
      }

      // Build JSON payload
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
      // If the user placed a map pin in step 2, pass those coordinates so the
      // backend doesn't need to geocode (avoids Google Maps API failures)
      if (step2Data.latitude && step2Data.longitude) {
        salonPayload.location = {
          latitude: step2Data.latitude,
          longitude: step2Data.longitude,
        };
      }

      // Submit
      await createSalon(salonPayload);
      toast.success('Salon registered successfully!');
      navigate(ROUTES.APPROVAL_WAITING);
    } catch (err) {
      // If salon already exists (409), go straight to approval waiting
      if (err.response?.status === 409 || err.status === 409 || err.message?.includes('already')) {
        navigate(ROUTES.APPROVAL_WAITING, { replace: true });
        return;
      }
      // Surface specific backend validation errors if available
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

  // ========== RENDER METHODS ==========

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Register Your Salon</h1>
          <p className="text-gray-600 mt-2">Complete all steps to set up your salon</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step ? <Check className="w-6 h-6" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 transition ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-red-800 text-sm">Registration Error</p>
                <pre className="text-red-700 text-sm mt-1 whitespace-pre-wrap font-sans">{error}</pre>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
            </div>

            <div className="space-y-4">
              {/* Salon Name */}
              <Input
                label="Salon Name"
                name="name"
                value={step1Data.name}
                onChange={handleStep1Change}
                placeholder="Enter salon name"
                error={!!step1Errors.name}
                errorMessage={step1Errors.name}
                required
              />

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={step1Data.description}
                  onChange={handleStep1Change}
                  placeholder="Describe your salon..."
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none resize-none"
                  rows="3"
                />
              </div>

              {/* Served Gender */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Services For <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'male', label: 'Male', icon: '♂' },
                    { value: 'female', label: 'Female', icon: '♀' },
                    { value: 'unisex', label: 'Unisex', icon: '⚥' },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setStep1Data(prev => ({ ...prev, servedGender: value }))
                      }
                      className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 font-medium text-sm transition ${
                        step1Data.servedGender === value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {step1Errors.servedGender && (
                  <p className="text-sm text-red-600 mt-1">{step1Errors.servedGender}</p>
                )}
              </div>


              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={step1Data.phone}
                  onChange={handleStep1Change}
                  placeholder="+91 98765 43210"
                  error={!!step1Errors.phone}
                  errorMessage={step1Errors.phone}
                  readOnly={!!user?.phone}
                  disabled={!!user?.phone}
                  required
                />

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={step1Data.email}
                  onChange={handleStep1Change}
                  placeholder="salon@email.com"
                  error={!!step1Errors.email}
                  errorMessage={step1Errors.email}
                  readOnly={!!user?.email}
                  disabled={!!user?.email}
                  required
                />
              </div>

              {/* Full Address */}
              <Input
                label="Full Address"
                name="address"
                value={step1Data.address}
                onChange={handleStep1Change}
                placeholder="e.g. 123 MG Road, Koramangala, Bangalore, Karnataka"
                error={!!step1Errors.address}
                errorMessage={step1Errors.address}
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Location</h2>
            </div>

            <div className="space-y-4">
              {/* Location status */}
              {locationStatus && (
                <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${
                  locationLoading
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : step2Data.latitude
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                }`}>
                  <span>{locationLoading ? '📍 ' : step2Data.latitude ? '✅ ' : '⚠️ '}{locationStatus}</span>
                  {!locationLoading && (
                    <button
                      type="button"
                      onClick={() => getFineLocation(map)}
                      className="text-xs font-medium underline whitespace-nowrap"
                    >
                      Re-detect
                    </button>
                  )}
                </div>
              )}

              {/* Map */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Pin your salon location
                  <span className="text-gray-400 font-normal ml-1">(click map or drag pin)</span>
                </label>
                <div
                  ref={mapRef}
                  className="w-full h-96 rounded-lg border-2 border-gray-300"
                />
              </div>

              {/* Auto-filled address */}
              <Input
                label="Address"
                name="address"
                value={step2Data.address}
                onChange={handleAddressChange}
                placeholder="Auto-filled from map — or type manually"
                error={!!step2Errors.address}
                errorMessage={step2Errors.address}
                required
              />

              {/* Coordinates + accuracy badge */}
              {step2Data.latitude && step2Data.longitude && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-blue-700">
                    <strong>Coordinates:</strong> {step2Data.latitude.toFixed(6)}, {step2Data.longitude.toFixed(6)}
                  </p>
                  {locationAccuracy !== null && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      locationAccuracy <= 10 ? 'bg-green-100 text-green-700'
                      : locationAccuracy <= 30 ? 'bg-blue-100 text-blue-700'
                      : locationAccuracy <= 100 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-orange-100 text-orange-700'
                    }`}>
                      {locationAccuracy <= 10 ? '🎯' : locationAccuracy <= 30 ? '📍' : '⚠️'} ±{locationAccuracy}m accuracy
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Working Hours */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Working Hours</h2>
            </div>

            <div className="space-y-6">
              {/* Opening & Closing Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    name="openingTime"
                    value={step3Data.openingTime}
                    onChange={handleStep3Change}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                  />
                  {step3Errors.openingTime && (
                    <p className="text-sm text-red-600">{step3Errors.openingTime}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    name="closingTime"
                    value={step3Data.closingTime}
                    onChange={handleStep3Change}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                  />
                  {step3Errors.closingTime && (
                    <p className="text-sm text-red-600">{step3Errors.closingTime}</p>
                  )}
                </div>
              </div>

              {/* Lunch Break */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Lunch Break (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-600">Start Time</label>
                    <input
                      type="time"
                      name="lunchBreakStart"
                      value={step3Data.lunchBreakStart}
                      onChange={handleStep3Change}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-gray-600">End Time</label>
                    <input
                      type="time"
                      name="lunchBreakEnd"
                      value={step3Data.lunchBreakEnd}
                      onChange={handleStep3Change}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Days of Operation */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Days of Operation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {step3Data.daysOfOperation.map((dayObj, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer hover:bg-blue-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={dayObj.selected}
                        onChange={() => handleDayToggle(index)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{dayObj.day}</span>
                    </label>
                  ))}
                </div>
                {step3Errors.days && (
                  <p className="text-sm text-red-600 mt-2">{step3Errors.days}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Photos & Documents */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Camera className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Photos & Documents</h2>
            </div>

            <div className="space-y-6">
              {/* Photos */}
              <PhotoUpload
                photos={step4Data.photos}
                onPhotosChange={(updatedPhotos) =>
                  setStep4Data(prev => ({ ...prev, photos: updatedPhotos }))
                }
                disabled={loading}
              />
              {step4Errors.photos && (
                <p className="text-sm text-red-600">{step4Errors.photos}</p>
              )}

              {/* Business License */}
              <DocumentUpload
                label="Business License (Optional)"
                documents={step4Data.businessLicense}
                onDocumentsChange={(docs) =>
                  setStep4Data(prev => ({ ...prev, businessLicense: docs }))
                }
                description="PDF, JPG, PNG • Up to 20MB"
                disabled={loading}
              />

              {/* Business Registration */}
              <DocumentUpload
                label="Business Registration (Optional)"
                documents={step4Data.businessRegistration}
                onDocumentsChange={(docs) =>
                  setStep4Data(prev => ({ ...prev, businessRegistration: docs }))
                }
                description="PDF, JPG, PNG • Up to 20MB"
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Summary (Step 4) */}
        {currentStep === 4 && (
          <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">Registration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Salon Name</p>
                <p className="font-medium text-gray-900">{step1Data.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Category</p>
                <p className="font-medium text-gray-900 capitalize">{step1Data.category}</p>
              </div>
              <div>
                <p className="text-gray-600">Services For</p>
                <p className="font-medium text-gray-900 capitalize">{step1Data.servedGender}</p>
              </div>
              <div>
                <p className="text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{step2Data.address}</p>
              </div>
              <div>
                <p className="text-gray-600">Hours</p>
                <p className="font-medium text-gray-900">
                  {step3Data.openingTime} - {step3Data.closingTime}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Operating Days</p>
                <p className="font-medium text-gray-900">
                  {step3Data.daysOfOperation.filter(d => d.selected).length} days
                </p>
              </div>
              <div>
                <p className="text-gray-600">Photos</p>
                <p className="font-medium text-gray-900">{step4Data.photos.length} uploaded</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex-1" />

          {currentStep < 4 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Complete Registration
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SalonRegistration;