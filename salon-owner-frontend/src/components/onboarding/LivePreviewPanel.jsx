import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';

/* ─── Skeleton shimmer ──────────────────────────────────────── */
function Skeleton({ w = '100%', h = 14, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.05) 75%)',
      backgroundSize: '200% 100%',
      animation: 'ob-shimmer 1.5s infinite',
    }} />
  );
}

/* ─── Service pill ──────────────────────────────────────────── */
function ServicePill({ name, price }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 99, padding: '3px 10px', fontSize: 10, color: '#c4b5fd',
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {name}
      {price && <span style={{ color: '#a78bfa', fontWeight: 700 }}>₹{price}</span>}
    </div>
  );
}

export default function LivePreviewPanel() {
  const { data, currentStep } = useOnboarding();
  const { isDark } = useTheme();

  const coverPhoto = data.photos.find(p => p.isCover)?.url || data.photos[0]?.url || '';
  const services   = data.selectedServices.slice(0, 5);
  const extraCount = Math.max(0, data.selectedServices.length - 5);

  const DAY_ABBR = { Mon:'M', Tue:'T', Wed:'W', Thu:'Th', Fri:'F', Sat:'S', Sun:'Su' };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr   = h % 12 || 12;
    return `${hr}${m ? `:${String(m).padStart(2,'0')}` : ''} ${ampm}`;
  };

  return (
    <>
      <style>{`
        @keyframes ob-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes ob-fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .ob-fade-in{animation:ob-fade-in 0.4s ease both}
        @keyframes ob-glow-pulse{0%,100%{box-shadow:0 0 30px rgba(124,58,237,0.35)}50%{box-shadow:0 0 60px rgba(124,58,237,0.6)}}
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        position: 'sticky', top: 24,
      }}>
        {/* Label */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
          color: 'rgba(139,92,246,0.7)', textTransform: 'uppercase',
        }}>
          Live Preview ✨
        </div>

        {/* Phone frame */}
        <div style={{
          width: 240, height: 480,
          borderRadius: 36,
          background: isDark ? '#0a0a1a' : '#0f0f1a',
          border: '8px solid #1e1e3f',
          boxShadow: '0 0 0 1px rgba(139,92,246,0.3), 0 0 40px rgba(124,58,237,0.25), 0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          position: 'relative',
          animation: 'ob-glow-pulse 4s ease-in-out infinite',
          flexShrink: 0,
        }}>
          {/* Notch */}
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            width: 70, height: 18, background: '#1e1e3f', borderRadius: 99, zIndex: 10,
          }} />

          {/* Scrollable content */}
          <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
               className="scrollbar-none">

            {/* Hero photo / placeholder */}
            <div style={{
              height: 120, position: 'relative',
              background: coverPhoto
                ? `url(${coverPhoto}) center/cover`
                : 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(236,72,153,0.3))',
              flexShrink: 0,
            }}>
              {!coverPhoto && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 32,
                }}>✂️</div>
              )}
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                background: 'linear-gradient(to top,#0a0a1a,transparent)',
              }} />
            </div>

            {/* Content */}
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Salon name */}
              <div className="ob-fade-in">
                {data.salonName ? (
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>
                    {data.salonName}
                  </div>
                ) : (
                  <Skeleton h={14} w="70%" />
                )}
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {data.servedGender && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 99, background: 'rgba(139,92,246,0.2)',
                      color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)',
                    }}>
                      {data.servedGender === 'male' ? '✂️ Men' : data.servedGender === 'female' ? '💅 Women' : '✨ Unisex'}
                    </span>
                  )}
                  <span style={{
                    fontSize: 8, padding: '2px 7px', borderRadius: 99,
                    background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                    border: '1px solid rgba(34,197,94,0.25)', fontWeight: 600,
                  }}>⭐ New Salon</span>
                </div>
              </div>

              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <span style={{ fontSize: 10, marginTop: 1 }}>📍</span>
                {data.city || data.district ? (
                  <span className="ob-fade-in" style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                    {[data.district, data.city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(', ') || data.city || data.district}
                    {data.state ? `, ${data.state}` : ''}
                  </span>
                ) : (
                  <Skeleton h={10} w="65%" />
                )}
              </div>

              {/* Hours */}
              {(data.workingDays.length > 0) && (
                <div className="ob-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10 }}>🕘</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {data.workingDays.join('·')} · {formatTime(data.openTime)} – {formatTime(data.closeTime)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

              {/* Services */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                  Services
                </div>
                {services.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} className="ob-fade-in">
                    {services.map(s => {
                      const pricing = data.servicePricing[s.serviceName];
                      return (
                        <ServicePill
                          key={s.serviceName}
                          name={s.serviceName}
                          price={pricing?.price || ''}
                        />
                      );
                    })}
                    {extraCount > 0 && (
                      <ServicePill name={`+${extraCount} more`} />
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Skeleton h={20} w={70} r={99} />
                    <Skeleton h={20} w={55} r={99} />
                    <Skeleton h={20} w={60} r={99} />
                  </div>
                )}
              </div>

              {/* Photo strip */}
              {data.photos.length > 0 && (
                <div className="ob-fade-in">
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' }}>
                    Gallery
                  </div>
                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
                    {data.photos.slice(0, 4).map((p, i) => (
                      <div key={i} style={{
                        width: 48, height: 36, borderRadius: 6, flexShrink: 0,
                        background: `url(${p.url}) center/cover`,
                        border: p.isCover ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Book now button */}
              <div style={{
                background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                borderRadius: 10, padding: '8px 0',
                textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff',
                marginTop: 4, opacity: 0.8,
              }}>
                Book Now
              </div>

              {/* Watermark */}
              <div style={{ textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.2)', paddingBottom: 4 }}>
                Preview Only • Powered by GlowSpot
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p style={{ fontSize: 11, color: 'rgba(139,92,246,0.6)', textAlign: 'center', maxWidth: 200, lineHeight: 1.4 }}>
          This is how customers will see your salon
        </p>
      </div>
    </>
  );
}
