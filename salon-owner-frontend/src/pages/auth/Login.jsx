import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowRight, Scissors, BarChart2, Users, Calendar, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import ROUTES from '../../routes';

/* ─── CSS animations injected once ─────────────────────────────── */
const LOGIN_CSS = `
  @keyframes lgn-orb1 {
    0%,100%{transform:translate(0,0) scale(1);}
    40%{transform:translate(50px,-60px) scale(1.08);}
    70%{transform:translate(-30px,40px) scale(0.94);}
  }
  @keyframes lgn-orb2 {
    0%,100%{transform:translate(0,0) scale(1);}
    35%{transform:translate(-55px,35px) scale(1.06);}
    65%{transform:translate(35px,-25px) scale(0.96);}
  }
  @keyframes lgn-orb3 {
    0%,100%{transform:translate(0,0) scale(1);}
    50%{transform:translate(25px,45px) scale(1.05);}
  }
  @keyframes lgn-fadeup {
    from{opacity:0;transform:translateY(18px);}
    to{opacity:1;transform:translateY(0);}
  }
  @keyframes lgn-fadein {
    from{opacity:0;}
    to{opacity:1;}
  }
  @keyframes lgn-float {
    0%,100%{transform:translateY(0px);}
    50%{transform:translateY(-8px);}
  }
  @keyframes lgn-shimmer {
    0%{background-position:200% center;}
    100%{background-position:-200% center;}
  }
  @keyframes lgn-spin {
    to{transform:rotate(360deg);}
  }
  .lgn-orb1{animation:lgn-orb1 18s ease-in-out infinite;}
  .lgn-orb2{animation:lgn-orb2 22s ease-in-out infinite;}
  .lgn-orb3{animation:lgn-orb3 14s ease-in-out infinite;}
  .lgn-fu1{animation:lgn-fadeup .6s .0s ease both;}
  .lgn-fu2{animation:lgn-fadeup .6s .1s ease both;}
  .lgn-fu3{animation:lgn-fadeup .6s .2s ease both;}
  .lgn-fu4{animation:lgn-fadeup .6s .3s ease both;}
  .lgn-fu5{animation:lgn-fadeup .6s .4s ease both;}
  .lgn-float{animation:lgn-float 5s ease-in-out infinite;}
  .lgn-shimmer{
    background:linear-gradient(90deg,#a78bfa,#60a5fa,#c4b5fd,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:lgn-shimmer 5s linear infinite;
  }
  .lgn-input{
    width:100%;
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:12px;
    padding:13px 16px 13px 44px;
    color:#f1f5f9;
    font-size:14px;
    outline:none;
    transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;
    font-family:inherit;
  }
  .lgn-input::placeholder{color:#475569;}
  .lgn-input:focus{
    border-color:rgba(139,92,246,0.7);
    background:rgba(255,255,255,0.09);
    box-shadow:0 0 0 3px rgba(139,92,246,0.15);
  }
  .lgn-input.err{border-color:rgba(239,68,68,0.7);}
  .lgn-input.err:focus{box-shadow:0 0 0 3px rgba(239,68,68,0.15);}
  .lgn-btn{
    width:100%;
    padding:14px;
    border-radius:13px;
    font-size:15px;
    font-weight:700;
    background:linear-gradient(135deg,#7c3aed,#3b82f6);
    color:#fff;
    border:none;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    box-shadow:0 0 28px rgba(124,58,237,0.45);
    transition:transform .22s ease,box-shadow .22s ease,opacity .22s ease;
    font-family:inherit;
  }
  .lgn-btn:hover:not(:disabled){transform:scale(1.025);box-shadow:0 0 42px rgba(124,58,237,0.65);}
  .lgn-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
  .lgn-spinner{
    width:18px;height:18px;
    border:2.5px solid rgba(255,255,255,0.3);
    border-top-color:#fff;
    border-radius:50%;
    animation:lgn-spin .7s linear infinite;
    flex-shrink:0;
  }
  .lgn-outline-btn{
    width:100%;
    padding:13px;
    border-radius:13px;
    font-size:14px;
    font-weight:600;
    background:rgba(255,255,255,0.05);
    color:#cbd5e1;
    border:1.5px solid rgba(255,255,255,0.12);
    cursor:pointer;
    transition:background .22s ease,transform .22s ease;
    font-family:inherit;
  }
  .lgn-outline-btn:hover{background:rgba(255,255,255,0.1);transform:scale(1.01);}
  .lgn-link{color:#a78bfa;font-weight:600;text-decoration:none;transition:color .2s ease;}
  .lgn-link:hover{color:#c4b5fd;}
  .lgn-hero-card{
    background:rgba(255,255,255,0.05);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:16px;
    padding:16px 18px;
    display:flex;
    align-items:center;
    gap:14px;
    transition:transform .3s ease,border-color .3s ease;
  }
  .lgn-hero-card:hover{transform:translateX(5px);border-color:rgba(139,92,246,0.4);}
  .lgn-modal-input{
    width:100%;
    background:rgba(255,255,255,0.06);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:11px;
    padding:12px 16px;
    color:#f1f5f9;
    font-size:14px;
    outline:none;
    transition:border-color .2s ease,box-shadow .2s ease;
    font-family:inherit;
  }
  .lgn-modal-input::placeholder{color:#475569;}
  .lgn-modal-input:focus{border-color:rgba(139,92,246,0.6);box-shadow:0 0 0 3px rgba(139,92,246,0.12);}
  /* ── Light mode overrides ── */
  [data-lm] .lgn-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f172a;}
  [data-lm] .lgn-input::placeholder{color:#94a3b8;}
  [data-lm] .lgn-input:focus{border-color:rgba(124,58,237,0.5);background:rgba(0,0,0,0.06);box-shadow:0 0 0 3px rgba(124,58,237,0.1);}
  [data-lm] .lgn-input.err{border-color:rgba(239,68,68,0.55);}
  [data-lm] .lgn-input.err:focus{box-shadow:0 0 0 3px rgba(239,68,68,0.12);}
  [data-lm] .lgn-modal-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f172a;}
  [data-lm] .lgn-modal-input::placeholder{color:#94a3b8;}
  [data-lm] .lgn-modal-input:focus{border-color:rgba(124,58,237,0.5);box-shadow:0 0 0 3px rgba(124,58,237,0.1);}
  [data-lm] .lgn-outline-btn{background:rgba(0,0,0,0.04);color:#475569;border-color:rgba(0,0,0,0.1);}
  [data-lm] .lgn-outline-btn:hover{background:rgba(0,0,0,0.07);}
  [data-lm] .lgn-hero-card{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.1);}
  [data-lm] .lgn-hero-card:hover{border-color:rgba(199,210,254,0.5);}
  [data-lm] .lgn-link{color:#7c3aed;}
  [data-lm] .lgn-link:hover{color:#6d28d9;}
`;

/* ─── Hero feature pills shown on the left side ────────────────── */
const HERO_FEATURES = [
  { icon: Calendar,  color: '#818cf8', label: 'Smart Booking Management'  },
  { icon: BarChart2, color: '#6ee7b7', label: 'Real-time Revenue Analytics' },
  { icon: Users,     color: '#fcd34d', label: 'Customer Relationship Tools' },
  { icon: Scissors,  color: '#f9a8d4', label: 'Service & Staff Control'    },
];

/* ═══════════════════════════════════════════════════════════════ */
const Login = () => {
  const navigate           = useNavigate();
  const { login, user }    = useAuth();
  const { isDark, toggleTheme } = useTheme();

  /* redirect if already logged in */
  useEffect(() => {
    if (user) navigate(ROUTES.DASHBOARD);
  }, [user, navigate]);

  /* ── form state ─────────────────────────────────────────────── */
  const [phone,         setPhone]         = useState('');
  const [phoneError,    setPhoneError]    = useState('');
  const [password,      setPassword]      = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [rememberMe,    setRememberMe]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  /* ── forgot-password state ──────────────────────────────────── */
  const [fpOpen,    setFpOpen]    = useState(false);
  const [fpStep,    setFpStep]    = useState(1);
  const [fpPhone,   setFpPhone]   = useState('');
  const [fpOtp,     setFpOtp]     = useState('');
  const [fpNewPw,   setFpNewPw]   = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpShowPw,  setFpShowPw]  = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError,   setFpError]   = useState('');
  const [fpTimer,   setFpTimer]   = useState(0);

  /* OTP countdown */
  useEffect(() => {
    if (fpTimer <= 0) return;
    const id = setInterval(() => setFpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [fpTimer]);

  /* load remembered phone */
  useEffect(() => {
    const saved = localStorage.getItem('rememberPhone');
    if (saved) { setPhone(saved); setRememberMe(true); }
  }, []);

  /* ── helpers ────────────────────────────────────────────────── */
  const validatePhone = (p) => {
    const d = p.replace(/\D/g, '');
    return d.length === 10 || (d.length === 12 && d.startsWith('91'));
  };

  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 10)                       return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return p.trim();
  };

  /* ── password login ─────────────────────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setPhoneError(''); setPasswordError('');

    let valid = true;
    if (!phone.trim())            { setPhoneError('Phone number is required'); valid = false; }
    else if (!validatePhone(phone)){ setPhoneError('Enter a valid 10-digit phone number'); valid = false; }
    if (!password)                { setPasswordError('Password is required'); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      await login(phone, password);
      if (rememberMe) localStorage.setItem('rememberPhone', phone);
      else            localStorage.removeItem('rememberPhone');
      toast.success('Welcome back! 🎉');
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      const msg = err.message || 'Login failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── forgot password — send OTP ─────────────────────────────── */
  const handleFpSendOtp = async (e) => {
    e.preventDefault();
    setFpError('');
    if (!fpPhone.trim()) { setFpError('Phone number is required'); return; }
    setFpLoading(true);
    try {
      const api = (await import('../../services/api')).default;
      await api.post('/owner/auth/forgot-password/send-otp', { phone: normalizePhone(fpPhone) });
      setFpStep(2); setFpTimer(60);
      toast.success('OTP sent to your phone!');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setFpLoading(false); }
  };

  /* ── forgot password — reset ────────────────────────────────── */
  const handleFpReset = async (e) => {
    e.preventDefault();
    setFpError('');
    if (!fpOtp.trim())              { setFpError('OTP is required'); return; }
    if (!fpNewPw || fpNewPw.length < 8){ setFpError('Password must be at least 8 characters'); return; }
    if (fpNewPw !== fpConfirm)      { setFpError('Passwords do not match'); return; }
    setFpLoading(true);
    try {
      const api = (await import('../../services/api')).default;
      await api.post('/owner/auth/forgot-password/reset', {
        phone: normalizePhone(fpPhone), otp: fpOtp, newPassword: fpNewPw,
      });
      toast.success('Password reset successfully!');
      setFpOpen(false); setFpStep(1);
      setFpPhone(''); setFpOtp(''); setFpNewPw(''); setFpConfirm('');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to reset password');
    } finally { setFpLoading(false); }
  };

  const closeFp = () => { setFpOpen(false); setFpStep(1); setFpError(''); };

  /* ── derived ────────────────────────────────────────────────── */
  const canSubmit = phone.trim() && password && !loading;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{LOGIN_CSS}</style>

      {/* Theme toggle — fixed top-right */}
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle theme"
        style={{
          position:'fixed', top:16, right:16, zIndex:9999,
          width:40, height:40, borderRadius:'50%',
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
          border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)', transition:'all 0.2s ease',
        }}
      >
        {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#475569" />}
      </button>

      {/* ── PAGE WRAPPER ─────────────────────────────────────── */}
      <div data-lm={isDark ? undefined : '1'} style={{ minHeight:'100vh', minHeight:'calc(var(--vh, 1vh) * 100)', background: isDark ? '#06060f' : '#f4f6fb', display:'flex', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>

        {/* Animated background orbs */}
        <div className="lgn-orb1" style={{ position:'absolute', top:'-10%', left:'-5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="lgn-orb2" style={{ position:'absolute', bottom:'-10%', right:'-8%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.16) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="lgn-orb3" style={{ position:'absolute', top:'40%', left:'40%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        {/* ── LEFT HERO PANEL (desktop only) ───────────────────── */}
        <div className="hidden lg:flex" style={{ width:'46%', flexDirection:'column', justifyContent:'center', padding:'60px 56px', position:'relative', zIndex:1, background: isDark ? 'transparent' : 'linear-gradient(160deg,#1e1b4b 0%,#2d1f6e 100%)' }}>

          {/* Logo */}
          <div className="lgn-fu1" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:56 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 0 22px rgba(124,58,237,0.5)' }}>✂</div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>My Salon Bookings</div>
              <div style={{ fontSize:11, color:'#475569', fontWeight:500 }}>Owner Dashboard</div>
            </div>
          </div>

          {/* Headline */}
          <div className="lgn-fu2" style={{ marginBottom:16 }}>
            <h1 style={{ fontSize:'clamp(2rem,3.5vw,3rem)', fontWeight:800, color:'#f8fafc', lineHeight:1.1, letterSpacing:'-1.5px', margin:0 }}>
              Your salon,<br />
              <span className="lgn-shimmer">fully in control.</span>
            </h1>
          </div>
          <p className="lgn-fu3" style={{ fontSize:15, color:'#475569', lineHeight:1.75, marginBottom:44, maxWidth:380 }}>
            One dashboard to manage bookings, track revenue, handle customers, and grow your salon business.
          </p>

          {/* Feature cards */}
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

          {/* Bottom trust line */}
          <p className="lgn-fu5" style={{ marginTop:44, fontSize:12, color:'#1e293b' }}>
            Trusted by <strong style={{ color:'#334155' }}>500+ salon owners</strong> across India · 30-day free trial
          </p>
        </div>

        {/* ── RIGHT FORM PANEL ─────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:440 }}>

            {/* Mobile logo */}
            <div className="flex lg:hidden lgn-fu1 items-center gap-3 justify-center mb-8">
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 18px rgba(124,58,237,0.5)' }}>✂</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color: isDark ? '#f1f5f9' : '#0f172a' }}>My Salon Bookings</div>
                <div style={{ fontSize:11, color:'#64748b' }}>Owner Dashboard</div>
              </div>
            </div>

            {/* ── GLASS CARD ─────────────────────────────────── */}
            <div className="lgn-fu2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', backdropFilter:'blur(24px)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, borderRadius:24, padding:'36px 36px 32px', boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.08)' : '0 32px 80px rgba(0,0,0,0.1)' }}>

              {/* Card header */}
              <div style={{ marginBottom:28 }}>
                <h2 style={{ fontSize:22, fontWeight:800, color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing:'-0.6px', marginBottom:6 }}>Welcome back</h2>
                <p style={{ fontSize:14, color: isDark ? '#475569' : '#64748b', margin:0 }}>Sign in to your owner dashboard</p>
              </div>

              {/* Global error */}
              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:11, padding:'11px 14px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize:13, color:'#fca5a5', fontWeight:600, margin:'0 0 2px' }}>Login failed</p>
                    <p style={{ fontSize:12.5, color:'#f87171', margin:0 }}>{error}</p>
                  </div>
                  <button onClick={() => setError('')} style={{ marginLeft:'auto', color:'#f87171', background:'none', border:'none', cursor:'pointer', fontSize:16, flexShrink:0, lineHeight:1 }}>✕</button>
                </div>
              )}

              {/* Login form */}
              <form onSubmit={handleLogin} noValidate style={{ display:'flex', flexDirection:'column', gap:18 }}>

                {/* Phone */}
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7, letterSpacing:0.2 }}>
                    Phone Number
                  </label>
                  <div style={{ position:'relative' }}>
                    <Phone size={16} color="#475569" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                    <input
                      className={`lgn-input${phoneError ? ' err' : ''}`}
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                      placeholder="98765 43210"
                      disabled={loading}
                      autoComplete="tel"
                      aria-label="Phone number"
                      inputMode="numeric"
                      maxLength={13}
                    />
                  </div>
                  {phoneError && <p style={{ fontSize:12, color:'#f87171', marginTop:5, display:'flex', alignItems:'center', gap:4 }}><span>⚠</span>{phoneError}</p>}
                </div>

                {/* Password */}
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7, letterSpacing:0.2 }}>
                    Password
                  </label>
                  <div style={{ position:'relative' }}>
                    <Lock size={16} color="#475569" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                    <input
                      className={`lgn-input${passwordError ? ' err' : ''}`}
                      style={{ paddingRight:46 }}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Enter your password"
                      disabled={loading}
                      autoComplete="current-password"
                      aria-label="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#475569', padding:2, display:'flex', alignItems:'center' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {passwordError && <p style={{ fontSize:12, color:'#f87171', marginTop:5, display:'flex', alignItems:'center', gap:4 }}><span>⚠</span>{passwordError}</p>}
                </div>

                {/* Remember me + Forgot password */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                    <div
                      onClick={() => setRememberMe(v => !v)}
                      style={{
                        width:18, height:18, borderRadius:5, border: rememberMe ? 'none' : `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                        background: rememberMe ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                        transition:'all .2s ease', flexShrink:0,
                      }}
                    >
                      {rememberMe && <span style={{ color:'#fff', fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color: isDark ? '#64748b' : '#475569', userSelect:'none' }}>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setFpOpen(true); setFpPhone(phone); setFpError(''); }}
                    className="lgn-link"
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, padding:0 }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button type="submit" className="lgn-btn" disabled={!canSubmit} style={{ marginTop:4 }}>
                  {loading
                    ? <><div className="lgn-spinner" /> Signing in…</>
                    : <>Sign In <ArrowRight size={17} /></>
                  }
                </button>
              </form>

              {/* Divider */}
              <div style={{ display:'flex', alignItems:'center', gap:14, margin:'24px 0' }}>
                <div style={{ flex:1, height:1, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)' }} />
                <span style={{ fontSize:12, color: isDark ? '#334155' : '#94a3b8', fontWeight:500 }}>OR</span>
                <div style={{ flex:1, height:1, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)' }} />
              </div>

              {/* Register */}
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:13.5, color: isDark ? '#475569' : '#64748b', marginBottom:12 }}>Don't have an account?</p>
                <a href={ROUTES.REGISTER} className="lgn-outline-btn" style={{ display:'block', textDecoration:'none' }}>
                  Create Free Account → 30-Day Trial
                </a>
              </div>

            </div>
            {/* end card */}

            {/* Footer links */}
            <div className="lgn-fu3" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'6px 20px', marginTop:24 }}>
              <a href={ROUTES.OWNER_TERMS}   className="lgn-link" style={{ fontSize:12 }}>Terms &amp; Conditions</a>
              <span style={{ color: isDark ? '#1e293b' : '#94a3b8', fontSize:12 }}>·</span>
              <a href={ROUTES.OWNER_PRIVACY} className="lgn-link" style={{ fontSize:12 }}>Privacy Policy</a>
              <span style={{ color: isDark ? '#1e293b' : '#94a3b8', fontSize:12 }}>·</span>
              <a href="mailto:support@mysalonbookings.com" className="lgn-link" style={{ fontSize:12 }}>Contact Support</a>
            </div>
            <p style={{ textAlign:'center', fontSize:11.5, color: isDark ? '#1e293b' : '#94a3b8', marginTop:14 }}>
              © 2026 My Salon Bookings by Gigamind Technology Pvt Ltd
            </p>

          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ────────────────────────────────── */}
      {fpOpen && (
        <div
          style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeFp(); }}
        >
          <div style={{ background:'rgba(15,15,28,0.97)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, padding:'32px 28px', width:'100%', maxWidth:400, boxShadow:'0 40px 100px rgba(0,0,0,0.6)', animation:'lgn-fadeup .4s ease both' }}>

            {/* Modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <div>
                <h3 style={{ fontSize:18, fontWeight:800, color:'#f1f5f9', margin:'0 0 4px' }}>
                  {fpStep === 1 ? 'Reset Password' : 'Enter New Password'}
                </h3>
                <p style={{ fontSize:12.5, color:'#475569', margin:0 }}>
                  {fpStep === 1 ? 'We\'ll send an OTP to your phone' : `OTP sent to ${fpPhone}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFp}
                style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}
              >✕</button>
            </div>

            {/* Steps indicator */}
            <div style={{ display:'flex', gap:6, marginBottom:24 }}>
              {[1,2].map(s => (
                <div key={s} style={{ flex:1, height:3, borderRadius:3, background: s <= fpStep ? 'linear-gradient(90deg,#7c3aed,#3b82f6)' : 'rgba(255,255,255,0.08)', transition:'background .3s ease' }} />
              ))}
            </div>

            {/* Error */}
            {fpError && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 13px', marginBottom:18, fontSize:13, color:'#f87171' }}>
                {fpError}
              </div>
            )}

            {fpStep === 1 ? (
              <form onSubmit={handleFpSendOtp} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ position:'relative' }}>
                  <Phone size={15} color="#475569" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    className="lgn-modal-input"
                    style={{ paddingLeft:38 }}
                    type="tel"
                    value={fpPhone}
                    onChange={e => setFpPhone(e.target.value)}
                    placeholder="Registered phone number"
                    disabled={fpLoading}
                    inputMode="numeric"
                  />
                </div>
                <button type="submit" className="lgn-btn" disabled={fpLoading || !fpPhone.trim()}>
                  {fpLoading ? <><div className="lgn-spinner" /> Sending OTP…</> : 'Send OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleFpReset} style={{ display:'flex', flexDirection:'column', gap:13 }}>
                <input
                  className="lgn-modal-input"
                  type="text"
                  value={fpOtp}
                  onChange={e => setFpOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  maxLength={6}
                  disabled={fpLoading}
                  inputMode="numeric"
                  style={{ letterSpacing:4, textAlign:'center', fontSize:18, fontWeight:700 }}
                />
                <div style={{ position:'relative' }}>
                  <Lock size={15} color="#475569" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input
                    className="lgn-modal-input"
                    style={{ paddingLeft:38, paddingRight:40 }}
                    type={fpShowPw ? 'text' : 'password'}
                    value={fpNewPw}
                    onChange={e => setFpNewPw(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    disabled={fpLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setFpShowPw(v => !v)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#475569', display:'flex', alignItems:'center' }}
                  >
                    {fpShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <input
                  className="lgn-modal-input"
                  type="password"
                  value={fpConfirm}
                  onChange={e => setFpConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={fpLoading}
                />
                <button type="submit" className="lgn-btn" disabled={fpLoading}>
                  {fpLoading ? <><div className="lgn-spinner" /> Resetting…</> : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={fpTimer === 0 ? handleFpSendOtp : undefined}
                  disabled={fpTimer > 0 || fpLoading}
                  style={{ background:'none', border:'none', cursor: fpTimer > 0 ? 'not-allowed' : 'pointer', fontSize:13, color: fpTimer > 0 ? '#334155' : '#a78bfa', fontWeight:600, padding:'4px 0', transition:'color .2s ease', fontFamily:'inherit' }}
                >
                  {fpTimer > 0 ? `Resend OTP in ${fpTimer}s` : 'Resend OTP'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
