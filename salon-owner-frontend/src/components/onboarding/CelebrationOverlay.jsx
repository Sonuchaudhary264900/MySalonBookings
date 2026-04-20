import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const BIZ_LABEL = {
  barbershop:    'Barbershop',
  salon:         'Salon',
  spa_wellness:  'Spa',
  makeup_bridal: 'Studio',
  skin_derma:    'Clinic',
};

const CEL_CSS = `
  @keyframes cel-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(50px,-60px) scale(1.1)}70%{transform:translate(-30px,40px) scale(0.93)}}
  @keyframes cel-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-55px,35px) scale(1.07)}65%{transform:translate(35px,-25px) scale(0.96)}}
  @keyframes cel-check-ring{0%{transform:scale(0.4);opacity:0}55%{transform:scale(1.18);opacity:1}75%{transform:scale(0.94)}100%{transform:scale(1)}}
  @keyframes cel-check-icon{0%{opacity:0;transform:scale(0) rotate(-20deg)}60%{opacity:1;transform:scale(1.14) rotate(3deg)}100%{transform:scale(1) rotate(0)}}
  @keyframes cel-pulse-ring{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.7);opacity:0}}
  @keyframes cel-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes cel-glow{0%,100%{text-shadow:0 0 40px rgba(168,85,247,0.7)}50%{text-shadow:0 0 80px rgba(168,85,247,1),0 0 120px rgba(236,72,153,0.6)}}
  @keyframes cel-sparkle{0%,100%{transform:scale(1) rotate(0deg);opacity:0.9}50%{transform:scale(1.3) rotate(20deg);opacity:1}}
  @keyframes cel-float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
  @keyframes cel-btn-glow{0%,100%{box-shadow:0 6px 32px rgba(124,58,237,0.55)}50%{box-shadow:0 6px 50px rgba(124,58,237,0.85),0 0 0 4px rgba(124,58,237,0.18)}}

  .cel-ring{animation:cel-check-ring 0.7s cubic-bezier(0.34,1.56,0.64,1) both}
  .cel-icon{animation:cel-check-icon 0.55s 0.15s cubic-bezier(0.34,1.56,0.64,1) both}
  .cel-pulse{animation:cel-pulse-ring 1.8s 0.5s ease-out infinite}
  .cel-float{animation:cel-float 4s ease-in-out infinite}
  .cel-up1{animation:cel-up 0.65s 0.45s cubic-bezier(0.16,1,0.3,1) both}
  .cel-up2{animation:cel-up 0.65s 0.65s cubic-bezier(0.16,1,0.3,1) both}
  .cel-up3{animation:cel-up 0.65s 0.85s cubic-bezier(0.16,1,0.3,1) both}
  .cel-up4{animation:cel-up 0.65s 1.05s cubic-bezier(0.16,1,0.3,1) both}
  .cel-title{animation:cel-up 0.65s 0.45s cubic-bezier(0.16,1,0.3,1) both,cel-glow 2.5s 1.2s ease-in-out infinite}
  .cel-sparkle{animation:cel-sparkle 2s ease-in-out infinite}
  .cel-btn{animation:cel-up 0.65s 1.2s cubic-bezier(0.16,1,0.3,1) both,cel-btn-glow 2.2s 2s ease-in-out infinite;border:none;outline:none;cursor:pointer;font-family:inherit;transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1);}
  .cel-btn:hover{transform:translateY(-3px) scale(1.03)!important;}
  .cel-btn:active{transform:scale(0.97)!important;}
`;

export default function CelebrationOverlay({ name, salonName, businessType, onDone }) {
  const firedRef    = useRef(false);
  const intervalRef = useRef(null);

  const bizLabel  = BIZ_LABEL[businessType] || 'Business';
  const displayName = salonName || `Your ${bizLabel}`;

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const burst = (opts = {}) => confetti({
      particleCount: 110,
      spread: 100,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#7c3aed','#a855f7','#ec4899','#fbbf24','#34d399','#60a5fa'],
      ...opts,
    });

    burst();
    setTimeout(() => burst({ origin: { x: 0.25, y: 0.55 }, particleCount: 80 }), 320);
    setTimeout(() => burst({ origin: { x: 0.75, y: 0.55 }, particleCount: 80 }), 620);
    setTimeout(() => burst({ particleCount: 60, spread: 130 }), 1050);

    intervalRef.current = setInterval(() => {
      burst({
        origin: { x: 0.2 + Math.random() * 0.6, y: Math.random() * 0.4 },
        particleCount: 50, spread: 80,
      });
    }, 2400);

    return () => { clearInterval(intervalRef.current); confetti.reset(); };
  }, []);

  const handleEnter = () => {
    clearInterval(intervalRef.current);
    confetti.reset();
    onDone();
  };

  return (
    <>
      <style>{CEL_CSS}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at 60% 30%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(236,72,153,0.12) 0%, transparent 60%), #050510',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>

        {/* Ambient orbs */}
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.14) 0%,transparent 70%)', animation: 'cel-orb1 20s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,0.1) 0%,transparent 70%)', animation: 'cel-orb2 25s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* Floating sparkles */}
        {[
          { top: '12%', left: '8%',  size: 22, delay: '0s'   },
          { top: '18%', right: '10%',size: 16, delay: '0.4s' },
          { top: '70%', left: '6%',  size: 18, delay: '0.8s' },
          { top: '75%', right: '8%', size: 24, delay: '1.2s' },
          { top: '45%', left: '3%',  size: 14, delay: '0.6s' },
          { top: '40%', right: '4%', size: 20, delay: '1s'   },
        ].map((s, i) => (
          <div key={i} className="cel-sparkle" style={{
            position: 'absolute', top: s.top, left: s.left, right: s.right,
            fontSize: s.size, opacity: 0.7,
            animationDelay: s.delay, pointerEvents: 'none',
          }}>✦</div>
        ))}

        {/* Check circle */}
        <div className="cel-float" style={{ position: 'relative', marginBottom: 32 }}>
          {/* Pulse rings */}
          <div className="cel-pulse" style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.4)' }} />
          <div className="cel-pulse" style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.3)', animationDelay: '0.6s' }} />

          <div className="cel-ring" style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg,#059669,#10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 6px rgba(16,185,129,0.15), 0 0 60px rgba(16,185,129,0.45)',
          }}>
            <div className="cel-icon" style={{ fontSize: 44, lineHeight: 1, color: '#fff' }}>✓</div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="cel-title" style={{
          fontSize: 'clamp(1.9rem,5vw,2.8rem)',
          fontWeight: 900, color: '#f8fafc',
          textAlign: 'center', letterSpacing: '-1.2px',
          margin: '0 0 10px', lineHeight: 1.1,
        }}>
          {displayName} is LIVE! 🎊
        </h1>

        {/* Subtitle */}
        <p className="cel-up2" style={{
          fontSize: 15.5, color: '#94a3b8',
          textAlign: 'center', maxWidth: 360,
          lineHeight: 1.65, margin: '0 0 14px',
        }}>
          Welcome to GlowLoox — let's get you your first booking.
        </p>

        {/* Partner badge */}
        {name && (
          <p className="cel-up3" style={{
            fontSize: 16, fontWeight: 700,
            textAlign: 'center', margin: '0 0 2px',
            background: 'linear-gradient(135deg,#a855f7,#ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Congrats, {name}! You're officially a GlowLoox Partner. 🌟
          </p>
        )}

        {/* CTA */}
        <button className="cel-btn" onClick={handleEnter}
          style={{
            marginTop: 36,
            padding: '15px 52px',
            borderRadius: 16,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)',
            color: '#fff', fontSize: 17, fontWeight: 800,
            letterSpacing: '-0.2px',
          }}>
          Enter Dashboard →
        </button>

        {/* Fine print */}
        <p className="cel-up4" style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Your profile is now visible to customers on GlowLoox
        </p>
      </div>
    </>
  );
}
