import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export default function CelebrationOverlay({ name, onDone }) {
  const firedRef   = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const burst = (opts = {}) => confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#7c3aed','#a855f7','#ec4899','#fbbf24','#34d399','#60a5fa'],
      ...opts,
    });

    // Initial bursts
    burst();
    setTimeout(() => burst({ origin: { x: 0.3, y: 0.6 }, particleCount: 80 }), 300);
    setTimeout(() => burst({ origin: { x: 0.7, y: 0.6 }, particleCount: 80 }), 600);
    setTimeout(() => burst({ particleCount: 60, spread: 120 }), 1000);

    // Keep firing until Enter is pressed
    intervalRef.current = setInterval(() => {
      burst({ origin: { x: Math.random(), y: Math.random() * 0.5 }, particleCount: 60, spread: 80 });
    }, 2200);

    return () => {
      clearInterval(intervalRef.current);
      confetti.reset();
    };
  }, []);

  const handleEnter = () => {
    clearInterval(intervalRef.current);
    confetti.reset();
    onDone();
  };

  return (
    <>
      <style>{`
        @keyframes cel-pop{0%{transform:scale(0.3) rotate(-10deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}80%{transform:scale(0.95) rotate(-1deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes cel-fade-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cel-glow{0%,100%{text-shadow:0 0 40px rgba(168,85,247,0.8)}50%{text-shadow:0 0 80px rgba(168,85,247,1),0 0 120px rgba(236,72,153,0.6)}}
        .cel-pop{animation:cel-pop 0.7s cubic-bezier(0.34,1.56,0.64,1) both}
        .cel-fu1{animation:cel-fade-up 0.6s 0.5s ease both}
        .cel-fu2{animation:cel-fade-up 0.6s 0.8s ease both}
        .cel-fu3{animation:cel-fade-up 0.6s 1.1s ease both}
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,5,20,0.96)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        padding: 24,
      }}>
        {/* Check icon */}
        <div className="cel-pop" style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'linear-gradient(135deg,#059669,#10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52, boxShadow: '0 0 60px rgba(16,185,129,0.5)',
          marginBottom: 28,
        }}>
          ✅
        </div>

        <h1 className="cel-fu1" style={{
          fontSize: 'clamp(1.8rem,4vw,2.8rem)',
          fontWeight: 900, color: '#f1f5f9',
          textAlign: 'center', letterSpacing: '-1px',
          margin: '0 0 8px',
          animation: 'cel-fade-up 0.6s 0.5s ease both, cel-glow 2s 1s ease-in-out infinite',
        }}>
          Your salon is LIVE! 🎊
        </h1>

        <p className="cel-fu2" style={{
          fontSize: 16, color: '#94a3b8', textAlign: 'center',
          margin: '0 0 16px', maxWidth: 380, lineHeight: 1.6,
        }}>
          Welcome to GlowLoox — let's get you your first booking.
        </p>

        {name && (
          <p className="cel-fu3" style={{
            fontSize: 18, fontWeight: 700, textAlign: 'center',
            background: 'linear-gradient(135deg,#a855f7,#ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Congrats, {name}! You're officially a GlowLoox Partner. 🌟
          </p>
        )}

        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            marginTop: 40,
            padding: '14px 48px',
            borderRadius: 14,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            border: 'none',
            color: '#fff',
            fontSize: 17,
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            boxShadow: '0 6px 32px rgba(124,58,237,0.55)',
            fontFamily: 'inherit',
            animation: 'cel-fade-up 0.6s 1.4s ease both',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(124,58,237,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 32px rgba(124,58,237,0.55)'; }}
        >
          Enter Dashboard →
        </button>
      </div>
    </>
  );
}
