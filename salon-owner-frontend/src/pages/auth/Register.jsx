import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { useAuth } from '../../hooks/useAuth';
import ROUTES from '../../routes';

/**
 * Register Page
 * 
 * Features:
 * - Phone OTP registration
 * - Password setup
 * - 3-step process: Phone → OTP → Password
 * - Complete error handling
 */
const Register = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, register, user } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  // ========== STATE MANAGEMENT ==========

  // Step 1: Phone number entry
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Step 2: OTP verification
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [verifiedOtp, setVerifiedOtp] = useState(''); // store OTP for register step

  // Step 3: Name, Email & Password setup
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error handling
  const [error, setError] = useState('');

  // ========== OTP TIMER EFFECT ==========

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // ========== STEP 1: SEND OTP ==========

  const validatePhone = (phone) => {
    // Accept: 10-digit mobile starting with 6-9, or +91XXXXXXXXXX, or 91XXXXXXXXXX
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
    if (digits.length === 12 && digits.startsWith('91')) return /^91[6-9]\d{9}$/.test(digits);
    return false;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setPhoneError('');

    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid phone number (10 digits)');
      return;
    }

    setPhoneLoading(true);

    try {
      // IMPORTANT: Call sendOtp from useAuth hook
      if (!sendOtp || typeof sendOtp !== 'function') {
        throw new Error('sendOtp is not available - AuthContext not properly set up');
      }

      await sendOtp(phoneNumber);
      setStep(2);
      setOtpTimer(60);
      toast.success('OTP sent to your phone!');
    } catch (err) {
      const errorMessage = err.message || 'Failed to send OTP';
      setError(errorMessage);
      console.error('Send OTP error:', err);
    } finally {
      setPhoneLoading(false);
    }
  };

  // ========== STEP 2: VERIFY OTP ==========

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpError('');

    if (!otp.trim()) {
      setOtpError('OTP is required');
      return;
    }

    if (otp.length !== 6) {
      setOtpError('OTP must be 6 digits');
      return;
    }

    setOtpLoading(true);

    try {
      if (!verifyOtp || typeof verifyOtp !== 'function') {
        throw new Error('verifyOtp is not available - AuthContext not properly set up');
      }

      await verifyOtp(phoneNumber, otp);
      setVerifiedOtp(otp); // save OTP to use in register call
      setStep(3);
      toast.success('OTP verified!');
    } catch (err) {
      setError(err.message || 'OTP verification failed');
      setOtpError('Invalid OTP. Please try again.');
      console.error('Verify OTP error:', err);
    } finally {
      setOtpLoading(false);
    }
  };
  

  // ========== STEP 3: REGISTER ==========

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password)) {
      setPasswordError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm password');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      if (!register || typeof register !== 'function') {
        throw new Error('register is not available - AuthContext not properly set up');
      }

      // Backend requires: phone, otp, name, email, password
      await register(phoneNumber, verifiedOtp, name.trim(), email.trim().toLowerCase(), password);
      toast.success('Registration successful!');
      navigate(ROUTES.SALON_REGISTER);
    } catch (err) {
      setError(err.message || 'Registration failed');
      console.error('Registration error:', err);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ========== RENDER ==========

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💈 Smart Salon</h1>
          <p className="text-gray-600">Owner Registration</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(stepNum => (
              <div
                key={stepNum}
                className={`flex-1 h-2 rounded-full transition ${
                  step >= stepNum ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              type="error"
              title="Error"
              description={error}
              dismissible
              onDismiss={() => setError('')}
            />
          )}

          {/* STEP 1: Phone Number */}
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
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError('');
                }}
                placeholder="+91 98765 43210"
                icon={<Phone className="w-5 h-5" />}
                error={!!phoneError}
                errorMessage={phoneError}
                disabled={phoneLoading}
                required
              />

              <p className="text-xs text-gray-500 text-center">
                Format: +91 followed by 10 digits
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

          {/* STEP 2: OTP Verification */}
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
                onChange={(e) => {
                  setOtp(e.target.value.slice(0, 6));
                  setOtpError('');
                }}
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

              {/* Resend OTP */}
              <div className="text-center pt-2">
                {otpTimer > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend OTP in <span className="font-bold text-blue-600">{otpTimer}s</span>
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

              {/* Change Phone */}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setOtpError('');
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-700 py-2"
              >
                Use Different Phone Number
              </button>
            </form>
          )}

          {/* STEP 3: Details & Password Setup */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Step 3 of 3</h2>
                <p className="text-gray-600">Enter your details and create a password</p>
              </div>

              {/* Name */}
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="Enter your full name"
                error={!!nameError}
                errorMessage={nameError}
                disabled={passwordLoading}
                required
              />

              {/* Email */}
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="you@example.com"
                error={!!emailError}
                errorMessage={emailError}
                disabled={passwordLoading}
                required
              />

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter (A–Z)</li>
                  <li>At least one lowercase letter (a–z)</li>
                  <li>At least one number (0–9)</li>
                  <li>At least one special character (!@#$%^&amp;* etc.)</li>
                </ul>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Create a strong password"
                    disabled={passwordLoading}
                    className={`w-full px-4 py-2 pr-10 rounded-lg border-2 focus:outline-none transition ${
                      passwordError
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-300 focus:border-blue-500'
                    } ${passwordLoading ? 'bg-gray-100' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordError('');
                    }}
                    placeholder="Confirm your password"
                    disabled={passwordLoading}
                    className={`w-full px-4 py-2 pr-10 rounded-lg border-2 focus:outline-none transition ${
                      confirmPasswordError
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-300 focus:border-blue-500'
                    } ${passwordLoading ? 'bg-gray-100' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="text-sm text-red-600">{confirmPasswordError}</p>
                )}
              </div>

              <Button
                variant="primary"
                type="submit"
                loading={passwordLoading}
                disabled={passwordLoading}
                fullWidth
                className="flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Complete Registration
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Login Link */}
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

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>By registering, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
};

export default Register;