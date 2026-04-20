import React, { useEffect, useRef, useState } from 'react';

/* ─── Motivational quotes per business type ─────────────────────────────── */
const QUOTES = {
  barbershop: [
    "Every great cut starts with a focused mind. You've got this today.",
    "Sharp blades, sharper business. Let's make today count.",
    "Your clients leave confident. That's not just a haircut — that's impact.",
    "The best barbershops aren't found. They're built. You're building yours.",
    "One great experience today turns into five referrals tomorrow.",
    "Consistency is your superpower. Show up, and the bookings follow.",
    "Legends aren't born in one day — but today is part of the story.",
    "Your chair is more than a seat. It's where confidence is restored.",
  ],
  salon: [
    "Every client who leaves glowing is your best advertisement.",
    "Beauty is your craft. Today is a fresh canvas — style it perfectly.",
    "You don't just change hair. You change how people feel about themselves.",
    "The details you obsess over are exactly why clients keep coming back.",
    "Small acts of excellence compound into an extraordinary reputation.",
    "Your passion is contagious. Let it fill the room today.",
    "Great salons are built one loyal client at a time. Keep going.",
    "You make people look in the mirror and smile. That's rare work.",
  ],
  spa_wellness: [
    "You sell calm in a chaotic world. The world needs more of you.",
    "Peace starts with you. Spread it to every client today.",
    "A single hour of true relaxation can change someone's week. You give that.",
    "Wellness is a gift. You're in the business of giving it every day.",
    "Your space is someone's sanctuary. Protect that experience.",
    "The best healers show up consistently. You're one of them.",
    "Energy is everything. Yours sets the tone for every session.",
    "Slow down, breathe, deliver magic. That's your process.",
  ],
  makeup_bridal: [
    "You make people feel beautiful on their most important day. That's rare.",
    "Every brushstroke is a story. Today, write beautiful ones.",
    "Brides remember their makeup artist for a lifetime. Be unforgettable.",
    "Glamour is a skill. You've mastered it — now share it.",
    "The moments you create last forever in photographs. Own that power.",
    "Confidence is the best makeup. You help people find it.",
    "Your artistry is unique. No one does it exactly like you.",
    "Big days deserve flawless execution. That's your standard.",
  ],
  skin_derma: [
    "Healthy skin changes lives. You're doing that every single day.",
    "Confidence lives in clear skin. You restore it. That matters.",
    "Science plus care equals transformation. That's what you offer.",
    "Your clients trust you with their skin — that's deep trust. Honor it.",
    "Every treatment is a step toward someone's best self.",
    "Precision and patience are your tools. Use them well today.",
    "The results you deliver last. That's the kind of work worth doing.",
    "You see skin. You see solutions. That's expertise at its finest.",
  ],
  default: [
    "Every day is a new opportunity to create something extraordinary.",
    "Your business grows one delighted customer at a time. Keep going.",
    "Small wins every day add up to something unstoppable. Today counts.",
    "The most successful businesses are built on consistency. You have it.",
    "Someone today will have a great experience because of you. Make it count.",
    "Focus on service. The growth takes care of itself.",
    "You chose this path. Own it fully — every single day.",
    "The gap between good and great is just a little more care. You have it.",
  ],
};

function getQuote(businessType) {
  const pool = QUOTES[businessType] || QUOTES.default;
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  return pool[seed % pool.length];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const WB_CSS = `
  @keyframes wb-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(40px,-50px) scale(1.1)}70%{transform:translate(-25px,30px) scale(0.93)}}
  @keyframes wb-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-45px,35px) scale(1.07)}65%{transform:translate(30px,-20px) scale(0.96)}}
  @keyframes wb-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  @keyframes wb-sparkle{0%,100%{transform:scale(1) rotate(0deg);opacity:0.6}50%{transform:scale(1.4) rotate(25deg);opacity:1}}
  @keyframes wb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes wb-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes wb-quote-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes wb-badge-pop{0%{transform:scale(0.6);opacity:0}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
  @keyframes wb-btn-pulse{0%,100%{box-shadow:0 6px 28px rgba(124,58,237,0.5)}50%{box-shadow:0 6px 44px rgba(124,58,237,0.8),0 0 0 4px rgba(124,58,237,0.15)}}
  @keyframes wb-particle{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-60px) scale(0);opacity:0}}

  .wb-u1{animation:wb-up 0.55s 0.0s cubic-bezier(0.16,1,0.3,1) both}
  .wb-u2{animation:wb-up 0.55s 0.1s cubic-bezier(0.16,1,0.3,1) both}
  .wb-u3{animation:wb-up 0.55s 0.2s cubic-bezier(0.16,1,0.3,1) both}
  .wb-u4{animation:wb-up 0.55s 0.3s cubic-bezier(0.16,1,0.3,1) both}
  .wb-u5{animation:wb-up 0.55s 0.4s cubic-bezier(0.16,1,0.3,1) both}

  .wb-sparkle{animation:wb-sparkle 2.2s ease-in-out infinite}
  .wb-float{animation:wb-float 3.5s ease-in-out infinite}

  .wb-shimmer-text{
    background:linear-gradient(90deg,#a78bfa,#60a5fa,#f9a8d4,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:wb-shimmer 4s linear infinite;
  }

  .wb-badge{animation:wb-badge-pop 0.5s 0.35s cubic-bezier(0.34,1.56,0.64,1) both}

  .wb-quote{animation:wb-quote-in 0.6s 0.55s cubic-bezier(0.16,1,0.3,1) both}

  .wb-btn{
    border:none;outline:none;cursor:pointer;font-family:inherit;
    animation:wb-u5 0.55s 0.45s cubic-bezier(0.16,1,0.3,1) both, wb-btn-pulse 2.2s 1.2s ease-in-out infinite;
    transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .wb-btn:hover{transform:translateY(-3px) scale(1.03)!important;}
  .wb-btn:active{transform:scale(0.97)!important;}

  .wb-particle{animation:wb-particle 1.4s ease-out forwards;}
`;

/* ─── Floating particles burst ────────────────────────────────────────────── */
function SparkleParticles() {
  const PARTICLES = [
    { x: 30, delay: 0,    sym: '✦', size: 18, color: '#a78bfa' },
    { x: 50, delay: 0.1,  sym: '✦', size: 14, color: '#f9a8d4' },
    { x: 70, delay: 0.05, sym: '✦', size: 16, color: '#60a5fa' },
    { x: 20, delay: 0.15, sym: '·', size: 22, color: '#fbbf24' },
    { x: 80, delay: 0.08, sym: '·', size: 20, color: '#34d399' },
    { x: 45, delay: 0.2,  sym: '✦', size: 12, color: '#c4b5fd' },
    { x: 60, delay: 0.12, sym: '·', size: 16, color: '#f472b6' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: '54%', left: 0, right: 0, height: 80, pointerEvents: 'none', overflow: 'hidden' }}>
      {PARTICLES.map((p, i) => (
        <div key={i} className="wb-particle"
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: 0,
            fontSize: p.size,
            color: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${1.2 + i * 0.1}s`,
          }}>
          {p.sym}
        </div>
      ))}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function WelcomeBackOverlay({ name, salonName, businessType, onDone }) {
  const quote    = getQuote(businessType);
  const greeting = getGreeting();
  const bizLabel = { barbershop:'Barbershop', salon:'Salon', spa_wellness:'Spa', makeup_bridal:'Studio', skin_derma:'Clinic' }[businessType] || 'Business';
  const [particles, setParticles] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setParticles(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{WB_CSS}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at 55% 25%, rgba(124,58,237,0.16) 0%, transparent 55%), radial-gradient(ellipse at 25% 80%, rgba(236,72,153,0.1) 0%, transparent 55%), #050510',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>

        {/* Ambient orbs */}
        <div style={{ position:'absolute', top:'-18%', left:'-12%', width:580, height:580, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.13) 0%,transparent 70%)', animation:'wb-orb1 22s ease-in-out infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-18%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(236,72,153,0.09) 0%,transparent 70%)', animation:'wb-orb2 27s ease-in-out infinite', pointerEvents:'none' }} />

        {/* Corner sparkles */}
        {[
          {top:'10%',left:'7%',  size:20,delay:'0s'},
          {top:'14%',right:'9%', size:16,delay:'0.5s'},
          {top:'72%',left:'5%',  size:18,delay:'1s'},
          {top:'78%',right:'6%', size:22,delay:'0.7s'},
          {top:'42%',left:'3%',  size:14,delay:'1.3s'},
          {top:'38%',right:'4%', size:16,delay:'0.3s'},
        ].map((s,i) => (
          <div key={i} className="wb-sparkle" style={{ position:'absolute', top:s.top, left:s.left, right:s.right, fontSize:s.size, color:'rgba(167,139,250,0.55)', animationDelay:s.delay, pointerEvents:'none' }}>✦</div>
        ))}

        {/* Particle burst */}
        {particles && <SparkleParticles />}

        {/* Spark icon */}
        <div className="wb-float wb-u1" style={{ marginBottom: 22 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(236,72,153,0.2))',
            border: '2px solid rgba(167,139,250,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34,
            boxShadow: '0 0 40px rgba(124,58,237,0.3), 0 0 0 8px rgba(124,58,237,0.08)',
          }}>
            ✨
          </div>
        </div>

        {/* Greeting */}
        <p className="wb-u1" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.38)', margin: '0 0 6px', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {greeting}
        </p>

        {/* Name headline */}
        <h1 className="wb-u2" style={{ fontSize: 'clamp(1.9rem,5vw,2.7rem)', fontWeight: 900, color: '#f8fafc', textAlign: 'center', margin: '0 0 6px', letterSpacing: '-1px', lineHeight: 1.1 }}>
          Welcome back{name ? `, ${name}` : ''}! <span className="wb-sparkle" style={{ display:'inline-block', fontSize:'0.85em' }}>✨</span>
        </h1>

        {/* Salon name badge */}
        {salonName && (
          <div className="wb-badge" style={{ marginBottom: 28, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 99, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#c4b5fd', letterSpacing: 0.3 }}>{salonName} · {bizLabel}</span>
          </div>
        )}

        {/* Quote card */}
        <div className="wb-quote" style={{
          maxWidth: 380, width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '20px 24px',
          marginBottom: 32,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'relative',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}>
          {/* Quote mark */}
          <div style={{ position: 'absolute', top: 12, left: 18, fontSize: 32, lineHeight: 1, color: 'rgba(167,139,250,0.2)', fontFamily: 'Georgia,serif', fontWeight: 900 }}>"</div>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', textAlign: 'center', margin: 0, fontStyle: 'italic', paddingTop: 6 }}>
            {quote}
          </p>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(167,139,250,0.45)' }}>GlowLoox</span>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>

        {/* CTA */}
        <button className="wb-btn" onClick={onDone}
          style={{
            padding: '15px 52px', borderRadius: 16,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)',
            color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px',
          }}>
          Let's Go →
        </button>

        {/* Fine print */}
        <p className="wb-u5" style={{ marginTop: 18, fontSize: 11.5, color: 'rgba(255,255,255,0.16)', textAlign: 'center' }}>
          Your dashboard is ready
        </p>
      </div>
    </>
  );
}
