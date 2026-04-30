import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import FaceShapeReveal from '../components/FaceShapeReveal';
import HairstyleCard   from '../components/HairstyleCard';
import ScanTipsModal   from '../components/ScanTipsModal';
import { analyzePhoto, getByShape, getTrending, trackEvent } from '../services/hairstyleService';

const SHAPES       = ['oval','round','square','heart','oblong'];
const LOADING_MSGS = ['Reading face structure...', 'Measuring facial proportions...', 'Matching hairstyle catalog...'];

// Skeleton card placeholder
function SkeletonCard() {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
      <div style={{ height: 220, background: 'linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ height: 14, background: '#2a2a2a', borderRadius: 8, marginBottom: 8, width: '60%' }} />
        <div style={{ height: 10, background: '#2a2a2a', borderRadius: 8, width: '80%' }} />
      </div>
    </div>
  );
}

export default function HairstylePage() {
  const navigate    = useNavigate();
  const fileRef     = useRef(null);

  const [state,          setState]         = useState('idle');   // idle | detecting | reveal | results | error
  const [hairstyles,     setHairstyles]    = useState([]);
  const [stylists,       setStylists]      = useState([]);
  const [faceShape,      setFaceShape]     = useState(null);
  const [confidence,     setConfidence]    = useState(null);
  const [capturedBlobUrl,setCapturedUrl]   = useState(null);
  const [capturedBlob,   setCapturedBlob]  = useState(null);
  const [errorMsg,       setErrorMsg]      = useState('');
  const [errorTips,      setErrorTips]     = useState([]);
  const [loadMsgIdx,     setLoadMsgIdx]    = useState(0);
  const [gender,         setGender]        = useState('unisex');
  const [showGrid,       setShowGrid]      = useState(false);
  const [showAnalysis,   setShowAnalysis]  = useState(false);
  const [location,       setLocation]      = useState({ lat: null, lng: null });
  const [showTips,       setShowTips]      = useState(false);

  // Load trending on mount
  useEffect(() => {
    getTrending(gender).then(r => {
      if (r.data?.hairstyles) setHairstyles(r.data.hairstyles);
    }).catch(() => {});
    // Try to get location silently
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // Cycle loading messages
  useEffect(() => {
    if (state !== 'detecting') return;
    const id = setInterval(() => setLoadMsgIdx(i => (i + 1) % LOADING_MSGS.length), 900);
    return () => clearInterval(id);
  }, [state]);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setErrorMsg(''); setErrorTips([]);

    // Draw to offscreen canvas to strip EXIF + resize to 800px max
    const img = new Image();
    const tmpUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(tmpUrl);
      const maxDim = 800;
      const ratio  = Math.min(1, maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const w = Math.round(img.naturalWidth  * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(async (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(blobUrl);
        setState('detecting');
        setLoadMsgIdx(0);

        try {
          const res  = await analyzePhoto(blob, gender, location.lat, location.lng);
          const data = res.data;

          if (data.fallback) {
            setHairstyles(data.hairstyles || []);
            setState('results');
            return;
          }

          setFaceShape(data.faceShape);
          setConfidence(data.confidence);
          setHairstyles(data.hairstyles || []);
          setStylists(data.stylists || []);
          setState('reveal');
        } catch (err) {
          const body = err.response?.data || {};
          if (body.error === 'no_face' || body.error === 'blurry_image' || body.error === 'angled_photo' || body.error === 'face_too_small') {
            setErrorMsg(body.error === 'no_face' ? 'No face detected' :
                        body.error === 'blurry_image' ? 'Photo is too blurry' :
                        body.error === 'angled_photo' ? 'Please face the camera directly' :
                        'Move closer to the camera');
            setErrorTips(body.tips || []);
            setState('error');
          } else if (body.ambiguous) {
            setErrorMsg('We could not determine your face shape clearly');
            setErrorTips(body.tips || []);
            setState('error');
          } else {
            setHairstyles(prev => prev); // keep trending
            setState('results');
          }
        }
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { setState('error'); setErrorMsg('Could not load image.'); };
    img.src = tmpUrl;
  }, [gender, location]);

  const handleFileChange = (e) => { processFile(e.target.files[0]); e.target.value = ''; };
  const handleRevealDone = () => setState('results');

  const handleManualShape = async (shape) => {
    setFaceShape(shape);
    trackEvent({ hairstyleId: hairstyles[0]?._id, event_type: 'manual_override', faceShape: shape }).catch(() => {});
    try {
      const r = await getByShape(shape, gender);
      setHairstyles(r.data.hairstyles || []);
      setState('results');
    } catch { setState('results'); }
  };

  const handleBookTop = () => {
    if (!hairstyles[0]) return;
    trackEvent({ hairstyleId: hairstyles[0]._id, event_type: 'book_cta', faceShape }).catch(() => {});
    if (stylists[0]?.salonId) {
      navigate(`/salon/${stylists[0].salonId}/book?service=${encodeURIComponent(hairstyles[0].suggestedService)}&barberId=${stylists[0].barberId}`);
    } else {
      navigate(`/explore?service=${encodeURIComponent(hairstyles[0].suggestedService)}`);
    }
  };

  const lowConfidence = confidence != null && confidence < 0.5;
  const midConfidence = confidence != null && confidence >= 0.5 && confidence < 0.75;

  return (
    <>
      {showTips && (
        <ScanTipsModal
          onContinue={() => { setShowTips(false); fileRef.current?.click(); }}
          onClose={() => setShowTips(false)}
        />
      )}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        body { background: #0a0a0a; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid #1a1a1a' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0,
            background: 'linear-gradient(90deg, #f59e0b, #ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            StyleAI
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            Discover your perfect hairstyle
          </p>
        </div>

        <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto' }}>

          {/* Gender selector */}
          {state === 'idle' && (
            <div style={{ display: 'flex', gap: 8, padding: '16px 0 8px' }}>
              {['unisex','male','female'].map(g => (
                <button key={g} onClick={() => setGender(g)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 20,
                  border: '1px solid', borderColor: gender === g ? '#f59e0b' : '#333',
                  background: gender === g ? 'rgba(245,158,11,0.1)' : 'transparent',
                  color: gender === g ? '#f59e0b' : '#666',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {g === 'unisex' ? 'All' : g}
                </button>
              ))}
            </div>
          )}

          {/* Upload prompt */}
          {state === 'idle' && (
            <div
              onClick={() => setShowTips(true)}
              style={{
                marginTop: 8, padding: '32px 16px',
                border: '2px dashed #333', borderRadius: 20,
                textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <Camera size={40} color="#444" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: '#ccc', marginBottom: 6 }}>
                Scan your face
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Tap to take a selfie or upload a photo
              </div>
              <div style={{ fontSize: 11, color: '#333', marginTop: 8 }}>
                Your photo is analyzed on our servers and never stored
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Loading state */}
          {state === 'detecting' && (
            <div style={{ paddingTop: 24 }}>
              {capturedBlobUrl && (
                <div style={{ position: 'relative', marginBottom: 24, borderRadius: 16, overflow: 'hidden' }}>
                  <img src={capturedBlobUrl} alt="Your face" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                  {/* shimmer overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                  }} />
                </div>
              )}
              <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                {LOADING_MSGS[loadMsgIdx]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            </div>
          )}

          {/* SVG Reveal animation */}
          {state === 'reveal' && (
            <div style={{ paddingTop: 40, textAlign: 'center' }}>
              <FaceShapeReveal
                imageUrl={capturedBlobUrl}
                faceShape={faceShape}
                onComplete={handleRevealDone}
              />
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div style={{ paddingTop: 24, textAlign: 'center' }}>
              {capturedBlobUrl && (
                <img src={capturedBlobUrl} alt="Your face"
                  style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} />
              )}
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{errorMsg}</div>
              {errorTips.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', color: '#888', fontSize: 13 }}>
                  {errorTips.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
                </ul>
              )}
              <div style={{ marginBottom: 20, color: '#666', fontSize: 13 }}>Or select your face shape manually:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {SHAPES.map(s => (
                  <button key={s} onClick={() => handleManualShape(s)} style={{
                    padding: '8px 16px', borderRadius: 20, border: '1px solid #333',
                    background: '#1a1a1a', color: '#ccc', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setState('idle'); setCapturedUrl(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
                  background: 'transparent', border: '1px solid #444',
                  color: '#888', padding: '10px 20px', borderRadius: 20, cursor: 'pointer', fontSize: 14,
                }}
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {state === 'results' && (
            <div style={{ paddingTop: 16 }}>

              {/* Face shape chip + confidence */}
              {faceShape && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{
                      padding: '6px 14px', borderRadius: 20,
                      background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                      fontSize: 13, fontWeight: 700, color: '#f59e0b',
                      textTransform: 'capitalize',
                    }}>
                      {faceShape} face
                    </div>
                    {confidence != null && (
                      <span style={{ color: '#666', fontSize: 12 }}>
                        {Math.round(confidence * 100)}% confidence
                      </span>
                    )}
                    <button
                      onClick={() => setState('idle')}
                      style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}
                    >
                      Re-scan
                    </button>
                  </div>

                  {/* Mid-confidence prompt */}
                  {midConfidence && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                      Looks like a {faceShape} face — does this look right?{' '}
                      {SHAPES.filter(s => s !== faceShape).map(s => (
                        <button key={s} onClick={() => handleManualShape(s)} style={{
                          background: 'transparent', border: 'none', color: '#f59e0b',
                          cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: '0 4px',
                        }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Low-confidence: show manual selector */}
                  {lowConfidence && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Select your face shape:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {SHAPES.map(s => (
                          <button key={s} onClick={() => handleManualShape(s)} style={{
                            padding: '6px 14px', borderRadius: 20,
                            border: '1px solid', borderColor: faceShape === s ? '#f59e0b' : '#333',
                            background: faceShape === s ? 'rgba(245,158,11,0.1)' : 'transparent',
                            color: faceShape === s ? '#f59e0b' : '#666',
                            cursor: 'pointer', fontSize: 12, textTransform: 'capitalize',
                          }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Golden Path hero card */}
              {hairstyles[0] && (
                <div style={{
                  background: 'linear-gradient(135deg, #1a1a1a, #222)',
                  borderRadius: 20, overflow: 'hidden', marginBottom: 16,
                  border: '1px solid #333',
                }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={hairstyles[0].imageUrl}
                      alt={hairstyles[0].name}
                      style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
                    />
                    {hairstyles[0].styleScore != null && (
                      <div style={{
                        position: 'absolute', top: 12, right: 12,
                        background: 'rgba(0,0,0,0.85)', borderRadius: 12,
                        padding: '6px 12px', border: '1px solid #f59e0b',
                      }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{hairstyles[0].styleScore}%</span>
                        <span style={{ fontSize: 10, color: '#aaa', marginLeft: 3 }}>match</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{hairstyles[0].name}</div>
                    {hairstyles[0].whyItWorks && (
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{hairstyles[0].whyItWorks}</div>
                    )}
                    {stylists[0] && (
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                        Best match: <span style={{ color: '#ccc', fontWeight: 600 }}>{stylists[0].name}</span> @ {stylists[0].salonName}
                      </div>
                    )}
                    <button
                      onClick={handleBookTop}
                      style={{
                        width: '100%', padding: '14px 0',
                        background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                        border: 'none', borderRadius: 14, color: '#fff',
                        fontSize: 16, fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      Book This Style
                    </button>
                  </div>
                </div>
              )}

              {/* How we analyzed — expandable */}
              <button
                onClick={() => setShowAnalysis(v => !v)}
                style={{
                  width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
                  borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: '#888', fontSize: 13, marginBottom: 16,
                }}
              >
                <span>How we analyzed your face</span>
                {showAnalysis ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showAnalysis && faceShape && (
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #2a2a2a' }}>
                  <div style={{ marginBottom: 12, textAlign: 'center' }}>
                    <FaceShapeReveal imageUrl={capturedBlobUrl} faceShape={faceShape} />
                  </div>
                  <div style={{ fontSize: 12, color: '#777', textAlign: 'center', marginTop: 12 }}>
                    Confidence: {Math.round((confidence || 0) * 100)}%
                  </div>
                </div>
              )}

              {/* See all grid */}
              {hairstyles.length > 1 && (
                <>
                  <button
                    onClick={() => setShowGrid(v => !v)}
                    style={{
                      width: '100%', padding: '12px 0',
                      background: '#1a1a1a', border: '1px solid #2a2a2a',
                      borderRadius: 12, color: '#ccc', cursor: 'pointer',
                      fontSize: 14, fontWeight: 600, marginBottom: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {showGrid ? 'Hide' : `See all ${hairstyles.length} styles`}
                    {showGrid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showGrid && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {hairstyles.slice(1).map(h => (
                        <HairstyleCard
                          key={h._id}
                          hairstyle={h}
                          capturedBlobUrl={capturedBlobUrl}
                          lat={location.lat}
                          lng={location.lng}
                          faceShape={faceShape}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Rescan */}
              <button
                onClick={() => setShowTips(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, margin: '16px auto 0',
                  background: 'transparent', border: '1px solid #333',
                  color: '#666', padding: '10px 24px', borderRadius: 20,
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                <Upload size={14} /> Upload a different photo
              </button>
            </div>
          )}

          {/* Trending preview (shown in idle and after results) */}
          {state === 'idle' && hairstyles.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10, letterSpacing: 1 }}>
                TRENDING NOW
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {hairstyles.slice(0, 4).map(h => (
                  <div key={h._id} style={{ borderRadius: 12, overflow: 'hidden', background: '#1a1a1a' }}>
                    <img src={h.imageUrl} alt={h.name} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '6px 8px', fontSize: 11, color: '#aaa', fontWeight: 600 }}>{h.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
