import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Phone, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../config/firebase';

const PHONE_OTP_CSS = `
  @keyframes pof-spin{to{transform:rotate(360deg);}}
  @keyframes pof-slide{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);}}
  .pof-input{width:100%;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:13px 16px 13px 44px;color:#f1f5f9;font-size:16px;outline:none;transition:border-color .2s,background .2s,box-shadow .2s;font-family:inherit;}
  .pof-input::placeholder{color:#475569;}
  .pof-input:focus{border-color:rgba(139,92,246,0.7);background:rgba(255,255,255,0.09);box-shadow:0 0 0 3px rgba(139,92,246,0.15);}
  .pof-btn{width:100%;padding:14px;border-radius:13px;font-size:15px;font-weight:700;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 0 28px rgba(124,58,237,0.45);transition:transform .22s,box-shadow .22s,opacity .22s;font-family:inherit;}
  .pof-btn:hover:not(:disabled){transform:scale(1.025);box-shadow:0 0 42px rgba(124,58,237,0.65);}
  .pof-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
  .pof-spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:pof-spin .7s linear infinite;flex-shrink:0;}
  .pof-slide{animation:pof-slide .35s ease both;}
  [data-lm] .pof-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f172a;}
  [data-lm] .pof-input::placeholder{color:#94a3b8;}
  [data-lm] .pof-input:focus{border-color:rgba(124,58,237,0.5);background:rgba(0,0,0,0.06);box-shadow:0 0 0 3px rgba(124,58,237,0.1);}
`;

const normalizePhone = (p) => {
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith('91')) return `+${d}`;
  return p.trim();
};

/**
 * PhoneOtpForm — reusable phone + OTP verification component.
 *
 * Props:
 *   recaptchaId   string   unique DOM id for the invisible reCAPTCHA container
 *   isDark        bool
 *   submitLabel   string   label for the OTP verify button (default "Verify & Continue")
 *   footerSlot    node     optional content below the form (e.g. "Already have an account?")
 *   onVerified    async fn(firebaseToken, normalizedPhone) — called after OTP confirmed
 *   extraError    string   additional error to display (from parent)
 *   extraActions  node     extra buttons shown below the error box
 */
const PhoneOtpForm = ({
  recaptchaId = 'pof-recaptcha',
  isDark = true,
  submitLabel = 'Verify & Continue',
  footerSlot,
  onVerified,
  extraError,
  extraActions,
}) => {
  const c = isDark;

  const [step,     setStep]     = useState(1);
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const otpRefs     = useRef([]);
  const recaptchaRef = useRef(null);
  const confirmRef  = useRef(null);

  // Focus first OTP box when step changes
  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 120);
  }, [step]);

  // Countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  // Pre-render invisible reCAPTCHA
  useEffect(() => {
    const container = document.createElement('div');
    container.id = recaptchaId;
    document.body.appendChild(container);
    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaId, { size: 'invisible' });
      recaptchaRef.current.render();
    } catch {}
    return () => {
      try { recaptchaRef.current?.clear(); } catch {}
      recaptchaRef.current = null;
      document.getElementById(recaptchaId)?.remove();
    };
  }, [recaptchaId]);

  const getVerifier = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    try { document.getElementById(recaptchaId)?.remove(); } catch {}
    const container = document.createElement('div');
    container.id = recaptchaId;
    document.body.appendChild(container);
    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaId, { size: 'invisible' });
    return recaptchaRef.current;
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number'); return;
    }
    setError(''); setLoading(true);
    try {
      const verifier = getVerifier();
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
      await onVerified(firebaseToken, normalizePhone(phone));
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally { setLoading(false); }
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (otp[i]) { const n = [...otp]; n[i] = ''; setOtp(n); }
      else if (i > 0) otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const n = [...otp]; n[i] = digit; setOtp(n);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    const full = [...n].join('');
    if (i === 5 && digit && full.length === 6)
      setTimeout(() => handleVerifyOtp(null, full).catch(err => setError(err?.message || 'Verification failed.')), 80);
  };

  const displayError = error || extraError;

  return (
    <>
      <style>{PHONE_OTP_CSS}</style>

      {displayError && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 11, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{displayError}</p>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
          {extraActions}
        </div>
      )}

      {/* Step 1 — Phone */}
      {step === 1 && (
        <form key="step1" className="pof-slide" onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: c ? '#94a3b8' : '#64748b', marginBottom: 7 }}>
              Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                className="pof-input"
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                placeholder="98765 43210"
                disabled={loading}
                inputMode="numeric"
                maxLength={10}
                autoFocus
              />
            </div>
          </div>

          <button type="submit" className="pof-btn" disabled={loading || phone.replace(/\D/g, '').length < 10}>
            {loading ? <><div className="pof-spinner" /> Sending OTP…</> : <>Send OTP <ArrowRight size={17} /></>}
          </button>

          {footerSlot}
        </form>
      )}

      {/* Step 2 — OTP */}
      {step === 2 && (
        <form key="step2" className="pof-slide" onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 38 }}>📱</div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => otpRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                style={{
                  width: 50, height: 58, borderRadius: 14, textAlign: 'center', fontSize: 22, fontWeight: 800, outline: 'none',
                  background: digit ? (c ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)') : (c ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  border: digit ? '1.5px solid rgba(99,102,241,0.4)' : `1.5px solid ${c ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  color: c ? '#f1f5f9' : '#0f172a',
                  transition: 'all 0.18s', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: c ? '#475569' : '#64748b', margin: 0 }}>
            OTP sent to +91 {phone}
          </p>

          <button type="submit" className="pof-btn" disabled={loading || otp.join('').length < 6}>
            {loading ? <><div className="pof-spinner" /> Verifying…</> : submitLabel}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {otpTimer > 0 ? (
              <p style={{ fontSize: 13, color: c ? '#475569' : '#64748b' }}>
                Resend in <span style={{ fontWeight: 700, color: c ? '#94a3b8' : '#475569' }}>{otpTimer}s</span>
              </p>
            ) : (
              <button type="button" onClick={handleSendOtp} disabled={loading}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: '#a78bfa', fontWeight: 600, fontFamily: 'inherit' }}>
                Resend OTP
              </button>
            )}
            <button type="button" onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: c ? '#475569' : '#94a3b8', textDecoration: 'underline', fontFamily: 'inherit' }}>
              Change phone number
            </button>
          </div>
        </form>
      )}
    </>
  );
};

export default PhoneOtpForm;
