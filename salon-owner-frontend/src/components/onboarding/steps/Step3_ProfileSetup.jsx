import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';

const CSS = `
  @keyframes s3-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s3-cursor{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes s3-btn-glow{0%,100%{box-shadow:0 6px 40px rgba(124,58,237,0.45)}50%{box-shadow:0 6px 60px rgba(124,58,237,0.7),0 0 0 4px rgba(124,58,237,0.12)}}
  @keyframes s3-spin{to{transform:rotate(360deg)}}
  @keyframes s3-wave{0%{transform:rotate(0deg)}20%{transform:rotate(-15deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(5deg)}100%{transform:rotate(0deg)}}

  .s3-a1{animation:s3-up 0.55s 0s cubic-bezier(0.16,1,0.3,1) both}
  .s3-a2{animation:s3-up 0.55s 0.08s cubic-bezier(0.16,1,0.3,1) both}
  .s3-a3{animation:s3-up 0.55s 0.16s cubic-bezier(0.16,1,0.3,1) both}
  .s3-a4{animation:s3-up 0.55s 0.24s cubic-bezier(0.16,1,0.3,1) both}

  .s3-wave{display:inline-block;animation:s3-wave 1.2s ease both}

  .s3-inp{
    width:100%;padding:0;font-size:clamp(1.8rem,5vw,2.6rem);
    font-weight:800;letter-spacing:-1px;
    background:none;border:none;outline:none;
    box-sizing:border-box;font-family:inherit;
    caret-color:#7c3aed;
  }
  .s3-inp::placeholder{opacity:0.22}

  .s3-underline{
    height:3px;border-radius:99px;
    background:linear-gradient(90deg,#7c3aed,#ec4899);
    transition:opacity 0.2s;
  }

  .s3-btn{
    transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
               box-shadow 0.2s, opacity 0.2s;
  }
  .s3-btn.ready{animation:s3-btn-glow 2.4s ease-in-out infinite;}
  .s3-btn:hover:not(:disabled){transform:translateY(-3px) scale(1.01)!important;}
  .s3-btn:active:not(:disabled){transform:scale(0.97)!important;transition:transform 0.1s!important;}

  .s3-ref-toggle{transition:color 0.15s,opacity 0.15s;}
  .s3-ref-toggle:hover{opacity:0.8;}
`;

export default function Step3_ProfileSetup() {
  const { data, update, nextStep } = useOnboarding();
  const { updateProfile } = useAuth();
  const { isDark } = useTheme();

  const [name, setName]                 = useState(data.name || '');
  const [referral, setReferral]         = useState(data.referralCode || '');
  const [referralOpen, setReferralOpen] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const inputRef                        = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, []);

  const isValid = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    if (name.trim().length < 2) { setError('At least 2 characters please'); return; }
    setLoading(true);
    try {
      update({ name: name.trim(), referralCode: referral });
      await updateProfile({ name: name.trim() });
      if (referral.trim()) {
        try { await api.post('/owner/referral/apply', { code: referral.trim().toUpperCase() }); } catch {}
      }
      toast.success('Nice to meet you! 👋');
      nextStep();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && isValid) handleSubmit(); };

  const text   = isDark ? '#f1f5f9' : '#0f172a';
  const sub    = isDark ? 'rgba(255,255,255,0.38)' : '#94a3b8';
  const inpClr = isDark ? '#f1f5f9' : '#0f172a';
  const inpBdr = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
  const refBg  = isDark ? 'rgba(255,255,255,0.05)' : '#f8f7ff';
  const refBdr = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

  return (
    <>
      <style>{CSS}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 100px)', justifyContent: 'center', paddingBottom: 60 }}>

        {/* Wave emoji */}
        <div className="s3-a1" style={{ fontSize: 44, marginBottom: 24, lineHeight: 1 }}>
          <span className="s3-wave">👋</span>
        </div>

        {/* Headline */}
        <div className="s3-a2" style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: text, margin: 0, lineHeight: 1.1, letterSpacing: '-1.5px' }}>
            What's your name?
          </h1>
        </div>

        <p className="s3-a3" style={{ fontSize: 16, color: sub, margin: '0 0 48px', lineHeight: 1.5 }}>
          This is how your customers and our team will address you.
        </p>

        {/* Big name input */}
        <div className="s3-a3" style={{ marginBottom: error ? 10 : 40 }}>
          <input
            ref={inputRef}
            className="s3-inp"
            placeholder="Your full name"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            style={{ color: inpClr }}
          />
          <div className="s3-underline" style={{ opacity: name ? 1 : 0.3 }} />
          {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 8, fontWeight: 500 }}>{error}</p>}
        </div>

        {/* Referral code — collapsible */}
        <div className="s3-a4" style={{ marginBottom: 40 }}>
          <button
            className="s3-ref-toggle"
            onClick={() => setReferralOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#a78bfa' : '#7c3aed', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
          >
            {referralOpen ? '▾' : '▸'} Have a referral code?
          </button>

          {referralOpen && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input
                value={referral}
                onChange={e => setReferral(e.target.value.toUpperCase())}
                placeholder="e.g. GLX123456"
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: refBg, border: `1.5px solid ${refBdr}`,
                  color: inpClr, outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = refBdr}
              />
              <button
                onClick={() => { if (referral.length >= 4) toast.success('Code saved!'); }}
                style={{
                  padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Apply</button>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          className={`s3-btn${isValid ? ' ready' : ''}`}
          onClick={handleSubmit}
          disabled={loading || !isValid}
          style={{
            width: '100%', padding: '18px 28px', borderRadius: 18,
            background: isValid
              ? 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)'
              : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f0ff'),
            color: isValid ? '#fff' : sub,
            fontWeight: 800, fontSize: 17, border: 'none',
            cursor: isValid ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontFamily: 'inherit', letterSpacing: '-0.3px',
          }}
        >
          {loading ? (
            <><div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 's3-spin 0.7s linear infinite' }} />Saving...</>
          ) : (
            <>Let's go <ArrowRight size={20} /></>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: sub, marginTop: 20 }}>
          By continuing you agree to our{' '}
          <a href="/legal/owner-terms" target="_blank" style={{ color: '#7c3aed', fontWeight: 600 }}>Terms</a>
          {' '}&{' '}
          <a href="/legal/owner-privacy" target="_blank" style={{ color: '#7c3aed', fontWeight: 600 }}>Privacy</a>
        </p>
      </div>
    </>
  );
}
