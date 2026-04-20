import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, ArrowRight, TrendingUp, Users, Zap, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import ROUTES from '../../routes';
import PhoneOtpForm from '../../components/auth/PhoneOtpForm';

const CSS = `
  @keyframes rg-orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(45px,-55px) scale(1.1)}70%{transform:translate(-25px,35px) scale(0.93)}}
  @keyframes rg-orb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-50px,40px) scale(1.07)}65%{transform:translate(30px,-22px) scale(0.95)}}
  @keyframes rg-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes rg-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes rg-float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-8px)}}
  @keyframes rg-badge{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}

  .rg-a1{animation:rg-up 0.6s 0.0s cubic-bezier(0.16,1,0.3,1) both}
  .rg-a2{animation:rg-up 0.6s 0.07s cubic-bezier(0.16,1,0.3,1) both}
  .rg-a3{animation:rg-up 0.6s 0.14s cubic-bezier(0.16,1,0.3,1) both}
  .rg-a4{animation:rg-up 0.6s 0.21s cubic-bezier(0.16,1,0.3,1) both}
  .rg-a5{animation:rg-up 0.6s 0.28s cubic-bezier(0.16,1,0.3,1) both}

  .rg-shimmer{
    background:linear-gradient(90deg,#a78bfa,#60a5fa,#f9a8d4,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:rg-shimmer 5s linear infinite;
  }
  .rg-float{animation:rg-float 6s ease-in-out infinite}

  .rg-stat{transition:transform 0.2s,box-shadow 0.2s;}
  .rg-stat:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(124,58,237,0.2)!important;}

  .rg-form-card{
    transition:box-shadow 0.3s;
  }

  @media(max-width:900px){
    .rg-hero{display:none!important;}
    .rg-panel{justify-content:center!important;}
  }
`;

const STATS = [
  { icon: Users,     value: '500+',   label: 'Active salons' },
  { icon: TrendingUp,value: '₹2.4Cr', label: 'Bookings processed' },
  { icon: Zap,       value: '< 3 min',label: 'Setup time' },
];

const TRUST_ITEMS = [
  { icon: Shield, text: 'Bank-grade secure' },
  { icon: Zap,    text: 'Free to get started' },
];

const Register = () => {
  const navigate  = useNavigate();
  const { register, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    if (user.status === 'pending_approval' || user.status === 'salon_registered') navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    else if (user.status === 'approved') navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, navigate]);

  const handleVerified = async (firebaseToken, phone) => {
    const data = await register(firebaseToken);
    const status = data?.data?.owner?.status;
    if (status === 'mobile_verified') {
      navigate(ROUTES.ONBOARDING, { replace: true, state: { phone, firebaseToken } });
    } else if (status === 'pending_approval' || status === 'salon_registered') {
      navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    } else {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  };

  const d = isDark;

  return (
    <>
      <style>{CSS}</style>

      {/* Theme toggle — fixed */}
      <button onClick={toggleTheme} type="button"
        style={{
          position: 'fixed', top: 18, right: 18, zIndex: 9999,
          width: 38, height: 38, borderRadius: 11,
          background: d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          border: d ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', transition: 'all 0.2s',
        }}>
        {d ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#6366f1" />}
      </button>

      <div style={{
        minHeight: '100dvh',
        background: d ? '#070714' : '#f8f7ff',
        display: 'flex',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Orbs */}
        <div style={{ position: 'absolute', top: '-15%', left: '-8%', width: 650, height: 650, borderRadius: '50%', background: `radial-gradient(circle,${d ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.08)'} 0%,transparent 70%)`, animation: 'rg-orb1 20s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: 550, height: 550, borderRadius: '50%', background: `radial-gradient(circle,${d ? 'rgba(236,72,153,0.1)' : 'rgba(236,72,153,0.06)'} 0%,transparent 70%)`, animation: 'rg-orb2 24s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* ── Left hero ── */}
        <div className="rg-hero" style={{
          width: '48%', flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 56px',
          background: d ? 'linear-gradient(160deg,rgba(124,58,237,0.07) 0%,transparent 60%)' : 'linear-gradient(160deg,#1e1b4b 0%,#2d1f6e 100%)',
          position: 'relative', zIndex: 1,
        }}>
          {/* Brand mark */}
          <div className="rg-a1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div className="rg-float" style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 28px rgba(124,58,237,0.55)' }}>✂</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>GlowLoox</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Partner Platform</div>
            </div>
          </div>

          {/* Headline */}
          <div className="rg-a2" style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 'clamp(2.2rem,4vw,3.2rem)', fontWeight: 900, color: '#f8fafc', lineHeight: 1.08, letterSpacing: '-2px', margin: 0 }}>
              Your salon,<br />
              <span className="rg-shimmer">fully booked.</span>
            </h1>
          </div>

          <p className="rg-a3" style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 44, maxWidth: 360 }}>
            Join 500+ salon owners managing bookings, revenue, and growth — all from one beautiful dashboard.
          </p>

          {/* Stats */}
          <div className="rg-a4" style={{ display: 'flex', gap: 12, marginBottom: 44, flexWrap: 'wrap' }}>
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="rg-stat" style={{
                padding: '14px 18px', borderRadius: 16, flex: 1, minWidth: 90,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'default',
              }}>
                <Icon size={14} color="rgba(167,139,250,0.8)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Trust */}
          <div className="rg-a5" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {TRUST_ITEMS.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                <Icon size={12} color="rgba(167,139,250,0.7)" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="rg-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Mobile brand */}
            <div className="rg-hero" style={{ display: 'none' }} />
            <div className="rg-a1" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 0 18px rgba(124,58,237,0.45)' }}>✂</div>
              <span style={{ fontSize: 16, fontWeight: 800, color: d ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.5px' }}>GlowLoox</span>
            </div>

            {/* Card */}
            <div className="rg-a2 rg-form-card" style={{
              background: d ? 'rgba(255,255,255,0.035)' : '#ffffff',
              border: `1px solid ${d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              borderRadius: 28,
              padding: '40px 36px 36px',
              boxShadow: d
                ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 32px 80px rgba(124,58,237,0.08), 0 2px 0 rgba(255,255,255,0.8) inset',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}>

              <div style={{ marginBottom: 30 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: d ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.7px', margin: '0 0 7px' }}>
                  Create your account
                </h2>
                <p style={{ fontSize: 14, color: d ? 'rgba(255,255,255,0.4)' : '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Get set up in under 3 minutes. No credit card needed.
                </p>
              </div>

              <PhoneOtpForm
                recaptchaId="reg-recaptcha"
                isDark={d}
                submitLabel="Continue"
                submitIcon={<ArrowRight size={17} />}
                onVerified={handleVerified}
                footerSlot={
                  <p style={{ textAlign: 'center', fontSize: 13, color: d ? 'rgba(255,255,255,0.35)' : '#94a3b8', margin: 0 }}>
                    Already have an account?{' '}
                    <a href={ROUTES.LOGIN} style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>Sign in</a>
                  </p>
                }
              />

            </div>

            {/* Bottom links */}
            <div className="rg-a5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px 16px', flexWrap: 'wrap', marginTop: 22 }}>
              {[
                { href: ROUTES.OWNER_TERMS,   label: 'Terms' },
                { href: ROUTES.OWNER_PRIVACY, label: 'Privacy' },
                { href: 'mailto:glowloox@gmail.com', label: 'Support' },
              ].map(({ href, label }, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <span style={{ color: d ? 'rgba(255,255,255,0.1)' : '#e2e8f0', fontSize: 12 }}>·</span>}
                  <a href={href} style={{ fontSize: 12, color: d ? 'rgba(255,255,255,0.3)' : '#94a3b8', textDecoration: 'none', transition: 'color 0.15s', fontWeight: 500 }}
                    onMouseEnter={e => e.target.style.color = '#a78bfa'}
                    onMouseLeave={e => e.target.style.color = d ? 'rgba(255,255,255,0.3)' : '#94a3b8'}
                  >{label}</a>
                </React.Fragment>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: d ? 'rgba(255,255,255,0.12)' : '#cbd5e1', marginTop: 10 }}>
              © 2026 GlowLoox by Gigamind Technology Pvt Ltd
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
