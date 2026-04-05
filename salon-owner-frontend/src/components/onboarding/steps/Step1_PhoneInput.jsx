import React, { useState, useRef, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import toast from 'react-hot-toast';
import { ArrowRight, Phone } from 'lucide-react';
import { auth } from '../../../config/firebase';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const S1_CSS = `
  @keyframes s1-fadeup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s1-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  @keyframes s1-spin{to{transform:rotate(360deg)}}
  @keyframes s1-check{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
  .s1-fu1{animation:s1-fadeup 0.5s 0s ease both}
  .s1-fu2{animation:s1-fadeup 0.5s 0.1s ease both}
  .s1-fu3{animation:s1-fadeup 0.5s 0.2s ease both}
  .s1-fu4{animation:s1-fadeup 0.5s 0.3s ease both}
  .s1-fu5{animation:s1-fadeup 0.5s 0.4s ease both}
  .s1-btn{transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;}
  .s1-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
  .s1-btn:active:not(:disabled){transform:scale(0.97);}
`;

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + ' ' + digits.slice(5);
}

export default function Step1_PhoneInput() {
  const { update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [rawPhone, setRawPhone]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [error, setError]             = useState('');
  const recaptchaRef                  = useRef(null);
  const recaptchaVerifierRef          = useRef(null);

  const digits = rawPhone.replace(/\D/g, '');
  const valid  = /^[6-9]\d{9}$/.test(digits);

  useEffect(() => {
    // Cleanup recaptcha on unmount
    return () => {
      try { recaptchaVerifierRef.current?.clear(); } catch {}
    };
  }, []);

  const setupRecaptcha = () => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const handleSendOtp = async () => {
    if (!valid || loading) return;
    setError('');
    setLoading(true);
    try {
      const verifier         = setupRecaptcha();
      const fullPhone        = '+91' + digits;
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, verifier);
      update({ phone: fullPhone, confirmationResult });
      setSent(true);
      toast.success('Code sent! Check your messages 📱');
      // Brief success animation then advance
      setTimeout(() => nextStep(), 600);
    } catch (err) {
      setError('Failed to send OTP. Please check your number and try again.');
      toast.error('Could not send OTP');
      try { recaptchaVerifierRef.current?.clear(); recaptchaVerifierRef.current = null; } catch {}
    } finally {
      setLoading(false);
    }
  };

  const bg       = isDark ? '#07071a' : '#f5f3ff';
  const cardBg   = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const border   = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const text     = isDark ? '#f1f5f9' : '#111827';
  const sub      = isDark ? '#94a3b8' : '#6b7280';
  const inpBg    = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb';
  const inpBorder= isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';
  const inpFocus = '#7c3aed';
  const [focused, setFocused] = useState(false);

  return (
    <>
      <style>{S1_CSS}</style>
      <div id="recaptcha-container" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 's1-fadeup 0.5s ease' }}>

        {/* Hero */}
        <div className="s1-fu1" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px',
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, boxShadow: '0 0 40px rgba(124,58,237,0.45)',
          }}>✨</div>
          <h1 style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 900, color: text, margin: '0 0 10px', letterSpacing: '-0.8px', lineHeight: 1.15 }}>
            Welcome to Glow ✨
          </h1>
          <p style={{ color: sub, fontSize: 15, lineHeight: 1.65, margin: 0, maxWidth: 380, marginInline: 'auto' }}>
            Thousands of salons trust Glow to grow their business.
            Let's set yours up — it takes <strong style={{ color: '#a855f7' }}>less than 2 minutes.</strong>
          </p>
        </div>

        {/* Card */}
        <div className="s1-fu2" style={{
          background: cardBg, border: `1px solid ${border}`,
          borderRadius: 24, padding: '32px 28px',
          boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.08)',
        }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: sub, marginBottom: 10 }}>
            Your mobile number
          </label>

          {/* Phone input */}
          <div style={{
            display: 'flex', borderRadius: 14, overflow: 'hidden',
            border: `2px solid ${error ? '#f87171' : focused ? inpFocus : inpBorder}`,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(248,113,113,0.15)' : 'rgba(124,58,237,0.2)'}` : 'none',
          }}>
            {/* Flag prefix */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '14px 14px',
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f0ff',
              borderRight: `1px solid ${border}`,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 20 }}>🇮🇳</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: text }}>+91</span>
            </div>

            <input
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={formatPhone(rawPhone)}
              onChange={e => {
                setError('');
                setRawPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
              }}
              onKeyDown={e => { if (e.key === 'Enter' && valid) handleSendOtp(); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: inpBg,
                color: text, fontSize: 18, fontWeight: 600, padding: '14px 16px',
                letterSpacing: 1, fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, fontWeight: 500 }}>
              {error || "Hmm, that doesn't look right. Try a 10-digit number starting with 6, 7, 8, or 9."}
            </p>
          )}

          {/* CTA */}
          <button
            className="s1-btn"
            onClick={handleSendOtp}
            disabled={!valid || loading || sent}
            style={{
              marginTop: 20, width: '100%',
              background: sent
                ? 'linear-gradient(135deg,#059669,#10b981)'
                : !valid
                ? isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'
                : 'linear-gradient(135deg,#7c3aed,#ec4899)',
              border: 'none', borderRadius: 14,
              color: !valid && !sent ? sub : '#fff',
              fontWeight: 700, fontSize: 16, padding: '15px 24px',
              cursor: !valid || loading || sent ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit', letterSpacing: '-0.2px',
              boxShadow: valid && !loading && !sent ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 's1-spin 0.7s linear infinite' }} />
                Sending your code...
              </>
            ) : sent ? (
              <><span style={{ animation: 's1-check 0.4s ease' }}>✅</span> Code sent!</>
            ) : (
              <>Send OTP — it's free <ArrowRight size={18} /></>
            )}
          </button>

          {/* Social proof */}
          <div className="s1-fu4" style={{
            marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.25)'}`,
            borderRadius: 12, padding: '10px 16px',
          }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontSize: 13, color: isDark ? '#fbbf24' : '#92400e', fontWeight: 600 }}>
              Joined by 12,000+ salon owners across India
            </span>
          </div>
        </div>

        {/* Speed promise */}
        <div className="s1-fu5" style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          {['No credit card', 'Under 2 minutes', '100% free'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: sub }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>{t}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
