import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Phone, ArrowRight, Scissors, BarChart2, Users, Calendar, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import ROUTES from '../../routes';

const REG_CSS = `
  @keyframes lgn-orb1{0%,100%{transform:translate(0,0) scale(1);}40%{transform:translate(50px,-60px) scale(1.08);}70%{transform:translate(-30px,40px) scale(0.94);}}
  @keyframes lgn-orb2{0%,100%{transform:translate(0,0) scale(1);}35%{transform:translate(-55px,35px) scale(1.06);}65%{transform:translate(35px,-25px) scale(0.96);}}
  @keyframes lgn-orb3{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(25px,45px) scale(1.05);}}
  @keyframes lgn-fadeup{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lgn-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  @keyframes lgn-spin{to{transform:rotate(360deg);}}
  @keyframes lgn-slide{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);}}
  .lgn-orb1{animation:lgn-orb1 18s ease-in-out infinite;}
  .lgn-orb2{animation:lgn-orb2 22s ease-in-out infinite;}
  .lgn-orb3{animation:lgn-orb3 14s ease-in-out infinite;}
  .lgn-fu1{animation:lgn-fadeup .6s .0s ease both;}
  .lgn-fu2{animation:lgn-fadeup .6s .1s ease both;}
  .lgn-fu3{animation:lgn-fadeup .6s .2s ease both;}
  .lgn-fu4{animation:lgn-fadeup .6s .3s ease both;}
  .lgn-fu5{animation:lgn-fadeup .6s .4s ease both;}
  .lgn-slide{animation:lgn-slide .35s ease both;}
  .lgn-shimmer{background:linear-gradient(90deg,#a78bfa,#60a5fa,#c4b5fd,#a78bfa);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lgn-shimmer 5s linear infinite;}
  .lgn-input{width:100%;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:13px 16px 13px 44px;color:#f1f5f9;font-size:16px;outline:none;transition:border-color .2s,background .2s,box-shadow .2s;font-family:inherit;}
  .lgn-input::placeholder{color:#475569;}
  .lgn-input:focus{border-color:rgba(139,92,246,0.7);background:rgba(255,255,255,0.09);box-shadow:0 0 0 3px rgba(139,92,246,0.15);}
  .lgn-btn{width:100%;padding:14px;border-radius:13px;font-size:15px;font-weight:700;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 0 28px rgba(124,58,237,0.45);transition:transform .22s,box-shadow .22s,opacity .22s;font-family:inherit;}
  .lgn-btn:hover:not(:disabled){transform:scale(1.025);box-shadow:0 0 42px rgba(124,58,237,0.65);}
  .lgn-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
  .lgn-spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:lgn-spin .7s linear infinite;flex-shrink:0;}
  .lgn-hero-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;transition:transform .3s,border-color .3s;}
  .lgn-hero-card:hover{transform:translateX(5px);border-color:rgba(139,92,246,0.4);}
  @media(max-width:480px){.lgn-card{padding:24px 20px 20px!important;}.lgn-form-panel{padding:20px 14px!important;}}
  [data-lm] .lgn-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f172a;}
  [data-lm] .lgn-input::placeholder{color:#94a3b8;}
  [data-lm] .lgn-input:focus{border-color:rgba(124,58,237,0.5);background:rgba(0,0,0,0.06);box-shadow:0 0 0 3px rgba(124,58,237,0.1);}
  [data-lm] .lgn-hero-card{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.1);}
  [data-lm] .lgn-hero-card:hover{border-color:rgba(199,210,254,0.5);}
`;

const HERO_FEATURES = [
  { icon: Calendar,  color: '#818cf8', label: 'Smart Booking Management'   },
  { icon: BarChart2, color: '#6ee7b7', label: 'Real-time Revenue Analytics' },
  { icon: Users,     color: '#fcd34d', label: 'Customer Relationship Tools' },
  { icon: Scissors,  color: '#f9a8d4', label: 'Service & Staff Control'     },
];

const Register = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    if (user.status === 'mobile_verified') navigate(ROUTES.ONBOARDING, { replace: true });
    else if (user.status === 'pending_approval' || user.status === 'salon_registered') navigate(ROUTES.APPROVAL_WAITING, { replace: true });
    else navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, navigate]);

  const [step,     setStep]     = useState(1);
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState(['','','','','','']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const otpRefs      = useRef([]);
  const recaptchaRef = useRef(null);
  const confirmRef   = useRef(null);

  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 120);
  }, [step]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'reg-recaptcha';
    document.body.appendChild(container);
    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'reg-recaptcha', { size: 'invisible' });
      recaptchaRef.current.render();
    } catch {}
    return () => {
      try { recaptchaRef.current?.clear(); } catch {}
      recaptchaRef.current = null;
      document.getElementById('reg-recaptcha')?.remove();
    };
  }, []);

  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return p.trim();
  };

  const getRecaptchaVerifier = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    try { document.getElementById('reg-recaptcha')?.remove(); } catch {}
    const container = document.createElement('div');
    container.id = 'reg-recaptcha';
    document.body.appendChild(container);
    recaptchaRef.current = new RecaptchaVerifier(auth, 'reg-recaptcha', { size: 'invisible' });
    return recaptchaRef.current;
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g,'').length < 10) {
      setError('Enter a valid 10-digit phone number'); return;
    }
    setError(''); setLoading(true);
    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, normalizePhone(phone), verifier);
      confirmRef.current = confirmation;
      setStep(2); setOtpTimer(60);
      toast.success('OTP sent!');
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
      try { recaptchaRef.current?.clear(); } catch {}
      recaptchaRef.current = null;
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e, codeOverride) => {
    e?.preventDefault();
    const code = codeOverride ?? otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit OTP.'); return; }
    if (!confirmRef.current) { setError('Session expired. Please resend OTP.'); return; }
    setError(''); setLoading(true);
    try {
      const result = await confirmRef.current.confirm(code);
      const firebaseToken = await result.user.getIdToken();
      const data = await register(firebaseToken);
      const ownerStatus = data?.data?.owner?.status;
      if (ownerStatus === 'mobile_verified') {
        navigate(ROUTES.ONBOARDING, { replace: true, state: { phone: normalizePhone(phone), firebaseToken } });
      } else if (ownerStatus === 'pending_approval' || ownerStatus === 'salon_registered') {
        navigate(ROUTES.APPROVAL_WAITING, { replace: true });
      } else {
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (err) {
      const msg = err.message || 'Verification failed.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (otp[i]) { const n=[...otp]; n[i]=''; setOtp(n); }
      else if (i > 0) otpRefs.current[i-1]?.focus();
    }
  };
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g,'').slice(-1);
    const n=[...otp]; n[i]=digit; setOtp(n);
    if (digit && i < 5) otpRefs.current[i+1]?.focus();
    const full = [...n].join('');
    if (i === 5 && digit && full.length === 6)
      setTimeout(() => handleVerifyOtp(null, full).catch(err => { setError(err?.message || 'Verification failed.'); }), 80);
  };

  const c = isDark;

  return (
    <>
      <style>{REG_CSS}</style>

      <button onClick={toggleTheme} type="button" title={isDark ? 'Light mode' : 'Dark mode'}
        style={{ position:'fixed', top:16, right:16, zIndex:9999, width:40, height:40, borderRadius:'50%',
          background: c ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
          border: c ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)', transition:'all 0.2s',
        }}>
        {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#475569" />}
      </button>

      <div data-lm={c ? undefined : '1'} style={{ minHeight:'100vh', background: c ? '#06060f' : '#f4f6fb', display:'flex', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>

        <div className="lgn-orb1" style={{ position:'absolute', top:'-10%', left:'-5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="lgn-orb2" style={{ position:'absolute', bottom:'-10%', right:'-8%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.16) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="lgn-orb3" style={{ position:'absolute', top:'40%', left:'40%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        {/* Left hero panel */}
        <div className="hidden lg:flex" style={{ width:'46%', flexDirection:'column', justifyContent:'center', padding:'60px 56px', position:'relative', zIndex:1, background: c ? 'transparent' : 'linear-gradient(160deg,#1e1b4b 0%,#2d1f6e 100%)' }}>
          <div className="lgn-fu1" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:56 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 0 22px rgba(124,58,237,0.5)' }}>✂</div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>GlowLoox</div>
              <div style={{ fontSize:11, color:'#475569', fontWeight:500 }}>GlowLoox Partner</div>
            </div>
          </div>
          <div className="lgn-fu2" style={{ marginBottom:16 }}>
            <h1 style={{ fontSize:'clamp(2rem,3.5vw,3rem)', fontWeight:800, color:'#f8fafc', lineHeight:1.1, letterSpacing:'-1.5px', margin:0 }}>
              Grow your salon<br /><span className="lgn-shimmer">with GlowLoox.</span>
            </h1>
          </div>
          <p className="lgn-fu3" style={{ fontSize:15, color:'#475569', lineHeight:1.75, marginBottom:44, maxWidth:380 }}>
            Join thousands of salon owners managing bookings, revenue, and customers — all from one dashboard.
          </p>
          <div className="lgn-fu4" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {HERO_FEATURES.map(({ icon: Icon, color, label }) => (
              <div key={label} className="lgn-hero-card">
                <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ fontSize:13.5, color:'#94a3b8', fontWeight:500 }}>{label}</span>
              </div>
            ))}
          </div>
          <p className="lgn-fu5" style={{ marginTop:44, fontSize:12, color:'#1e293b' }}>
            Trusted by <strong style={{ color:'#334155' }}>500+ salon owners</strong> across India
          </p>
        </div>

        {/* Right form panel */}
        <div className="lgn-form-panel" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:440 }}>

            {/* Mobile logo */}
            <div className="flex lg:hidden lgn-fu1 items-center gap-3 justify-center mb-8">
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 18px rgba(124,58,237,0.5)' }}>✂</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color: c ? '#f1f5f9' : '#0f172a' }}>GlowLoox</div>
                <div style={{ fontSize:11, color:'#64748b' }}>GlowLoox Partner</div>
              </div>
            </div>

            <div className="lgn-fu2 lgn-card" style={{ background: c ? 'rgba(255,255,255,0.04)' : '#ffffff', backdropFilter:'blur(24px)', border:`1px solid ${c ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, borderRadius:24, padding:'36px 36px 32px', boxShadow: c ? '0 32px 80px rgba(0,0,0,0.5),0 0 60px rgba(124,58,237,0.08)' : '0 32px 80px rgba(0,0,0,0.1)' }}>

              <div style={{ marginBottom:28 }}>
                <h2 style={{ fontSize:22, fontWeight:800, color: c ? '#f1f5f9' : '#0f172a', letterSpacing:'-0.6px', marginBottom:6 }}>
                  {step === 1 ? 'Create your account' : 'Verify your number'}
                </h2>
                <p style={{ fontSize:14, color: c ? '#475569' : '#64748b', margin:0 }}>
                  {step === 1 ? 'Register as a GlowLoox Partner' : `OTP sent to +91 ${phone}`}
                </p>
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:11, padding:'11px 14px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>⚠️</span>
                  <p style={{ fontSize:13, color:'#f87171', margin:0 }}>{error}</p>
                  <button onClick={() => setError('')} style={{ marginLeft:'auto', color:'#f87171', background:'none', border:'none', cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
                </div>
              )}

              {/* Step 1 — Phone */}
              {step === 1 && (
                <form key="step1" className="lgn-slide" onSubmit={handleSendOtp} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: c ? '#94a3b8' : '#64748b', marginBottom:7 }}>
                      Phone Number
                    </label>
                    <div style={{ position:'relative' }}>
                      <Phone size={16} color="#475569" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                      <input
                        className="lgn-input"
                        type="tel"
                        value={phone}
                        onChange={e => { setPhone(e.target.value.replace(/\D/g,'').slice(0,10)); setError(''); }}
                        placeholder="98765 43210"
                        disabled={loading}
                        inputMode="numeric"
                        maxLength={10}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button type="submit" className="lgn-btn" disabled={loading || phone.replace(/\D/g,'').length < 10}>
                    {loading ? <><div className="lgn-spinner" /> Sending OTP…</> : <>Send OTP <ArrowRight size={17} /></>}
                  </button>

                  <p style={{ textAlign:'center', fontSize:13, color: c ? '#475569' : '#64748b', margin:0 }}>
                    Already have an account?{' '}
                    <a href={ROUTES.LOGIN} style={{ color:'#a78bfa', fontWeight:600, textDecoration:'none' }}>Sign in</a>
                  </p>
                </form>
              )}

              {/* Step 2 — OTP */}
              {step === 2 && (
                <form key="step2" className="lgn-slide" onSubmit={handleVerifyOtp} style={{ display:'flex', flexDirection:'column', gap:20 }}>

                  <div style={{ textAlign:'center', padding:'4px 0', fontSize:38 }}>📱</div>

                  <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                    {otp.map((digit, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        style={{ width:50, height:58, borderRadius:14, textAlign:'center', fontSize:22, fontWeight:800, outline:'none',
                          background: digit ? (c ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)') : (c ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                          border: digit ? '1.5px solid rgba(99,102,241,0.4)' : `1.5px solid ${c ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          color: c ? '#f1f5f9' : '#0f172a',
                          transition:'all 0.18s', fontFamily:'inherit', boxSizing:'border-box',
                        }} />
                    ))}
                  </div>

                  <button type="submit" className="lgn-btn" disabled={loading || otp.join('').length < 6}>
                    {loading ? <><div className="lgn-spinner" /> Verifying…</> : 'Verify & Continue'}
                  </button>

                  <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
                    {otpTimer > 0 ? (
                      <p style={{ fontSize:13, color: c ? '#475569' : '#64748b' }}>
                        Resend in <span style={{ fontWeight:700, color: c ? '#94a3b8' : '#475569' }}>{otpTimer}s</span>
                      </p>
                    ) : (
                      <button type="button" onClick={handleSendOtp} disabled={loading}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:13.5, color:'#a78bfa', fontWeight:600, fontFamily:'inherit' }}>
                        Resend OTP
                      </button>
                    )}
                    <button type="button" onClick={() => { setStep(1); setOtp(['','','','','','']); setError(''); }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color: c ? '#475569' : '#94a3b8', textDecoration:'underline', fontFamily:'inherit' }}>
                      Change phone number
                    </button>
                  </div>
                </form>
              )}

            </div>

            <div className="lgn-fu3" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'6px 20px', marginTop:24 }}>
              <a href={ROUTES.OWNER_TERMS}   style={{ fontSize:12, color:'#a78bfa', textDecoration:'none' }}>Terms &amp; Conditions</a>
              <span style={{ color: c ? '#1e293b' : '#94a3b8', fontSize:12 }}>·</span>
              <a href={ROUTES.OWNER_PRIVACY} style={{ fontSize:12, color:'#a78bfa', textDecoration:'none' }}>Privacy Policy</a>
              <span style={{ color: c ? '#1e293b' : '#94a3b8', fontSize:12 }}>·</span>
              <a href="mailto:glowloox@gmail.com" style={{ fontSize:12, color:'#a78bfa', textDecoration:'none' }}>Contact Support</a>
            </div>
            <p style={{ textAlign:'center', fontSize:11.5, color: c ? '#1e293b' : '#94a3b8', marginTop:14 }}>
              © 2026 GlowLoox by Gigamind Technology Pvt Ltd
            </p>

          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
