import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const S2_CSS = `
  @keyframes s2-fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s2-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
  @keyframes s2-flash{0%,100%{background:var(--flash-bg)}50%{background:#10b981}}
  @keyframes s2-spin{to{transform:rotate(360deg)}}
  @keyframes s2-ring{0%,100%{stroke-dashoffset:188.4}to{stroke-dashoffset:0}}
  .s2-fu1{animation:s2-fadeup 0.45s 0s ease both}
  .s2-fu2{animation:s2-fadeup 0.45s 0.1s ease both}
  .s2-fu3{animation:s2-fadeup 0.45s 0.2s ease both}
`;

export default function Step2_OtpVerify() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const [success, setSuccess]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const resendRecaptchaRef = useRef(null);

  /* Countdown */
  useEffect(() => {
    if (timeLeft <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...digits];
    updated[idx] = val.slice(-1);
    setDigits(updated);
    setError('');
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (updated.every(d => d !== '') && val) {
      verify(updated.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      const arr = text.split('');
      setDigits(arr);
      inputRefs.current[5]?.focus();
      verify(text);
    }
    e.preventDefault();
  };

  const verify = useCallback(async (code) => {
    if (!data.confirmationResult || loading || success) return;
    setLoading(true);
    setError('');
    try {
      const result     = await data.confirmationResult.confirm(code);
      const idToken    = await result.user.getIdToken();
      update({ firebaseToken: idToken });

      // Celebration
      setSuccess(true);
      confetti({ particleCount: 150, spread: 90, origin: { x: 0.5, y: 0.6 }, colors: ['#7c3aed','#a855f7','#ec4899','#fbbf24','#34d399'] });
      toast.success('Phone verified! 🎉');
      setTimeout(() => nextStep(), 900);
    } catch {
      setError("That code didn't match — double-check and try again.");
      setShake(true);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  }, [data.confirmationResult, loading, success, update, nextStep]);

  const handleResend = async () => {
    if (!canResend || loading) return;
    setCanResend(false);
    setTimeLeft(60);
    setDigits(['', '', '', '', '', '']);
    setError('');
    try {
      if (!resendRecaptchaRef.current) {
        resendRecaptchaRef.current = new RecaptchaVerifier(auth, 'resend-recaptcha', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(auth, data.phone, resendRecaptchaRef.current);
      update({ confirmationResult: result });
      toast.success('New code sent!');
    } catch {
      toast.error('Could not resend. Please refresh and try again.');
      setCanResend(true);
    }
  };

  const cardBg   = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border   = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const text     = isDark ? '#f1f5f9' : '#111827';
  const sub      = isDark ? '#94a3b8' : '#6b7280';
  const boxBase  = isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb';
  const boxBorderBase = isDark ? 'rgba(255,255,255,0.14)' : '#d1d5db';
  const maskedPhone = data.phone.replace(/^(\+91)(\d{5})(\d{5})$/, '+91 $2 $3');

  const circumference = 2 * Math.PI * 30;
  const dashOffset    = circumference - (circumference * (60 - timeLeft)) / 60;

  return (
    <>
      <style>{S2_CSS}</style>
      <div id="resend-recaptcha" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Header */}
        <div className="s2-fu1" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📲</div>
          <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 900, color: text, margin: '0 0 10px', letterSpacing: '-0.6px' }}>
            Check your phone
          </h1>
          <p style={{ color: sub, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            We sent a 6-digit code to{' '}
            <span style={{ fontWeight: 700, color: '#a855f7' }}>{maskedPhone}</span>
          </p>
        </div>

        {/* Card */}
        <div className="s2-fu2" style={{
          background: cardBg, border: `1px solid ${border}`,
          borderRadius: 24, padding: '28px 24px',
          boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.08)',
        }}>
          {/* OTP boxes */}
          <div
            style={{
              display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20,
              animation: shake ? 's2-shake 0.5s ease' : 'none',
            }}
            onPaste={handlePaste}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 48, height: 58, textAlign: 'center',
                  fontSize: 24, fontWeight: 800,
                  borderRadius: 14,
                  border: `2.5px solid ${error ? '#f87171' : success ? '#10b981' : d ? '#7c3aed' : boxBorderBase}`,
                  background: success ? 'rgba(16,185,129,0.1)' : d ? (isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)') : boxBase,
                  color: text, outline: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: d && !error && !success ? '0 0 0 3px rgba(124,58,237,0.15)' : success ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                  transform: success ? 'scale(1.08)' : 'scale(1)',
                  fontFamily: 'inherit',
                }}
                autoFocus={i === 0}
                disabled={loading || success}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: 500 }}>{error}</p>
          )}

          {loading && !success && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 's2-spin 0.7s linear infinite' }} />
            </div>
          )}

          {/* Timer + resend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            {/* Circular timer */}
            {!canResend && (
              <svg width="32" height="32" style={{ flexShrink: 0 }}>
                <circle cx="16" cy="16" r="13" fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} strokeWidth="2.5" />
                <circle
                  cx="16" cy="16" r="13" fill="none"
                  stroke="#7c3aed" strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 13}
                  strokeDashoffset={2 * Math.PI * 13 * (timeLeft / 60)}
                  transform="rotate(-90 16 16)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill={isDark ? '#a78bfa' : '#7c3aed'}>
                  {timeLeft}
                </text>
              </svg>
            )}

            <button
              onClick={handleResend}
              disabled={!canResend}
              style={{
                background: 'none', border: 'none', cursor: canResend ? 'pointer' : 'not-allowed',
                color: canResend ? '#7c3aed' : sub, fontSize: 13, fontWeight: 600,
                opacity: canResend ? 1 : 0.6, transition: 'all 0.2s', fontFamily: 'inherit',
                textDecoration: canResend ? 'underline' : 'none',
              }}
            >
              {canResend ? 'Resend OTP' : `Resend in ${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
            </button>
          </div>
        </div>

        {/* Security note */}
        <p className="s2-fu3" style={{ textAlign: 'center', color: sub, fontSize: 12, margin: 0 }}>
          🔒 This keeps your account secure
        </p>
      </div>
    </>
  );
}
