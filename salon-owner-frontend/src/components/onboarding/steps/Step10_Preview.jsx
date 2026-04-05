import React, { useState } from 'react';
import { Edit2, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import { useOnboardingSubmit } from '../../../hooks/useOnboardingSubmit';
import CelebrationOverlay from '../CelebrationOverlay';
import ROUTES from '../../../routes';

const S10_CSS = `
  @keyframes s10-fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s10-phone-in{from{opacity:0;transform:translateY(40px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes s10-check-in{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
  @keyframes s10-glow{0%,100%{box-shadow:0 0 40px rgba(124,58,237,0.3),0 0 0 1px rgba(124,58,237,0.2)}50%{box-shadow:0 0 70px rgba(124,58,237,0.5),0 0 0 2px rgba(124,58,237,0.4)}}
  @keyframes s10-typewriter{from{width:0}to{width:100%}}
  @keyframes s10-spin{to{transform:rotate(360deg)}}
  @keyframes s10-warn-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
  .s10-fu1{animation:s10-fadeup 0.5s 0.0s ease both}
  .s10-fu2{animation:s10-fadeup 0.5s 0.1s ease both}
  .s10-fu3{animation:s10-fadeup 0.5s 0.2s ease both}
  .s10-phone{animation:s10-phone-in 0.7s cubic-bezier(0.34,1.56,0.64,1) both}
  .s10-check{animation:s10-check-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both}
  .s10-btn{transition:transform 0.15s,box-shadow 0.15s,filter 0.15s;}
  .s10-btn:hover:not(:disabled){transform:scale(1.02);filter:brightness(1.08);box-shadow:0 10px 40px rgba(124,58,237,0.6)!important;}
  .s10-btn:active:not(:disabled){transform:scale(0.98);}
  .s10-warn{animation:s10-warn-pulse 2s ease-in-out infinite}
`;

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function Step10_Preview() {
  const { data, goToStep } = useOnboarding();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { submit, submitting, phase } = useOnboardingSubmit();
  const [showCelebration, setShowCelebration] = useState(false);

  const unpricedCount  = data.selectedServices.filter(s => !data.servicePricing[s.serviceName]?.price).length;
  const coverPhoto     = data.photos.find(p => p.isCover)?.url || data.photos[0]?.url || '';

  const checklist = [
    { label: 'Salon name & identity',          done: !!(data.salonName && data.servedGender), step: 4  },
    { label: `Location (${data.city || data.district || '—'})`, done: !!(data.address && data.state),  step: 5  },
    { label: `Working hours (${data.workingDays.slice(0,2).join('–')} · ${formatTime12(data.openTime)})`, done: data.workingDays.length > 0, step: 6 },
    { label: 'Video uploaded',                 done: !!data.videoUrl,    step: 7  },
    { label: `${data.photos.length} photo${data.photos.length !== 1 ? 's' : ''} added`, done: data.photos.length > 0, step: 7 },
    { label: `${data.selectedServices.length} service${data.selectedServices.length !== 1 ? 's' : ''} selected`, done: data.selectedServices.length > 0, step: 8 },
    ...(unpricedCount > 0 ? [{ label: `${unpricedCount} service${unpricedCount > 1 ? 's' : ''} without price`, done: false, warn: true, step: 9 }] : []),
  ];

  const handleSubmit = async () => {
    if (submitting) return;
    const res = await submit();
    if (res.success) {
      setShowCelebration(true);
    } else {
      toast.error(res.message || 'Submission failed — please try again');
    }
  };

  const handleCelebrationDone = () => {
    setShowCelebration(false);
    navigate(ROUTES.APPROVAL_WAITING, { replace: true });
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';

  return (
    <>
      <style>{S10_CSS}</style>

      {showCelebration && <CelebrationOverlay name={user?.name || data.name} onDone={handleCelebrationDone} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="s10-fu1" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 900, color: text, margin: '0 0 8px', letterSpacing: '-0.6px' }}>
            Here's your salon 🎉
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0 }}>
            Review everything before going live.
          </p>
        </div>

        {/* Split layout: preview phone + checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Phone mockup ── */}
          <div className="s10-phone" style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 220, borderRadius: 34,
              background: '#0a0a1a', border: '7px solid #1e1e3f',
              animation: 's10-glow 4s ease-in-out infinite',
              overflow: 'hidden', position: 'relative',
            }}>
              {/* Notch */}
              <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)', width: 60, height: 16, background: '#1e1e3f', borderRadius: 99, zIndex: 5 }} />

              {/* Hero photo */}
              <div style={{ height: 110, background: coverPhoto ? `url(${coverPhoto}) center/cover` : 'linear-gradient(135deg,rgba(124,58,237,0.5),rgba(236,72,153,0.4))', position: 'relative', flexShrink: 0 }}>
                {!coverPhoto && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✂️</div>}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(to top,#0a0a1a,transparent)' }} />
              </div>

              <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Name */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>{data.salonName || 'Your Salon'}</p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {data.servedGender && (
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                        {data.servedGender === 'male' ? '✂️ Men' : data.servedGender === 'female' ? '💅 Women' : '✨ Unisex'}
                      </span>
                    )}
                    <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 99, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 600 }}>⭐ New</span>
                  </div>
                </div>

                {/* Location */}
                <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>📍 {[data.district, data.city, data.state].filter(Boolean).join(', ') || 'Location set'}</p>

                {/* Hours */}
                <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>🕘 {data.workingDays.join('·')} · {formatTime12(data.openTime)} – {formatTime12(data.closeTime)}</p>

                {/* Services */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {data.selectedServices.slice(0, 4).map(s => (
                    <span key={s.serviceName} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 99, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)', whiteSpace: 'nowrap' }}>
                      {s.serviceName}
                    </span>
                  ))}
                  {data.selectedServices.length > 4 && <span style={{ fontSize: 8, color: '#94a3b8' }}>+{data.selectedServices.length - 4} more</span>}
                </div>

                {/* Book now */}
                <div style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)', borderRadius: 8, padding: '7px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff', opacity: 0.85 }}>
                  Book Now
                </div>
              </div>
            </div>
          </div>

          {/* ── Checklist ── */}
          <div className="s10-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 20, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: sub, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>
              Completion Checklist
            </p>

            {checklist.map((item, i) => (
              <div key={i} className="s10-check" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                animationDelay: `${i * 0.08}s`,
              }}>
                {item.warn ? (
                  <AlertTriangle size={16} className="s10-warn" color="#f59e0b" style={{ flexShrink: 0 }} />
                ) : item.done ? (
                  <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #f87171', flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, fontSize: 12, color: item.done ? text : item.warn ? '#f59e0b' : '#f87171', fontWeight: item.done ? 500 : 600 }}>
                  {item.label}
                </span>
                <button onClick={() => goToStep(item.step)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed',
                  fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px',
                  borderRadius: 6, transition: 'background 0.15s', fontWeight: 600,
                }}>
                  <Edit2 size={10} /> Edit
                </button>
              </div>
            ))}

            {/* Description preview */}
            {data.description && (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.04)' : '#f9f7ff', border: `1px solid ${border}` }}>
                <p style={{ fontSize: 11, color: sub, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>"{data.description.slice(0, 100)}{data.description.length > 100 ? '...' : ''}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Quote */}
        <p className="s10-fu3" style={{ textAlign: 'center', fontSize: 14, color: sub, margin: 0, fontStyle: 'italic' }}>
          Looks amazing, right? You built this in under 3 minutes. 🚀
        </p>

        {/* Submit */}
        <button className="s10-btn" onClick={handleSubmit} disabled={submitting}
          style={{
            width: '100%', padding: '18px 24px', borderRadius: 18,
            background: submitting ? (isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb') : 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)',
            color: submitting ? sub : '#fff',
            fontWeight: 800, fontSize: 17, border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontFamily: 'inherit', letterSpacing: '-0.3px',
            boxShadow: !submitting ? '0 6px 40px rgba(124,58,237,0.55)' : 'none',
          }}>
          {submitting ? (
            <><div style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 's10-spin 0.7s linear infinite' }} />
            {phase === 'creating' ? 'Setting up your salon...' : 'Almost ready...'}</>
          ) : (
            <><Rocket size={22} /> Submit My Salon</>
          )}
        </button>

        {unpricedCount > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#f59e0b', margin: 0 }}>
            ⚠️ {unpricedCount} service{unpricedCount > 1 ? 's' : ''} without price — customers will see "Price on request"
          </p>
        )}
      </div>
    </>
  );
}
