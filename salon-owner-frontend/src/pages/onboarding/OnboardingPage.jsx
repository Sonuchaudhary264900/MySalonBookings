import React, { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import toast from 'react-hot-toast';
import { OnboardingProvider, useOnboarding } from '../../context/OnboardingContext';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../config/firebase';
import ROUTES from '../../routes';

// Steps 1 & 2 (phone + OTP) are handled inline — onboarding starts at profile setup
const Step1 = lazy(() => import('../../components/onboarding/steps/Step3_ProfileSetup'));
const Step2 = lazy(() => import('../../components/onboarding/steps/Step4_SalonType'));
const Step3 = lazy(() => import('../../components/onboarding/steps/Step4_SalonIdentity'));
const Step4 = lazy(() => import('../../components/onboarding/steps/Step5_Location'));
const Step5 = lazy(() => import('../../components/onboarding/steps/Step6_WorkingHours'));
const Step6 = lazy(() => import('../../components/onboarding/steps/Step7_MediaUpload'));
const Step7 = lazy(() => import('../../components/onboarding/steps/Step8_ServicesSelect'));
const Step8 = lazy(() => import('../../components/onboarding/steps/Step9_Pricing'));
const Step9 = lazy(() => import('../../components/onboarding/steps/Step10_Preview'));

const STEPS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8, Step9];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
};

function DraftSkeleton() {
  const { isDark } = useTheme();
  const base = isDark ? 'rgba(255,255,255,0.07)' : '#ede9fe';
  const shine = isDark ? 'rgba(255,255,255,0.04)' : '#f5f3ff';
  const sk = (w, h, r = 10) => (
    <div style={{ width: w, height: h, borderRadius: r, background: `linear-gradient(90deg,${base} 25%,${shine} 50%,${base} 75%)`, backgroundSize: '200% 100%', animation: 'sk-shine 1.2s infinite' }} />
  );
  return (
    <>
      <style>{`@keyframes sk-shine{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>
        {sk('60%', 36, 12)}
        {sk('85%', 16, 8)}
        <div style={{ height: 12 }} />
        {sk('100%', 120, 20)}
        <div style={{ height: 8 }} />
        {sk('100%', 60, 14)}
        {sk('100%', 60, 14)}
        <div style={{ height: 8 }} />
        {sk('55%', 48, 14)}
      </div>
    </>
  );
}

function StepRenderer() {
  const { currentStep, direction, draftLoaded } = useOnboarding();
  const StepComponent = STEPS[currentStep - 1];

  if (!draftLoaded) return <DraftSkeleton />;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStep}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        }>
          <StepComponent />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Inline phone + OTP gate ─────────────────────────────────────────── */
function OtpGate({ onVerified }) {
  const { isDark } = useTheme();
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [otpStep,    setOtpStep]    = useState(1); // 1 = phone, 2 = otp
  const [phone,      setPhone]      = useState('');
  const [otp,        setOtp]        = useState(['','','','','','']);
  const [otpTimer,   setOtpTimer]   = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const otpRefs      = useRef([]);
  const recaptchaRef = useRef(null);
  const confirmRef   = useRef(null);

  useEffect(() => {
    if (otpStep === 2) setTimeout(() => otpRefs.current[0]?.focus(), 120);
  }, [otpStep]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  // Pre-render invisible reCAPTCHA
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'ob-recaptcha';
    document.body.appendChild(container);
    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'ob-recaptcha', { size: 'invisible' });
      recaptchaRef.current.render();
    } catch {}
    return () => {
      try { recaptchaRef.current?.clear(); } catch {}
      recaptchaRef.current = null;
      document.getElementById('ob-recaptcha')?.remove();
    };
  }, []);

  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return p.trim();
  };

  const getVerifier = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    try { document.getElementById('ob-recaptcha')?.remove(); } catch {}
    const c = document.createElement('div');
    c.id = 'ob-recaptcha';
    document.body.appendChild(c);
    recaptchaRef.current = new RecaptchaVerifier(auth, 'ob-recaptcha', { size: 'invisible' });
    return recaptchaRef.current;
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g,'').length < 10) {
      setError('Enter a valid 10-digit phone number'); return;
    }
    setError(''); setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, normalizePhone(phone), getVerifier());
      confirmRef.current = confirmation;
      setOtpStep(2); setOtpTimer(60);
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
      // Try login — if owner already exists, redirect to their correct screen
      try {
        const response = await login(firebaseToken, normalizePhone(phone));
        toast.success('Welcome back!');
        const status = response?.data?.owner?.status;
        if (status === 'salon_registered' || status === 'pending_approval') {
          navigate(ROUTES.APPROVAL_WAITING, { replace: true });
        } else {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }
      } catch (loginErr) {
        const msg = loginErr.message || '';
        if (msg.toLowerCase().includes('no glowloox') || msg.toLowerCase().includes('not found')) {
          // New owner — continue with onboarding
          onVerified(firebaseToken, normalizePhone(phone));
        } else {
          throw loginErr;
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
      toast.error(err.message || 'Verification failed.');
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
      setTimeout(() => handleVerifyOtp(null, full).catch(err => setError(err?.message || 'Verification failed.')), 80);
  };

  const c = isDark;
  const card = {
    background: c ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1.5px solid ${c ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
    borderRadius: 20,
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  };
  const inp = {
    width: '100%', boxSizing: 'border-box',
    background: c ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    border: `1.5px solid ${c ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: 12, padding: '13px 16px',
    color: c ? '#f1f5f9' : '#0f172a', fontSize: 16, outline: 'none', fontFamily: 'inherit',
  };
  const btn = {
    width: '100%', padding: '13px', borderRadius: 13, fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff',
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.65 : 1, fontFamily: 'inherit',
  };

  return (
    <div style={card}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>📱</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: c ? '#f1f5f9' : '#0f172a' }}>
          {otpStep === 1 ? 'Verify your number' : 'Enter OTP'}
        </div>
        <div style={{ fontSize: 14, color: c ? '#94a3b8' : '#64748b', marginTop: 4 }}>
          {otpStep === 1
            ? 'Enter your mobile number to continue'
            : `Code sent to ${normalizePhone(phone)}`}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      {otpStep === 1 ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            style={inp}
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={e => { setPhone(e.target.value); setError(''); }}
            maxLength={13}
            autoFocus
          />
          <button type="submit" style={btn} disabled={loading}>
            {loading ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  width: 48, height: 56, borderRadius: 12, textAlign: 'center',
                  fontSize: 22, fontWeight: 800, outline: 'none', boxSizing: 'border-box',
                  background: digit ? (c ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)') : (c ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  border: digit ? '1.5px solid rgba(99,102,241,0.4)' : `1.5px solid ${c ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  color: c ? '#f1f5f9' : '#0f172a', fontFamily: 'inherit',
                }}
              />
            ))}
          </div>
          <button type="submit" style={btn} disabled={loading}>
            {loading ? 'Verifying…' : 'Verify OTP'}
          </button>
          <div style={{ textAlign: 'center', fontSize: 13, color: c ? '#94a3b8' : '#64748b' }}>
            {otpTimer > 0
              ? `Resend in ${otpTimer}s`
              : <span style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }} onClick={handleSendOtp}>Resend OTP</span>}
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Main inner component ────────────────────────────────────────────── */
function OnboardingInner() {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { update, data, currentStep, draftLoaded } = useOnboarding();
  const [showOtpGate, setShowOtpGate] = useState(false);

  // Pre-fill phone + firebase token passed from Login after OTP verification
  useEffect(() => {
    const state = location.state;
    if (state?.phone && state?.firebaseToken) {
      update({ phone: state.phone, firebaseToken: state.firebaseToken });
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard: if at step 1 with no firebase token and no existing JWT, show inline OTP
  useEffect(() => {
    if (!draftLoaded) return;
    const hasJwt = !!localStorage.getItem('token');
    const incomingToken = location.state?.firebaseToken;
    if (currentStep === 1 && !data.firebaseToken && !incomingToken && !hasJwt) {
      setShowOtpGate(true);
    } else {
      setShowOtpGate(false);
    }
  }, [draftLoaded, currentStep, data.firebaseToken, location.state]);

  // Already approved → go to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (user?.status === 'approved' || user?.status === 'salon_registered') {
        if (user?.status === 'approved') {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  const handleOtpVerified = (firebaseToken, phone) => {
    update({ phone, firebaseToken });
    setShowOtpGate(false);
  };

  return (
    <OnboardingLayout>
      {showOtpGate
        ? <OtpGate onVerified={handleOtpVerified} />
        : <StepRenderer />}
    </OnboardingLayout>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingInner />
    </OnboardingProvider>
  );
}
