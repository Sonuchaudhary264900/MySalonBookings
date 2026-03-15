import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Eye, EyeOff, Phone, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../config/firebase';
import ROUTES from '../../routes';

/**
 * Register Page — Firebase Phone Auth OTP
 * Flow: Step 1 (Phone) → Step 2 (OTP via Firebase) → Step 3 (Name/Email/Password)
 */
const Register = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();

  useEffect(() => {
    if (user) navigate(ROUTES.DASHBOARD);
  }, [user, navigate]);

  // ── Step state ──────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Step 1: phone
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Step 2: OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Step 3: details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Firebase refs
  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);
  const firebaseTokenRef = useRef('');

  // ── reCAPTCHA helpers ─────────────────────────────────────────
  const getRecaptcha = () => {
    // Destroy existing verifier
    try { recaptchaVerifierRef.current?.clear(); } catch {}
    recaptchaVerifierRef.current = null;

    // Remove any previous container from body (outside React's control)
    document.getElementById('recaptcha-container')?.remove();

    // Create a fresh container appended to body — React will never touch it
    const container = document.createElement('div');
    container.id = 'recaptcha-container';
    document.body.appendChild(container);

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  useEffect(() => {
    return () => {
      try { recaptchaVerifierRef.current?.clear(); } catch {}
      recaptchaVerifierRef.current = null;
      document.getElementById('recaptcha-container')?.remove();
    };
  }, []);

  // ── OTP countdown ────────────────────────────────────────────
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  // ── Helpers ──────────────────────────────────────────────────
  const normalizePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return '+91' + digits;
    if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
    if (phone.startsWith('+')) return phone;
    return '+' + digits;
  };

  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
    if (digits.length === 12 && digits.startsWith('91')) return /^91[6-9]\d{9}$/.test(digits);
    return false;
  };

  // ── Step 1: Send OTP via Firebase ────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setPhoneError('');

    if (!phoneNumber.trim()) { setPhoneError('Phone number is required'); return; }
    if (!validatePhone(phoneNumber)) { setPhoneError('Enter a valid 10-digit Indian mobile number'); return; }

    setPhoneLoading(true);
    try {
      const normalized = normalizePhone(phoneNumber);
      const verifier = getRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, normalized, verifier);
      confirmationResultRef.current = confirmation;
      setStep(2);
      setOtpTimer(60);
      toast.success('OTP sent to ' + normalized);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Step 2: Verify OTP via Firebase ─────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpError('');

    if (!otp.trim()) { setOtpError('OTP is required'); return; }
    if (otp.length !== 6) { setOtpError('OTP must be 6 digits'); return; }

    setOtpLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp);
      // Get Firebase ID token to send to our backend
      firebaseTokenRef.current = await result.user.getIdToken();
      setStep(3);
      toast.success('Phone verified!');
    } catch (err) {
      setOtpError('Invalid OTP. Please try again.');
      setError(err.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Step 3: Register with backend ───────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim()) { setNameError('Name is required'); return; }
    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email'); return; }
    if (!password) { setPasswordError('Password is required'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password)) {
      setPasswordError('Min 8 chars with uppercase, lowercase, number and special character');
      return;
    }
    if (!confirmPassword) { setConfirmPasswordError('Please confirm password'); return; }
    if (password !== confirmPassword) { setConfirmPasswordError('Passwords do not match'); return; }

    setRegLoading(true);
    try {
      await register(firebaseTokenRef.current, name.trim(), email.trim().toLowerCase(), password);
      toast.success('Registration successful!');
      navigate(ROUTES.SALON_REGISTER);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">

      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">💈 Smart Salon</h1>
          <p className="text-blue-100">Owner Registration</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`flex-1 h-2 rounded-full transition ${step >= n ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>

          {error && (
            <Alert type="error" title="Error" description={error} dismissible onDismiss={() => setError('')} />
          )}

          {/* STEP 1: Phone */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Step 1 of 3</h2>
                <p className="text-gray-600">Enter your phone number to register</p>
              </div>

              <Input
                label="Phone Number"
                type="tel"
                value={phoneNumber}
                onChange={e => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                placeholder="+91 98765 43210"
                icon={<Phone className="w-5 h-5" />}
                error={!!phoneError}
                errorMessage={phoneError}
                disabled={phoneLoading}
                required
              />

              <p className="text-xs text-gray-500 text-center">
                OTP will be sent via SMS (powered by Firebase)
              </p>

              <Button
                variant="primary"
                type="submit"
                loading={phoneLoading}
                disabled={phoneLoading}
                fullWidth
                className="flex items-center justify-center gap-2"
              >
                Send OTP
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* STEP 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Step 2 of 3</h2>
                <p className="text-gray-600">Verify your phone number</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center mb-4">
                <p className="text-sm text-blue-700">
                  OTP sent to <strong>{phoneNumber}</strong>
                </p>
              </div>

              <Input
                label="Enter OTP"
                type="text"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                placeholder="000000"
                inputMode="numeric"
                maxLength="6"
                error={!!otpError}
                errorMessage={otpError}
                disabled={otpLoading}
                required
              />

              <Button
                variant="primary"
                type="submit"
                loading={otpLoading}
                disabled={otpLoading}
                fullWidth
              >
                Verify OTP
              </Button>

              <div className="text-center pt-2">
                {otpTimer > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend in <span className="font-bold text-blue-600">{otpTimer}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    disabled={phoneLoading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setOtpError(''); }}
                className="w-full text-sm text-gray-600 hover:text-gray-700 py-2"
              >
                Use Different Phone Number
              </button>
            </form>
          )}

          {/* STEP 3: Name / Email / Password */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Step 3 of 3</h2>
                <p className="text-gray-600">Enter your details and create a password</p>
              </div>

              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setNameError(''); }}
                placeholder="Enter your full name"
                error={!!nameError}
                errorMessage={nameError}
                disabled={regLoading}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="you@example.com"
                error={!!emailError}
                errorMessage={emailError}
                disabled={regLoading}
                required
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters</li>
                  <li>Uppercase, lowercase, number, special character</li>
                </ul>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Create a strong password"
                    disabled={regLoading}
                    className={`w-full px-4 py-2 pr-10 rounded-lg border-2 focus:outline-none transition ${
                      passwordError ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } ${regLoading ? 'bg-gray-100' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
                    placeholder="Confirm your password"
                    disabled={regLoading}
                    className={`w-full px-4 py-2 pr-10 rounded-lg border-2 focus:outline-none transition ${
                      confirmPasswordError ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } ${regLoading ? 'bg-gray-100' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPasswordError && <p className="text-sm text-red-600">{confirmPasswordError}</p>}
              </div>

              <Button
                variant="primary"
                type="submit"
                loading={regLoading}
                disabled={regLoading}
                fullWidth
                className="flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Complete Registration
              </Button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Already have an account?</p>
            <a
              href={ROUTES.LOGIN}
              className="inline-block px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
            >
              Login Here
            </a>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-blue-100">
          <p>By registering, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
