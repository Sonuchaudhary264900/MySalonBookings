import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Eye, EyeOff, Phone, ArrowRight, Check, User, Mail, Gift, Scissors, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../config/firebase';
import ROUTES from '../../routes';

/* ─── CSS animations ────────────────────────────────────────────── */
const REG_CSS = `
  @keyframes reg-orb1 {
    0%,100%{transform:translate(0,0) scale(1);}
    40%{transform:translate(55px,-55px) scale(1.08);}
    70%{transform:translate(-28px,35px) scale(0.94);}
  }
  @keyframes reg-orb2 {
    0%,100%{transform:translate(0,0) scale(1);}
    35%{transform:translate(-60px,40px) scale(1.06);}
    65%{transform:translate(38px,-22px) scale(0.96);}
  }
  @keyframes reg-orb3 {
    0%,100%{transform:translate(0,0) scale(1);}
    50%{transform:translate(20px,40px) scale(1.04);}
  }
  @keyframes reg-fadeup {
    from{opacity:0;transform:translateY(18px);}
    to{opacity:1;transform:translateY(0);}
  }
  @keyframes reg-fadein {
    from{opacity:0;}
    to{opacity:1;}
  }
  @keyframes reg-shimmer {
    0%{background-position:200% center;}
    100%{background-position:-200% center;}
  }
  @keyframes reg-spin {
    to{transform:rotate(360deg);}
  }
  @keyframes reg-pulse {
    0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.4);}
    50%{box-shadow:0 0 0 8px rgba(124,58,237,0);}
  }
  .reg-orb1{animation:reg-orb1 18s ease-in-out infinite;}
  .reg-orb2{animation:reg-orb2 22s ease-in-out infinite;}
  .reg-orb3{animation:reg-orb3 14s ease-in-out infinite;}
  .reg-fu1{animation:reg-fadeup .55s .0s ease both;}
  .reg-fu2{animation:reg-fadeup .55s .1s ease both;}
  .reg-fu3{animation:reg-fadeup .55s .2s ease both;}
  .reg-fu4{animation:reg-fadeup .55s .3s ease both;}
  .reg-step{animation:reg-fadein .4s ease both;}
  .reg-shimmer{
    background:linear-gradient(90deg,#a78bfa,#60a5fa,#c4b5fd,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:reg-shimmer 5s linear infinite;
  }

  /* inputs */
  .reg-input{
    width:100%;
    background:rgba(255,255,255,0.055);
    border:1.5px solid rgba(255,255,255,0.1);
    border-radius:12px;
    padding:13px 16px 13px 44px;
    color:#f1f5f9;
    font-size:14px;
    outline:none;
    transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;
    font-family:inherit;
  }
  .reg-input::placeholder{color:#475569;}
  .reg-input:focus{
    border-color:rgba(139,92,246,0.7);
    background:rgba(255,255,255,0.09);
    box-shadow:0 0 0 3px rgba(139,92,246,0.15);
  }
  .reg-input.err{border-color:rgba(239,68,68,0.7);}
  .reg-input.err:focus{box-shadow:0 0 0 3px rgba(239,68,68,0.15);}
  .reg-input-no-icon{padding-left:16px;}

  /* OTP boxes */
  .reg-otp-box{
    width:48px;height:56px;
    background:rgba(255,255,255,0.055);
    border:1.5px solid rgba(255,255,255,0.12);
    border-radius:12px;
    color:#f1f5f9;
    font-size:22px;
    font-weight:800;
    text-align:center;
    outline:none;
    transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;
    font-family:inherit;
    letter-spacing:0;
    caret-color:transparent;
  }
  .reg-otp-box:focus{
    border-color:rgba(139,92,246,0.8);
    background:rgba(139,92,246,0.1);
    box-shadow:0 0 0 3px rgba(139,92,246,0.2);
  }
  .reg-otp-box.filled{
    border-color:rgba(139,92,246,0.5);
    background:rgba(139,92,246,0.08);
  }
  .reg-otp-box.err-box{border-color:rgba(239,68,68,0.7);}

  /* buttons */
  .reg-btn{
    width:100%;padding:14px;
    border-radius:13px;font-size:15px;font-weight:700;
    background:linear-gradient(135deg,#7c3aed,#3b82f6);
    color:#fff;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:10px;
    box-shadow:0 0 28px rgba(124,58,237,0.45);
    transition:transform .22s ease,box-shadow .22s ease,opacity .22s ease;
    font-family:inherit;
  }
  .reg-btn:hover:not(:disabled){transform:scale(1.025);box-shadow:0 0 42px rgba(124,58,237,0.65);}
  .reg-btn:disabled{opacity:0.55;cursor:not-allowed;transform:none;}
  .reg-btn-outline{
    width:100%;padding:13px;
    border-radius:13px;font-size:14px;font-weight:600;
    background:rgba(255,255,255,0.05);
    color:#cbd5e1;
    border:1.5px solid rgba(255,255,255,0.12);
    cursor:pointer;
    transition:background .22s ease,transform .22s ease;
    font-family:inherit;
  }
  .reg-btn-outline:hover{background:rgba(255,255,255,0.1);transform:scale(1.01);}
  .reg-spinner{
    width:18px;height:18px;
    border:2.5px solid rgba(255,255,255,0.3);
    border-top-color:#fff;
    border-radius:50%;
    animation:reg-spin .7s linear infinite;
    flex-shrink:0;
  }
  .reg-link{color:#a78bfa;font-weight:600;text-decoration:none;transition:color .2s ease;}
  .reg-link:hover{color:#c4b5fd;}
  .reg-ghost-btn{
    background:none;border:none;cursor:pointer;
    color:#475569;font-family:inherit;
    transition:color .2s ease;
  }
  .reg-ghost-btn:hover{color:#a78bfa;}

  /* password strength bar */
  .pw-bar{
    height:4px;border-radius:4px;
    transition:width .4s ease,background .4s ease;
  }
  /* ── Light mode overrides ── */
  [data-lm] .reg-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f172a;}
  [data-lm] .reg-input::placeholder{color:#94a3b8;}
  [data-lm] .reg-input:focus{border-color:rgba(124,58,237,0.5);background:rgba(0,0,0,0.06);box-shadow:0 0 0 3px rgba(124,58,237,0.1);}
  [data-lm] .reg-input.err{border-color:rgba(239,68,68,0.55);}
  [data-lm] .reg-input.err:focus{box-shadow:0 0 0 3px rgba(239,68,68,0.12);}
  [data-lm] .reg-btn-outline{background:rgba(0,0,0,0.04);color:#475569;border-color:rgba(0,0,0,0.1);}
  [data-lm] .reg-btn-outline:hover{background:rgba(0,0,0,0.07);}
  [data-lm] .reg-link{color:#7c3aed;}
  [data-lm] .reg-link:hover{color:#6d28d9;}
  [data-lm] .reg-ghost-btn{color:#64748b;}
  [data-lm] .reg-ghost-btn:hover{color:#7c3aed;}
  [data-lm] .reg-otp-box{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.15);color:#0f172a;}
  [data-lm] .reg-otp-box:focus{border-color:rgba(124,58,237,0.6);background:rgba(124,58,237,0.06);box-shadow:0 0 0 3px rgba(124,58,237,0.12);}
  [data-lm] .reg-otp-box.filled{border-color:rgba(124,58,237,0.5);background:rgba(124,58,237,0.08);color:#0f172a;}
  [data-lm] .reg-otp-box.err-box{border-color:rgba(239,68,68,0.6);}
`;

/* ─── Password strength helper ──────────────────────────────────── */
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: 'transparent', width: '0%' };
  let s = 0;
  if (pw.length >= 8)              s++;
  if (/[A-Z]/.test(pw))           s++;
  if (/[a-z]/.test(pw))           s++;
  if (/\d/.test(pw))              s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  const map = [
    { label: '', color: 'transparent', width: '0%' },
    { label: 'Very weak',  color: '#ef4444', width: '20%' },
    { label: 'Weak',       color: '#f97316', width: '40%' },
    { label: 'Fair',       color: '#eab308', width: '60%' },
    { label: 'Strong',     color: '#22c55e', width: '80%' },
    { label: 'Very strong',color: '#10b981', width: '100%' },
  ];
  return map[s];
};

/* ─── Step labels ───────────────────────────────────────────────── */
const STEPS = [
  { n: 1, label: 'Phone'   },
  { n: 2, label: 'Verify'  },
  { n: 3, label: 'Profile' },
];

/* ══════════════════════════════════════════════════════════════════ */
const Register = () => {
  const navigate              = useNavigate();
  const { register, user }    = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) navigate(ROUTES.DASHBOARD);
  }, [user, navigate]);

  /* ── step ─────────────────────────────────────────────────────── */
  const [step,  setStep]  = useState(1);
  const [error, setError] = useState('');

  /* ── step 1: phone ────────────────────────────────────────────── */
  const [phoneNumber,  setPhoneNumber]  = useState('');
  const [phoneError,   setPhoneError]   = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  /* ── step 2: otp ──────────────────────────────────────────────── */
  const [otpDigits,  setOtpDigits]  = useState(['','','','','','']);
  const [otpError,   setOtpError]   = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer,   setOtpTimer]   = useState(0);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  /* ── step 3: profile ──────────────────────────────────────────── */
  const [name,           setName]           = useState('');
  const [nameError,      setNameError]      = useState('');
  const [gender,         setGender]         = useState('');
  const [genderError,    setGenderError]    = useState('');
  const [email,          setEmail]          = useState('');
  const [emailError,     setEmailError]     = useState('');
  const [password,       setPassword]       = useState('');
  const [passwordError,  setPasswordError]  = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [confirmPw,      setConfirmPw]      = useState('');
  const [confirmError,   setConfirmError]   = useState('');
  const [showConfirmPw,  setShowConfirmPw]  = useState(false);
  const [referralCode,   setReferralCode]   = useState('');
  const [agreedToTerms,  setAgreedToTerms]  = useState(false);
  const [regLoading,     setRegLoading]     = useState(false);

  /* ── firebase refs ────────────────────────────────────────────── */
  const recaptchaVerifierRef  = useRef(null);
  const confirmationResultRef = useRef(null);
  const firebaseTokenRef      = useRef('');

  /* ── OTP countdown ────────────────────────────────────────────── */
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  /* ── recaptcha cleanup ────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      try { recaptchaVerifierRef.current?.clear(); } catch {}
      document.getElementById('recaptcha-container')?.remove();
    };
  }, []);

  /* ── helpers ──────────────────────────────────────────────────── */
  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 10)                       return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    if (p.startsWith('+'))                     return p;
    return `+${d}`;
  };

  const validatePhone = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 10)                       return /^[6-9]\d{9}$/.test(d);
    if (d.length === 12 && d.startsWith('91')) return /^91[6-9]\d{9}$/.test(d);
    return false;
  };

  const getRecaptcha = () => {
    try { recaptchaVerifierRef.current?.clear(); } catch {}
    recaptchaVerifierRef.current = null;
    document.getElementById('recaptcha-container')?.remove();
    const container = document.createElement('div');
    container.id = 'recaptcha-container';
    document.body.appendChild(container);
    const v = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    recaptchaVerifierRef.current = v;
    return v;
  };

  const otp = otpDigits.join('');

  /* ── OTP box handlers ─────────────────────────────────────────── */
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    setOtpError('');
    if (digit && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[idx] && idx > 0) {
        const next = [...otpDigits];
        next[idx - 1] = '';
        setOtpDigits(next);
        otpRefs[idx - 1].current?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      otpRefs[idx + 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) next[i] = text[i] || '';
    setOtpDigits(next);
    const focusIdx = Math.min(text.length, 5);
    otpRefs[focusIdx].current?.focus();
  };

  /* ── Step 1: send OTP ─────────────────────────────────────────── */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError(''); setPhoneError('');
    if (!phoneNumber.trim()) { setPhoneError('Phone number is required'); return; }
    if (!validatePhone(phoneNumber)) { setPhoneError('Enter a valid 10-digit Indian mobile number'); return; }
    setPhoneLoading(true);
    try {
      const normalized = normalizePhone(phoneNumber);
      const verifier   = getRecaptcha();
      await verifier.render();
      const confirmation = await signInWithPhoneNumber(auth, normalized, verifier);
      confirmationResultRef.current = confirmation;
      setStep(2);
      setOtpTimer(60);
      setOtpDigits(['','','','','','']);
      toast.success(`OTP sent to ${normalized}`);
      setTimeout(() => otpRefs[0].current?.focus(), 300);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  /* ── Step 2: verify OTP ───────────────────────────────────────── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setOtpError('');
    if (otp.length !== 6) { setOtpError('Please enter all 6 digits'); return; }
    setOtpLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp);
      firebaseTokenRef.current = await result.user.getIdToken();
      setStep(3);
      toast.success('Phone verified! ✓');
    } catch {
      setOtpError('Invalid OTP. Please check and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── Step 3: register ─────────────────────────────────────────── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setNameError(''); setGenderError('');
    setEmailError(''); setPasswordError(''); setConfirmError('');

    let valid = true;
    if (!name.trim())  { setNameError('Full name is required'); valid = false; }
    if (!gender)       { setGenderError('Please select your gender'); valid = false; }
    if (!email.trim()) { setEmailError('Email is required'); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email address'); valid = false; }
    if (!password)              { setPasswordError('Password is required'); valid = false; }
    else if (password.length < 8) { setPasswordError('Password must be at least 8 characters'); valid = false; }
    if (!confirmPw)            { setConfirmError('Please confirm your password'); valid = false; }
    else if (password !== confirmPw) { setConfirmError('Passwords do not match'); valid = false; }
    if (!agreedToTerms) { setError('Please accept the Terms & Conditions and Privacy Policy to continue.'); valid = false; }
    if (!valid) return;

    setRegLoading(true);
    try {
      const { token } = await register(firebaseTokenRef.current, name.trim(), email.trim().toLowerCase(), password, gender);
      if (referralCode.trim() && token) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL || 'https://mysalonbookings.onrender.com/api/v1'}/owner/referral/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ code: referralCode.trim() }),
          });
        } catch {}
      }
      toast.success('Registration successful! 🎉');
      navigate(ROUTES.SALON_REGISTER);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const pwStrength = getStrength(password);

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{REG_CSS}</style>

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

      {/* ── PAGE ──────────────────────────────────────────────── */}
      <div data-lm={isDark ? undefined : '1'} style={{ minHeight:'100vh', background: isDark ? '#06060f' : '#f4f6fb', display:'flex', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>

        {/* Orbs */}
        <div className="reg-orb1" style={{ position:'absolute', top:'-10%', left:'-6%', width:580, height:580, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.22) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="reg-orb2" style={{ position:'absolute', bottom:'-12%', right:'-8%', width:660, height:660, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.17) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="reg-orb3" style={{ position:'absolute', top:'35%', left:'38%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        {/* ── LEFT PANEL (desktop) ───────────────────────────── */}
        <div className="hidden lg:flex" style={{ width:'44%', flexDirection:'column', justifyContent:'center', padding:'60px 52px', position:'relative', zIndex:1 }}>

          {/* Logo */}
          <div className="reg-fu1" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:52 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 0 22px rgba(124,58,237,0.5)' }}>✂</div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing:'-0.3px' }}>My Salon Bookings</div>
              <div style={{ fontSize:11, color:'#475569' }}>Owner Registration</div>
            </div>
          </div>

          <div className="reg-fu2" style={{ marginBottom:14 }}>
            <h1 style={{ fontSize:'clamp(2rem,3.2vw,2.8rem)', fontWeight:800, color:'#f8fafc', lineHeight:1.1, letterSpacing:'-1.4px', margin:0 }}>
              Start growing<br />
              <span className="reg-shimmer">your salon today.</span>
            </h1>
          </div>
          <p className="reg-fu3" style={{ fontSize:14.5, color:'#475569', lineHeight:1.8, marginBottom:44, maxWidth:360 }}>
            Create your free account in under 2 minutes. 30 days full access — no credit card needed.
          </p>

          {/* Step guide */}
          <div className="reg-fu4" style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {STEPS.map(({ n, label }, i) => (
              <div key={n} style={{ display:'flex', alignItems:'flex-start', gap:16, paddingBottom: i < 2 ? 20 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{
                    width:34, height:34, borderRadius:'50%',
                    background: step >= n ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : 'rgba(255,255,255,0.06)',
                    border: step >= n ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:700, color: step >= n ? '#fff' : '#334155',
                    boxShadow: step >= n ? '0 0 16px rgba(124,58,237,0.45)' : 'none',
                    transition:'all .4s ease',
                  }}>
                    {step > n ? '✓' : n}
                  </div>
                  {i < 2 && <div style={{ width:2, height:20, background: step > n ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)', marginTop:4, borderRadius:2, transition:'background .4s ease' }} />}
                </div>
                <div style={{ paddingTop:6 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color: step >= n ? '#e2e8f0' : '#334155', transition:'color .3s ease' }}>{label}</div>
                  <div style={{ fontSize:12, color:'#1e293b', marginTop:1 }}>
                    {n === 1 && 'Verify your mobile number'}
                    {n === 2 && 'Enter the OTP from SMS'}
                    {n === 3 && 'Set up your profile'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ marginTop:52, fontSize:12, color:'#1e293b' }}>
            Already have an account?{' '}
            <a href={ROUTES.LOGIN} className="reg-link" style={{ fontSize:12 }}>Sign in →</a>
          </p>
        </div>

        {/* ── RIGHT FORM PANEL ──────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'28px 20px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:460 }}>

            {/* Mobile logo */}
            <div className="flex lg:hidden reg-fu1 items-center gap-3 justify-center mb-7">
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 18px rgba(124,58,237,0.5)' }}>✂</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color: isDark ? '#f1f5f9' : '#0f172a' }}>My Salon Bookings</div>
                <div style={{ fontSize:11, color: isDark ? '#475569' : '#64748b' }}>Create your free account</div>
              </div>
            </div>

            {/* ── GLASS CARD ──────────────────────────────────── */}
            <div className="reg-fu2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', backdropFilter:'blur(24px)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, borderRadius:24, padding:'32px 32px 28px', boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.08)' : '0 32px 80px rgba(0,0,0,0.1)' }}>

              {/* ── STEP PROGRESS BAR ──────────────────────── */}
              <div style={{ marginBottom:28 }}>
                <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                  {STEPS.map(({ n }) => (
                    <div key={n} style={{ flex:1, height:4, borderRadius:4, background: step >= n ? 'linear-gradient(90deg,#7c3aed,#3b82f6)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'), transition:'background .4s ease' }} />
                  ))}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  {STEPS.map(({ n, label }) => (
                    <span key={n} style={{ fontSize:10.5, fontWeight: step === n ? 700 : 400, color: step === n ? '#a78bfa' : '#334155', transition:'color .3s ease' }}>
                      {step === n ? `Step ${n} — ` : ''}{label}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── GLOBAL ERROR ────────────────────────────── */}
              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:11, padding:'11px 14px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>⚠️</span>
                  <p style={{ fontSize:13, color:'#f87171', margin:0, flex:1 }}>{error}</p>
                  <button onClick={() => setError('')} style={{ color:'#f87171', background:'none', border:'none', cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  STEP 1 — PHONE
              ══════════════════════════════════════════════ */}
              {step === 1 && (
                <form className="reg-step" onSubmit={handleSendOtp} noValidate style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ marginBottom:4 }}>
                    <h2 style={{ fontSize:20, fontWeight:800, color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Verify your phone</h2>
                    <p style={{ fontSize:13.5, color:'#475569', margin:0 }}>We'll send a one-time code via SMS</p>
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7, letterSpacing:0.2 }}>Phone Number</label>
                    <div style={{ position:'relative' }}>
                      {/* +91 prefix */}
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, display:'flex', alignItems:'center', paddingLeft:14, paddingRight:10, borderRight:'1.5px solid rgba(255,255,255,0.1)', pointerEvents:'none' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'#64748b', whiteSpace:'nowrap' }}>🇮🇳 +91</span>
                      </div>
                      <input
                        className={`reg-input${phoneError ? ' err' : ''}`}
                        style={{ paddingLeft:80 }}
                        type="tel"
                        value={phoneNumber}
                        onChange={e => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                        placeholder="98765 43210"
                        disabled={phoneLoading}
                        autoComplete="tel"
                        inputMode="numeric"
                        maxLength={13}
                        aria-label="Phone number"
                      />
                    </div>
                    {phoneError && <p style={{ fontSize:12, color:'#f87171', marginTop:5, display:'flex', alignItems:'center', gap:4 }}><span>⚠</span>{phoneError}</p>}
                  </div>

                  <p style={{ fontSize:12, color:'#334155', textAlign:'center', margin:'-4px 0' }}>
                    🔒 OTP sent via Firebase SMS · Secured with reCAPTCHA
                  </p>

                  <button type="submit" className="reg-btn" disabled={phoneLoading || !phoneNumber.trim()}>
                    {phoneLoading
                      ? <><div className="reg-spinner" /> Sending OTP…</>
                      : <>Send OTP <ArrowRight size={17} /></>
                    }
                  </button>
                </form>
              )}

              {/* ══════════════════════════════════════════════
                  STEP 2 — OTP
              ══════════════════════════════════════════════ */}
              {step === 2 && (
                <form className="reg-step" onSubmit={handleVerifyOtp} noValidate style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  <div>
                    <h2 style={{ fontSize:20, fontWeight:800, color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Enter the OTP</h2>
                    <p style={{ fontSize:13.5, color:'#475569', margin:0 }}>
                      Sent to <strong style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{normalizePhone(phoneNumber)}</strong>
                    </p>
                  </div>

                  {/* 6 OTP boxes */}
                  <div>
                    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={otpRefs[idx]}
                          className={`reg-otp-box${digit ? ' filled' : ''}${otpError ? ' err-box' : ''}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(idx, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(idx, e)}
                          onPaste={idx === 0 ? handleOtpPaste : undefined}
                          disabled={otpLoading}
                          aria-label={`OTP digit ${idx + 1}`}
                          autoComplete="one-time-code"
                        />
                      ))}
                    </div>
                    {otpError && <p style={{ fontSize:12.5, color:'#f87171', marginTop:10, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}><span>⚠</span>{otpError}</p>}
                  </div>

                  <button type="submit" className="reg-btn" disabled={otpLoading || otp.length !== 6}>
                    {otpLoading
                      ? <><div className="reg-spinner" /> Verifying…</>
                      : <><Check size={17} /> Verify OTP</>
                    }
                  </button>

                  {/* Resend */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                    {otpTimer > 0 ? (
                      <p style={{ fontSize:13, color:'#334155', margin:0 }}>
                        Resend in <strong style={{ color:'#a78bfa' }}>{otpTimer}s</strong>
                      </p>
                    ) : (
                      <button type="button" className="reg-ghost-btn" style={{ fontSize:13, fontWeight:600, color:'#a78bfa' }} onClick={handleSendOtp} disabled={phoneLoading}>
                        {phoneLoading ? 'Sending…' : '↻ Resend OTP'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="reg-ghost-btn"
                      style={{ fontSize:12.5 }}
                      onClick={() => { setStep(1); setOtpDigits(['','','','','','']); setOtpError(''); setError(''); }}
                    >
                      ← Use a different number
                    </button>
                  </div>
                </form>
              )}

              {/* ══════════════════════════════════════════════
                  STEP 3 — PROFILE
              ══════════════════════════════════════════════ */}
              {step === 3 && (
                <form className="reg-step" onSubmit={handleRegister} noValidate style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ marginBottom:2 }}>
                    <h2 style={{ fontSize:20, fontWeight:800, color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing:'-0.5px', margin:'0 0 5px' }}>Set up your profile</h2>
                    <p style={{ fontSize:13.5, color:'#475569', margin:0 }}>Almost done — just a few details</p>
                  </div>

                  {/* Full name */}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7 }}>Full Name</label>
                    <div style={{ position:'relative' }}>
                      <User size={15} color="#475569" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                      <input
                        className={`reg-input${nameError ? ' err' : ''}`}
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setNameError(''); }}
                        placeholder="Your full name"
                        disabled={regLoading}
                        autoComplete="name"
                        aria-label="Full name"
                      />
                    </div>
                    {nameError && <p style={{ fontSize:12, color:'#f87171', marginTop:5 }}>{nameError}</p>}
                  </div>

                  {/* Gender */}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:8 }}>Gender</label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {[{v:'male',l:'Male',e:'👨'},{v:'female',l:'Female',e:'👩'},{v:'other',l:'Other',e:'🧑'}].map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          disabled={regLoading}
                          onClick={() => { setGender(opt.v); setGenderError(''); }}
                          style={{
                            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                            padding:'12px 8px', borderRadius:12, fontSize:12.5, fontWeight:600,
                            cursor:'pointer', transition:'all .2s ease', fontFamily:'inherit',
                            background: gender === opt.v ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
                            border: gender === opt.v ? '1.5px solid rgba(124,58,237,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                            color: gender === opt.v ? '#a78bfa' : '#64748b',
                            boxShadow: gender === opt.v ? '0 0 14px rgba(124,58,237,0.2)' : 'none',
                          }}
                        >
                          <span style={{ fontSize:20 }}>{opt.e}</span>{opt.l}
                        </button>
                      ))}
                    </div>
                    {genderError && <p style={{ fontSize:12, color:'#f87171', marginTop:5 }}>{genderError}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7 }}>Email Address</label>
                    <div style={{ position:'relative' }}>
                      <Mail size={15} color="#475569" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                      <input
                        className={`reg-input${emailError ? ' err' : ''}`}
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                        placeholder="you@example.com"
                        disabled={regLoading}
                        autoComplete="email"
                        aria-label="Email address"
                      />
                    </div>
                    {emailError && <p style={{ fontSize:12, color:'#f87171', marginTop:5 }}>{emailError}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7 }}>Password</label>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                      <input
                        className={`reg-input${passwordError ? ' err' : ''}`}
                        style={{ paddingRight:46 }}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                        onInput={e => { setPassword(e.target.value); setPasswordError(''); }}
                        placeholder="Minimum 8 characters"
                        disabled={regLoading}
                        autoComplete="new-password"
                        name="password"
                        aria-label="Password"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#475569', display:'flex', alignItems:'center' }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {password && (
                      <div style={{ marginTop:8 }}>
                        <div style={{ height:4, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden' }}>
                          <div className="pw-bar" style={{ width:pwStrength.width, background:pwStrength.color }} />
                        </div>
                        <p style={{ fontSize:11, color:pwStrength.color, marginTop:4, fontWeight:600 }}>{pwStrength.label}</p>
                      </div>
                    )}
                    {passwordError && <p style={{ fontSize:12, color:'#f87171', marginTop:4 }}>{passwordError}</p>}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7 }}>Confirm Password</label>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                      <input
                        className={`reg-input${confirmError ? ' err' : ''}`}
                        style={{ paddingRight:46 }}
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setConfirmError(''); }}
                        onInput={e => { setConfirmPw(e.target.value); setConfirmError(''); }}
                        placeholder="Re-enter your password"
                        disabled={regLoading}
                        autoComplete="new-password"
                        name="confirm-password"
                        aria-label="Confirm password"
                      />
                      <button type="button" onClick={() => setShowConfirmPw(v => !v)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#475569', display:'flex', alignItems:'center' }} aria-label={showConfirmPw ? 'Hide' : 'Show'}>
                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      {confirmPw && password === confirmPw && (
                        <div style={{ position:'absolute', right:40, top:'50%', transform:'translateY(-50%)' }}>
                          <Check size={14} color="#22c55e" />
                        </div>
                      )}
                    </div>
                    {confirmError && <p style={{ fontSize:12, color:'#f87171', marginTop:5 }}>{confirmError}</p>}
                  </div>

                  {/* Optional referral code */}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : '#64748b', marginBottom:7 }}>
                      Referral Code <span style={{ fontWeight:400, color:'#334155' }}>(optional)</span>
                    </label>
                    <div style={{ position:'relative' }}>
                      <Gift size={15} color="#475569" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                      <input
                        className="reg-input reg-input-no-icon"
                        style={{ paddingLeft:44, fontFamily:'monospace', letterSpacing:2, fontSize:13, fontWeight:700, textTransform:'uppercase' }}
                        type="text"
                        value={referralCode}
                        onChange={e => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="e.g. MSB123456"
                        maxLength={9}
                        disabled={regLoading}
                      />
                    </div>
                  </div>

                  {/* Terms agreement */}
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                    <div
                      onClick={() => setAgreedToTerms(v => !v)}
                      style={{
                        width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                        background: agreedToTerms ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                        border: agreedToTerms ? 'none' : isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid rgba(0,0,0,0.2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer', transition:'all .2s ease',
                        boxShadow: agreedToTerms ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                      }}
                    >
                      {agreedToTerms && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize:13, color:'#64748b', lineHeight:1.6, userSelect:'none' }}>
                      I agree to the{' '}
                      <a href={ROUTES.OWNER_TERMS} target="_blank" rel="noopener noreferrer" className="reg-link" style={{ fontSize:13 }}>Terms &amp; Conditions</a>
                      {' '}and{' '}
                      <a href={ROUTES.OWNER_PRIVACY} target="_blank" rel="noopener noreferrer" className="reg-link" style={{ fontSize:13 }}>Privacy Policy</a>
                    </span>
                  </label>

                  <button type="submit" className="reg-btn" disabled={regLoading || !agreedToTerms} style={{ marginTop:4 }}>
                    {regLoading
                      ? <><div className="reg-spinner" /> Creating account…</>
                      : <><Check size={17} /> Complete Registration</>
                    }
                  </button>
                </form>
              )}

              {/* ── DIVIDER + LOGIN LINK ─────────────────────── */}
              <div style={{ display:'flex', alignItems:'center', gap:14, margin:'22px 0 18px' }}>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
                <span style={{ fontSize:12, color:'#334155', fontWeight:500 }}>OR</span>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:13.5, color:'#475569', marginBottom:11 }}>Already have an account?</p>
                <a href={ROUTES.LOGIN} className="reg-btn-outline" style={{ display:'block', textDecoration:'none' }}>
                  Sign In to Dashboard
                </a>
              </div>

            </div>
            {/* end card */}

            {/* Footer links */}
            <div className="reg-fu3" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'5px 18px', marginTop:22 }}>
              <a href={ROUTES.OWNER_TERMS}   className="reg-link" style={{ fontSize:12 }}>Terms &amp; Conditions</a>
              <span style={{ color:'#1e293b', fontSize:12 }}>·</span>
              <a href={ROUTES.OWNER_PRIVACY} className="reg-link" style={{ fontSize:12 }}>Privacy Policy</a>
              <span style={{ color:'#1e293b', fontSize:12 }}>·</span>
              <a href="mailto:support@mysalonbookings.com" className="reg-link" style={{ fontSize:12 }}>Contact Support</a>
            </div>
            <p style={{ textAlign:'center', fontSize:11.5, color:'#1e293b', marginTop:12 }}>
              © 2026 My Salon Bookings by Gigamind Technology Pvt Ltd
            </p>

          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
