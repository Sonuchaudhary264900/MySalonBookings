import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';

const S3_CSS = `
  @keyframes s3-fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s3-spin{to{transform:rotate(360deg)}}
  @keyframes s3-card-glow{0%,100%{box-shadow:0 0 0 1px rgba(124,58,237,0.3),0 8px 30px rgba(124,58,237,0.15)}50%{box-shadow:0 0 0 2px rgba(124,58,237,0.5),0 8px 40px rgba(124,58,237,0.3)}}
  .s3-fu1{animation:s3-fadeup 0.45s 0s ease both}
  .s3-fu2{animation:s3-fadeup 0.45s 0.1s ease both}
  .s3-fu3{animation:s3-fadeup 0.45s 0.2s ease both}
  .s3-inp{
    width:100%;border-radius:12px;padding:12px 14px 12px 40px;font-size:14px;
    outline:none;transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box;font-family:inherit;
  }
  .s3-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s3-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
  .s3-btn:active:not(:disabled){transform:scale(0.97);}
`;

const STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#ef4444', copy: 'Keep going...' },
  { label: 'Weak',      color: '#f97316', copy: 'Getting better!' },
  { label: 'Fair',      color: '#eab308', copy: 'Nice!' },
  { label: 'Strong',    color: '#22c55e', copy: 'Strong password!' },
  { label: 'Very Strong', color: '#10b981', copy: 'Unbreakable 🔥' },
];

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, Math.max(0, score - 1 < 0 ? 0 : score - 1));
}

function InputField({ label, icon: Icon, error, children, hint }) {
  const { isDark } = useTheme();
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af', pointerEvents: 'none' }} />}
        {children}
      </div>
      {error && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4, fontWeight: 500 }}>{error}</p>}
      {hint && !error && <p style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af', fontSize: 11, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export default function Step3_ProfileSetup() {
  const { data, update, nextStep } = useOnboarding();
  const { register } = useAuth();
  const { isDark } = useTheme();

  const [form, setForm]           = useState({ name: data.name, email: data.email, password: data.password, confirm: '', gender: data.gender, referral: data.referralCode });
  const [showPw, setShowPw]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);
  const [agreed, setAgreed]       = useState(false);

  const patchForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pwStrength = form.password.length > 0 ? getStrength(form.password) : -1;
  const pwsMatch   = form.password && form.confirm && form.password === form.confirm;

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    if (!form.gender) e.gender = 'Please select your gender';
    if (!agreed) e.terms = 'Please accept the Terms & Conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || loading) return;
    setLoading(true);
    try {
      update({ name: form.name, email: form.email, password: form.password, gender: form.gender, referralCode: form.referral });
      await register(data.firebaseToken, form.name.trim(), form.email.trim().toLowerCase(), form.password, form.gender);

      // Apply referral code if provided (best-effort, non-blocking)
      if (form.referral.trim()) {
        try {
          await api.post('/owner/referral/apply', { code: form.referral.trim().toUpperCase() });
        } catch {
          // Silently ignore referral errors — don't block onboarding
        }
      }

      toast.success('Account created! 🎉');
      nextStep();
    } catch (err) {
      const msg = err.message || 'Registration failed';
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const cardBg   = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border   = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text     = isDark ? '#f1f5f9' : '#111827';
  const sub      = isDark ? '#94a3b8' : '#6b7280';
  const inpBg    = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb';
  const inpBorderBase = isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';

  const inpStyle = (hasErr) => ({
    border: `1.5px solid ${hasErr ? '#f87171' : inpBorderBase}`,
    background: inpBg, color: text,
    boxShadow: hasErr ? '0 0 0 3px rgba(248,113,113,0.12)' : 'none',
  });

  return (
    <>
      <style>{S3_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="s3-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Tell us a little about yourself
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            This is your owner profile — only you and our team will see it.
          </p>
        </div>

        {/* Form card */}
        <div className="s3-fu2" style={{
          background: cardBg, border: `1px solid ${border}`,
          borderRadius: 24, padding: '28px 24px',
          boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>

          {/* Name */}
          <InputField label="Full Name *" icon={User} error={errors.name} hint="How should we address you?">
            <input className="s3-inp" placeholder="Priya Sharma"
              value={form.name} onChange={e => patchForm('name', e.target.value)}
              style={inpStyle(errors.name)} />
          </InputField>

          {/* Email */}
          <InputField label="Email Address *" icon={Mail} error={errors.email} hint="For booking alerts and important updates">
            <input className="s3-inp" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => patchForm('email', e.target.value)}
              style={inpStyle(errors.email)} />
            {form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && !errors.email && (
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: 16 }}>✓</span>
            )}
          </InputField>

          {/* Password */}
          <InputField label="Password *" icon={Lock} error={errors.password}>
            <input className="s3-inp" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
              value={form.password} onChange={e => patchForm('password', e.target.value)}
              style={{ ...inpStyle(errors.password), paddingRight: 44 }} />
            <button onClick={() => setShowPw(p => !p)} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: sub, padding: 4 }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </InputField>

          {/* Password strength */}
          {pwStrength >= 0 && (
            <div>
              <div style={{ display: 'flex', gap: 3 }}>
                {STRENGTH_LEVELS.map((l, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= pwStrength ? l.color : isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', transition: 'background 0.3s' }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: STRENGTH_LEVELS[pwStrength].color, marginTop: 5, fontWeight: 600 }}>
                {STRENGTH_LEVELS[pwStrength].copy}
              </p>
            </div>
          )}

          {/* Confirm password */}
          <InputField label="Confirm Password *" icon={Lock} error={errors.confirm}>
            <input className="s3-inp" type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password"
              value={form.confirm} onChange={e => patchForm('confirm', e.target.value)}
              style={{ ...inpStyle(errors.confirm), paddingRight: 44 }} />
            <button onClick={() => setShowConfirm(p => !p)} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: sub, padding: 4 }}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {pwsMatch && (
              <span style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: 16 }}>✓</span>
            )}
          </InputField>

          {/* Gender */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280', marginBottom: 8 }}>Gender *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ v: 'male', label: '👨 Male' }, { v: 'female', label: '👩 Female' }, { v: 'other', label: '✨ Other' }].map(({ v, label }) => (
                <button key={v} onClick={() => { patchForm('gender', v); setErrors(e => ({ ...e, gender: '' })); }}
                  style={{
                    flex: 1, padding: '11px 8px', borderRadius: 12, fontFamily: 'inherit',
                    border: `2px solid ${form.gender === v ? '#7c3aed' : border}`,
                    background: form.gender === v ? (isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)') : (isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                    color: form.gender === v ? '#a855f7' : sub, fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: form.gender === v ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                    transform: form.gender === v ? 'scale(1.03)' : 'scale(1)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {errors.gender && <p style={{ color: '#f87171', fontSize: 11, marginTop: 5 }}>{errors.gender}</p>}
          </div>

          {/* Referral */}
          <div>
            <button onClick={() => setReferralOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
              {referralOpen ? '▾' : '▸'} Have a referral code?
            </button>
            {referralOpen && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input
                  className="s3-inp"
                  placeholder="e.g. MSB123456"
                  value={form.referral}
                  onChange={e => patchForm('referral', e.target.value.toUpperCase())}
                  style={{ ...inpStyle(false), paddingLeft: 14, flex: 1 }}
                />
                <button
                  onClick={() => { if (form.referral.length >= 4) setReferralApplied(true); }}
                  style={{
                    padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  Apply
                </button>
              </div>
            )}
            {referralApplied && (
              <p style={{ color: '#10b981', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                ✅ Referral applied! 🎁
              </p>
            )}
          </div>

          {/* Terms */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(er => ({ ...er, terms: '' })); }}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: sub, lineHeight: 1.5 }}>
              I agree to the{' '}
              <a href="/legal/owner-terms" target="_blank" style={{ color: '#7c3aed', fontWeight: 600 }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/legal/owner-privacy" target="_blank" style={{ color: '#7c3aed', fontWeight: 600 }}>Privacy Policy</a>
            </span>
          </div>
          {errors.terms && <p style={{ color: '#f87171', fontSize: 11, marginTop: -10 }}>{errors.terms}</p>}

          {/* Submit */}
          <button
            className="s3-btn"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 24px', borderRadius: 14,
              background: loading ? (isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb') : 'linear-gradient(135deg,#7c3aed,#ec4899)',
              color: loading ? sub : '#fff',
              fontWeight: 700, fontSize: 16, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit',
              boxShadow: !loading ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
            }}
          >
            {loading ? (
              <><div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 's3-spin 0.7s linear infinite' }} />Creating your account...</>
            ) : (
              <>Create My Account <ArrowRight size={18} /></>
            )}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: sub, margin: 0 }}>
            🔒 Your information is encrypted and never shared.
          </p>
        </div>
      </div>
    </>
  );
}
