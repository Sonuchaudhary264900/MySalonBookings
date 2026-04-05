import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, MapPin, Navigation, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import { useGeoLocation } from '../../../hooks/useGeoLocation';
import { useReverseGeocode, INDIAN_STATES } from '../../../hooks/useReverseGeocode';

const S5_CSS = `
  @keyframes s5-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s5-spin{to{transform:rotate(360deg)}}
  @keyframes s5-pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.5}}
  @keyframes s5-badge-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
  .s5-fu1{animation:s5-fadeup 0.45s 0s ease both}
  .s5-fu2{animation:s5-fadeup 0.45s 0.1s ease both}
  .s5-badge{animation:s5-badge-in 0.3s ease both}
  .s5-inp{width:100%;border-radius:12px;padding:11px 14px;font-size:13.5px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box;font-family:inherit;}
  .s5-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s5-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 24px rgba(124,58,237,0.4)!important;}
  .s5-btn:active:not(:disabled){transform:scale(0.97);}
`;

/* ─── Load Google Maps script lazily ────────────────────────── */
function useGoogleMaps() {
  const [loaded, setLoaded] = useState(!!window.google?.maps);
  useEffect(() => {
    if (window.google?.maps) { setLoaded(true); return; }
    const existing = document.getElementById('gmap-script');
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return; }
    const script = document.createElement('script');
    script.id  = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=en`;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

export default function Step5_Location() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();
  const mapsLoaded   = useGoogleMaps();
  const { geocode }  = useReverseGeocode();
  const geo          = useGeoLocation({ targetAccuracy: 50 });

  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const markerRef    = useRef(null);

  const [fields, setFields] = useState({
    address: data.address, city: data.city, district: data.district,
    state: data.state, pincode: data.pincode,
  });
  const [autoDetected, setAutoDetected] = useState({});
  const [errors, setErrors] = useState({});

  /* ─── Init map ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstance.current) return;
    const defaultLat = data.lat || 20.5937;
    const defaultLng = data.lng || 78.9629;

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom:   data.lat ? 16 : 5,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      styles: isDark ? DARK_MAP_STYLE : [],
    });

    markerRef.current = new window.google.maps.Marker({
      position: { lat: defaultLat, lng: defaultLng },
      map: mapInstance.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    markerRef.current.addListener('dragend', async (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      update({ lat, lng });
      const result = await geocode(lat, lng);
      if (result) fillFields(result);
    });
  }, [mapsLoaded]);

  /* ─── When GPS position arrives ────────────────────────────── */
  useEffect(() => {
    if (!geo.position || !mapInstance.current) return;
    const { lat, lng } = geo.position;
    update({ lat, lng });
    mapInstance.current.panTo({ lat, lng });
    mapInstance.current.setZoom(17);
    markerRef.current?.setPosition({ lat, lng });
    markerRef.current?.setAnimation(window.google.maps.Animation.BOUNCE);
    setTimeout(() => markerRef.current?.setAnimation(null), 1500);

    geocode(lat, lng).then(result => {
      if (result) fillFields(result, true);
    });
  }, [geo.position]);

  const fillFields = useCallback((result, showBadges = false) => {
    setFields({
      address: result.address || '',
      city:    result.city    || '',
      district: result.district || '',
      state:   result.state   || '',
      pincode: result.pincode || '',
    });
    if (showBadges) {
      const badges = {};
      Object.keys(result).forEach((k, i) => {
        if (result[k]) setTimeout(() => setAutoDetected(d => ({ ...d, [k]: true })), i * 120);
      });
    }
    update(result);
  }, [update]);

  const patchField = (k, v) => {
    setFields(f => ({ ...f, [k]: v }));
    update({ [k]: v });
    if (k === 'state') setAutoDetected(d => ({ ...d, state: false }));
  };

  const handleDetect = () => {
    if (!mapsLoaded) { toast.error('Map is still loading...'); return; }
    setAutoDetected({});
    geo.start();
  };

  const validate = () => {
    const e = {};
    if (!fields.address.trim()) e.address = 'Address is required';
    if (!fields.city.trim())    e.city    = 'City is required';
    if (!fields.state)          e.state   = 'State is required';
    if (!fields.pincode.trim()) e.pincode = 'Pincode is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    update({ ...fields });
    toast.success('Customers near you can now find your salon! 🗺️');
    nextStep();
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';
  const inpBg  = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb';
  const inpBorderBase = isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';

  const inpStyle = (err) => ({
    border: `1.5px solid ${err ? '#f87171' : inpBorderBase}`,
    background: inpBg, color: text,
  });

  const accuracyColor = geo.accuracy <= 15 ? '#10b981' : geo.accuracy <= 50 ? '#f59e0b' : '#ef4444';

  return (
    <>
      <style>{S5_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Header */}
        <div className="s5-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Where is your salon? 📍
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Customers nearby will discover you on Glow.
          </p>
        </div>

        <div className="s5-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)' }}>
          {/* Map */}
          <div ref={mapRef} style={{ height: 260, width: '100%', background: isDark ? '#1a1a2e' : '#e8e8f0' }}>
            {!mapsLoaded && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 30, height: 30, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 's5-spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 12, color: sub }}>Loading map...</span>
              </div>
            )}
          </div>

          {/* GPS button */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="s5-btn"
              onClick={handleDetect}
              disabled={geo.status === 'watching'}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: '#fff', fontWeight: 700, fontSize: 13, border: 'none',
                cursor: geo.status === 'watching' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 14px rgba(124,58,237,0.35)', flexShrink: 0,
              }}>
              {geo.status === 'watching' ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 's5-spin 0.7s linear infinite' }} /> Detecting...</>
              ) : (
                <><Navigation size={14} /> Detect My Location</>
              )}
            </button>

            {geo.status === 'watching' && geo.accuracy && (
              <div style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 99,
                background: `${accuracyColor}15`, border: `1px solid ${accuracyColor}40`,
                color: accuracyColor, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: accuracyColor, animation: 's5-pulse-dot 1.2s ease-in-out infinite' }} />
                ±{geo.accuracy}m
              </div>
            )}
            {geo.status === 'done' && geo.accuracy && (
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                ✓ Located within ±{geo.accuracy}m
              </span>
            )}
            {geo.error && <span style={{ fontSize: 12, color: '#f87171' }}>{geo.error}</span>}
          </div>

          {/* Address fields */}
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: sub, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
              Address Details
            </p>

            {[
              { key: 'address', label: 'Street Address *', placeholder: '12, MG Road, Indiranagar' },
              { key: 'city',    label: 'City *',           placeholder: 'Bengaluru' },
              { key: 'district',label: 'District',         placeholder: 'Bengaluru Urban' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: sub }}>{label}</label>
                  {autoDetected[key] && (
                    <span className="s5-badge" style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.2)' }}>
                      Auto-detected ✓
                    </span>
                  )}
                </div>
                <input className="s5-inp" placeholder={placeholder} value={fields[key]}
                  onChange={e => { patchField(key, e.target.value); setErrors(er => ({ ...er, [key]: '' })); }}
                  style={inpStyle(errors[key])} />
                {errors[key] && <p style={{ color: '#f87171', fontSize: 11, marginTop: 3 }}>{errors[key]}</p>}
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* State dropdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: sub }}>State *</label>
                  {autoDetected.state && (
                    <span className="s5-badge" style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.2)' }}>Auto ✓</span>
                  )}
                </div>
                <select
                  value={fields.state}
                  onChange={e => patchField('state', e.target.value)}
                  style={{
                    ...inpStyle(errors.state), appearance: 'none', paddingRight: 28,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ca3af' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                    cursor: 'pointer', width: '100%', borderRadius: 12, padding: '11px 14px',
                    outline: 'none', fontFamily: 'inherit', fontSize: 13.5,
                  }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <p style={{ color: '#f87171', fontSize: 11, marginTop: 3 }}>{errors.state}</p>}
              </div>

              {/* Pincode */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: sub }}>Pincode *</label>
                  {autoDetected.pincode && (
                    <span className="s5-badge" style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.2)' }}>Auto ✓</span>
                  )}
                </div>
                <input className="s5-inp" placeholder="560001" inputMode="numeric" maxLength={6}
                  value={fields.pincode}
                  onChange={e => { patchField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors(er => ({ ...er, pincode: '' })); }}
                  style={inpStyle(errors.pincode)} />
                {errors.pincode && <p style={{ color: '#f87171', fontSize: 11, marginTop: 3 }}>{errors.pincode}</p>}
              </div>
            </div>

            {(fields.address || fields.city) && (
              <p style={{ fontSize: 12, color: sub, margin: 0, fontStyle: 'italic' }}>
                Not right? Tap any field to edit manually.
              </p>
            )}
          </div>
        </div>

        {/* Continue */}
        <button className="s5-btn s5-fu2" onClick={handleNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
          Continue — Set Working Hours <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}

const DARK_MAP_STYLE = [
  { elementType:'geometry', stylers:[{color:'#1a1a2e'}] },
  { elementType:'labels.text.stroke', stylers:[{color:'#1a1a2e'}] },
  { elementType:'labels.text.fill', stylers:[{color:'#746855'}] },
  { featureType:'road', elementType:'geometry', stylers:[{color:'#2c2c4e'}] },
  { featureType:'road.highway', elementType:'geometry', stylers:[{color:'#3a3a6e'}] },
  { featureType:'water', elementType:'geometry', stylers:[{color:'#0d1b2a'}] },
  { featureType:'poi', elementType:'labels', stylers:[{visibility:'off'}] },
];
