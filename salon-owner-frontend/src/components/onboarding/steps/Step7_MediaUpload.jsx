import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Video, Image, FileText, X, Upload, Store, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';

const S7_CSS = `
  @keyframes s7-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s7-spin{to{transform:rotate(360deg)}}
  @keyframes s7-photo-in{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
  @keyframes s7-pulse-glow{0%,100%{box-shadow:0 0 0 3px rgba(124,58,237,0.15)}50%{box-shadow:0 0 0 5px rgba(124,58,237,0.3)}}
  .s7-fu1{animation:s7-fadeup 0.45s 0s ease both}
  .s7-fu2{animation:s7-fadeup 0.45s 0.1s ease both}
  .s7-photo{animation:s7-photo-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both}
  .s7-photo-card{transition:transform 0.18s ease,box-shadow 0.18s ease;}
  .s7-photo-card:hover{transform:scale(1.04);box-shadow:0 6px 20px rgba(0,0,0,0.3);}
  .s7-remove-btn{opacity:0;transition:opacity 0.15s ease,background 0.15s ease;}
  .s7-photo-card:hover .s7-remove-btn{opacity:1;}
  .s7-remove-btn:hover{background:rgba(239,68,68,0.5)!important;box-shadow:0 0 8px rgba(239,68,68,0.4);}

  /* Upload zone */
  .s7-zone{transition:border-color 0.2s,background 0.2s,box-shadow 0.2s,transform 0.15s;cursor:pointer;}
  .s7-zone:hover{
    border-color:rgba(124,58,237,0.55)!important;
    background:rgba(124,58,237,0.03)!important;
    box-shadow:0 0 0 4px rgba(124,58,237,0.08),inset 0 0 20px rgba(124,58,237,0.03)!important;
    transform:scale(1.005);
  }
  .s7-zone:active{transform:scale(0.99)!important;}
  .s7-zone.drag-over{
    border-color:#7c3aed!important;
    background:rgba(124,58,237,0.07)!important;
    box-shadow:0 0 0 5px rgba(124,58,237,0.15),inset 0 0 30px rgba(124,58,237,0.06)!important;
    transform:scale(1.01)!important;
  }

  /* Video upload indicator */
  .s7-uploading-video{animation:s7-pulse-glow 1.5s ease-in-out infinite;}

  .s7-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s7-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
  .s7-btn:active:not(:disabled){transform:scale(0.97)!important;transition:transform 0.1s ease!important;}
`;

/* ─── Cloudinary direct upload via backend signature ─────────── */
async function uploadToCloudinary(file, resourceType, onProgress) {
  const sigRes = await api.get(`/owner/gallery/upload-signature?resource_type=${resourceType}`);
  const sig    = sigRes.data.data;

  // Sanitize filename
  const safe  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const clean = new File([file], safe, { type: file.type });

  const fd = new FormData();
  fd.append('file',      clean);
  fd.append('api_key',   sig.api_key);
  fd.append('timestamp', sig.timestamp);
  fd.append('signature', sig.signature);
  fd.append('folder',    sig.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const d = JSON.parse(xhr.responseText);
        resolve({ url: d.secure_url, publicId: d.public_id });
      } else {
        let msg = `Upload error (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText)?.error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error',   () => reject(new Error('Network error')));
    xhr.timeout = 20 * 60 * 1000;
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`);
    xhr.send(fd);
  });
}

/* ─── Circular progress ring ────────────────────────────────── */
function ProgressRing({ pct, size = 32, stroke = 3, color = '#7c3aed' }) {
  const r  = (size - stroke * 2) / 2;
  const c  = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.2s linear' }}
      />
    </svg>
  );
}

export default function Step7_MediaUpload() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress,  setVideoProgress]  = useState(0);
  const [videoPreview,   setVideoPreview]   = useState(data.videoUrl ? { url: data.videoUrl } : null);

  const [photos, setPhotos]           = useState(data.photos || []);
  const [photoProgress, setPhotoProgress] = useState({});   // {id: 0-1}
  const [uploadingIds,  setUploadingIds]  = useState([]);

  // Sync local photos state → OnboardingContext after every change
  useEffect(() => { update({ photos }); }, [photos]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [docsOpen, setDocsOpen]   = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [regUploading,     setRegUploading]     = useState(false);

  const videoInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const licenseRef    = useRef(null);
  const regRef        = useRef(null);

  /* ─── Upload video ──────────────────────────────────────────── */
  const handleVideoFile = async (file) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error('Video must be under 100MB'); return; }
    setVideoUploading(true); setVideoProgress(0);
    try {
      const { url } = await uploadToCloudinary(file, 'video', p => setVideoProgress(p));
      setVideoPreview({ url, file });
      update({ videoUrl: url });
      toast.success('Video uploaded! 🎥');
    } catch (err) {
      toast.error(err.message || 'Video upload failed');
    } finally {
      setVideoUploading(false);
    }
  };

  /* ─── Upload photos ─────────────────────────────────────────── */
  const handlePhotoFiles = async (files) => {
    const arr = Array.from(files);
    if (photos.length + arr.length > 10) { toast.error('Maximum 10 photos allowed'); return; }

    const newIds = arr.map(() => Math.random().toString(36).slice(2));
    setUploadingIds(prev => [...prev, ...newIds]);

    await Promise.all(arr.map(async (file, i) => {
      const id = newIds[i];
      try {
        setPhotoProgress(p => ({ ...p, [id]: 0 }));
        const { url, publicId } = await uploadToCloudinary(file, 'image', pct => {
          setPhotoProgress(p => ({ ...p, [id]: pct }));
        });
        const isFirst = photos.length === 0 && i === 0;
        const newPhoto = { url, publicId, isCover: isFirst, id };
        setPhotos(prev => [...prev, newPhoto]);
      } catch (err) {
        toast.error(`Photo ${i + 1} failed: ${err.message}`);
      } finally {
        setPhotoProgress(p => { const n = { ...p }; delete n[id]; return n; });
        setUploadingIds(prev => prev.filter(x => x !== id));
      }
    }));
  };

  const removePhoto = (id) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (updated.length > 0 && !updated.some(p => p.isCover)) updated[0] = { ...updated[0], isCover: true };
      return updated;
    });
  };

  const setCover = (id) => {
    setPhotos(prev => prev.map(p => ({ ...p, isCover: p.id === id })));
  };

  const handleDoc = async (type, file, setUploading) => {
    setUploading(true);
    try {
      const { url } = await uploadToCloudinary(file, 'image', () => {});
      if (type === 'license') update({ businessLicenseUrl: url });
      else                    update({ businessRegistrationUrl: url });
      toast.success('Document uploaded ✓');
    } catch { toast.error('Document upload failed'); }
    finally { setUploading(false); }
  };

  const handleNext = () => {
    if (!videoPreview) { toast.error('Please upload a salon video — it\'s required for verification'); return; }
    if (photos.length === 0) { toast.error('Add at least 1 photo of your salon'); return; }
    toast.success('Your salon is looking amazing! 🌟');
    nextStep();
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';
  const zoneBg = isDark ? 'rgba(255,255,255,0.03)' : '#fafafa';
  const zoneBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e0d7ff';

  const uploadZoneStyle = (uploading) => ({
    border: `1.5px solid ${uploading ? '#7c3aed' : 'rgba(124,58,237,0.22)'}`,
    borderRadius: 16, padding: '28px 16px', textAlign: 'center',
    background: zoneBg,
    boxShadow: uploading ? '0 0 0 4px rgba(124,58,237,0.1), inset 0 0 20px rgba(124,58,237,0.04)' : 'none',
  });

  return (
    <>
      <style>{S7_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Header */}
        <div className="s7-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Show off your salon 📸
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0 }}>
            Salons with photos and video get <strong style={{ color: '#a855f7' }}>3× more bookings.</strong>
          </p>
        </div>

        <div className="s7-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 30, boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)' }}>

          {/* ── Video (mandatory) ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Video size={16} color="#a855f7" />
              <label style={{ fontSize: 13, fontWeight: 700, color: text }}>Salon Tour Video <span style={{ color: '#f87171', fontSize: 11, fontWeight: 500 }}>(Required)</span></label>
            </div>
            <p style={{ fontSize: 12, color: sub, margin: '0 0 12px', lineHeight: 1.5 }}>
              This helps us verify your business and build customer trust. Even a 15–30 sec phone walkthrough works perfectly!
            </p>

            {videoPreview ? (
              /* ── Video player — dark neutral bg, 16:9 ratio, themed border glow ── */
              <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: '#06060f',
                border: '1.5px solid rgba(124,58,237,0.28)',
                boxShadow: '0 0 0 3px rgba(124,58,237,0.07), 0 8px 28px rgba(0,0,0,0.35)',
              }}>
                {/* Slim status bar */}
                <div style={{
                  padding: '5px 12px', background: 'rgba(124,58,237,0.08)',
                  borderBottom: '1px solid rgba(124,58,237,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Video size={11} color="#a855f7" strokeWidth={1.5} />
                    <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600 }}>Salon Tour · Uploaded ✓</span>
                  </div>
                  {/* X inside status bar — less intrusive */}
                  <button onClick={() => { setVideoPreview(null); update({ videoUrl: '' }); }}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.55)', opacity: 0.8,
                      transition: 'opacity 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  >
                    <X size={10} />
                  </button>
                </div>

                {/* 16:9 video wrapper */}
                <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                  <video
                    src={videoPreview.url} controls
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            ) : (
              <div className="s7-zone" style={uploadZoneStyle(videoUploading)} onClick={() => !videoUploading && videoInputRef.current?.click()}>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/mov,video/avi,video/quicktime" style={{ display: 'none' }} onChange={e => handleVideoFile(e.target.files[0])} />
                {videoUploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <ProgressRing pct={videoProgress} size={52} stroke={4} color="#7c3aed" />
                    <p style={{ color: '#a855f7', fontSize: 13, fontWeight: 600, margin: 0 }}>Uploading... {Math.round(videoProgress * 100)}%</p>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(124,58,237,0.12)', border: '1.5px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Video size={26} color="#7c3aed" strokeWidth={1.5} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: '0 0 3px' }}>Upload a short salon video</p>
                    <p style={{ fontSize: 11, color: sub, margin: '0 0 4px' }}>15–30 sec walkthrough of your salon</p>
                    <p style={{ fontSize: 11, color: sub, margin: '0 0 14px' }}>MP4, MOV, AVI · Max 100MB</p>
                    <span style={{ padding: '7px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      Choose Video
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Photos (mandatory) ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image size={16} color="#a855f7" />
                <label style={{ fontSize: 13, fontWeight: 700, color: text }}>Salon Photos <span style={{ color: '#f87171', fontSize: 11, fontWeight: 500 }}>(Min 1 required)</span></label>
              </div>
              <span style={{ fontSize: 12, color: sub, fontWeight: 500 }}>{photos.length} / 10</span>
            </div>

            {/* Photo grid with label */}
            {photos.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: sub, letterSpacing: 0.8, textTransform: 'uppercase', margin: '0 0 8px' }}>
                  Your photos
                </p>
              </>
            )}
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))', gap: 8, marginBottom: 12 }}>
                {photos.map(p => (
                  <div key={p.id} className="s7-photo s7-photo-card" style={{
                    position: 'relative', paddingBottom: '100%', borderRadius: 12, overflow: 'hidden',
                    border: `2px solid ${p.isCover ? '#7c3aed' : border}`,
                    boxShadow: p.isCover ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
                  }}>
                    <img src={p.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

                    {/* Cover pill badge */}
                    {p.isCover && (
                      <div style={{
                        position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                        borderRadius: 99, padding: '2px 8px', fontSize: 9,
                        color: '#fff', fontWeight: 700, whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.5)',
                      }}>★ Cover</div>
                    )}

                    {/* Remove button — appears on hover */}
                    <button className="s7-remove-btn" onClick={() => removePhoto(p.id)} style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}><X size={11} /></button>

                    {/* Set as cover star */}
                    {!p.isCover && (
                      <button onClick={() => setCover(p.id)} style={{
                        position: 'absolute', bottom: 5, left: 5,
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 99, padding: '2px 6px', cursor: 'pointer', fontSize: 9, color: '#fbbf24',
                      }}>★</button>
                    )}
                  </div>
                ))}

                {/* Uploading placeholders */}
                {Object.entries(photoProgress).map(([id, pct]) => (
                  <div key={id} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f0ff', border: `2px solid rgba(124,58,237,0.3)` }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ProgressRing pct={pct} size={36} stroke={3} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 10 && (
              <div
                className={`s7-zone${isDragOver ? ' drag-over' : ''}`}
                style={uploadZoneStyle(uploadingIds.length > 0)}
                onClick={() => photoInputRef.current?.click()}
                onDragEnter={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); handlePhotoFiles(e.dataTransfer.files); }}
              >
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={e => handlePhotoFiles(e.target.files)} />

                {/* Guided icon row — consistent lucide outline style */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                  {[
                    { Icon: Store,    label: 'Shop' },
                    { Icon: Image,    label: 'Interior' },
                    { Icon: Scissors, label: 'Work' },
                  ].map(({ Icon, label }) => (
                    <div key={label} style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
                      border: `1.5px solid ${isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} strokeWidth={1.5} color={isDark ? '#8b5cf6' : '#9d65f3'} />
                    </div>
                  ))}
                </div>

                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(124,58,237,0.12)', border: '1.5px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Upload size={21} color="#7c3aed" strokeWidth={1.5} />
                </div>

                <p style={{ fontSize: 15, fontWeight: 700, color: text, margin: '0 0 5px' }}>
                  {isDragOver ? 'Drop photos here' : 'Add salon photos'}
                </p>
                <p style={{ fontSize: 11, color: sub, margin: '0 0 2px', opacity: 0.8 }}>Shop front · Interior · Your work samples</p>
                <p style={{ fontSize: 10, color: sub, margin: 0, opacity: 0.65 }}>JPEG, PNG, WebP · Max 10MB each · Up to 10 photos</p>
              </div>
            )}
          </div>

          {/* ── Documents (optional) ── */}
          <div>
            <button onClick={() => setDocsOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 13, fontWeight: 700, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} />
              {docsOpen ? '▾' : '▸'} Add Business Documents (Optional)
            </button>

            {docsOpen && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Business License', key: 'license', uploading: licenseUploading, setUploading: setLicenseUploading, hasUrl: !!data.businessLicenseUrl, ref: licenseRef },
                  { label: 'Business Registration', key: 'reg', uploading: regUploading, setUploading: setRegUploading, hasUrl: !!data.businessRegistrationUrl, ref: regRef },
                ].map(({ label, key, uploading, setUploading, hasUrl, ref }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${hasUrl ? 'rgba(16,185,129,0.3)' : border}`, background: hasUrl ? 'rgba(16,185,129,0.06)' : zoneBg }}>
                    <FileText size={18} color={hasUrl ? '#10b981' : sub} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: text, margin: 0 }}>{label}</p>
                      {hasUrl && <p style={{ fontSize: 11, color: '#10b981', margin: '2px 0 0' }}>Uploaded ✓</p>}
                    </div>
                    <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleDoc(key, e.target.files[0], setUploading)} />
                    <button onClick={() => ref.current?.click()} disabled={uploading}
                      style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a855f7', fontSize: 12, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {uploading ? <div style={{ width: 12, height: 12, border: '2px solid rgba(168,85,247,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 's7-spin 0.7s linear infinite' }} /> : hasUrl ? 'Replace' : 'Upload'}
                    </button>
                  </div>
                ))}
                <button onClick={() => setDocsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sub, fontSize: 13, fontFamily: 'inherit' }}>Skip for now →</button>
              </div>
            )}
          </div>
        </div>

        {/* Continue */}
        <button className="s7-btn s7-fu1" onClick={handleNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
          Continue — Select Your Services <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
