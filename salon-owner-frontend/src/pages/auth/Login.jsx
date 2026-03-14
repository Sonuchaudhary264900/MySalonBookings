import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { useAuth } from '../../hooks/useAuth';
import ROUTES from '../../routes';

/**
 * Login Page
 * 
 * Features:
 * - Phone number login
 * - OTP verification
 * - Password login
 * - Remember me option
 * - Link to register
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, sendOtp, verifyOtp, user } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  // ========== STATE MANAGEMENT ==========

  // Backend only supports password login for existing owners
  const [loginMethod, setLoginMethod] = useState('password'); // always 'password'

  // Step 2: Phone number entry
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Step 3: OTP verification
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Step 4: Password login
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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

  // ========== PHONE LOGIN HANDLERS ==========

  const validatePhone = (phone) => {
    // Accept +91 or 91 or just 10 digits
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return true;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return true;
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
      await sendOtp(phoneNumber);
      setOtpSent(true);
      setOtpTimer(60); // 60 second timer
      toast.success('OTP sent to your phone!');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
      console.error('Send OTP error:', err);
    } finally {
      setPhoneLoading(false);
    }
  };

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
      await verifyOtp(phoneNumber, otp);
      toast.success('Login successful!');
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
      setOtpError('Invalid OTP. Please try again.');
      console.error('Verify OTP error:', err);
    } finally {
      setOtpLoading(false);
    }
  };

  // ========== PASSWORD LOGIN HANDLERS ==========

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setPasswordLoading(true);

    try {
      await login(phoneNumber, password);
      if (rememberMe) {
        localStorage.setItem('rememberPhone', phoneNumber);
      }
      toast.success('Login successful!');
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setError(err.message || 'Login failed');
      console.error('Login error:', err);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ========== RENDER METHODS ==========

  // Load remembered phone number on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberPhone');
    if (remembered) {
      setPhoneNumber(remembered);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💈 Smart Salon</h1>
          <p className="text-gray-600">Owner Login</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
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

          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {/* Phone Number Input */}
              <Input
                label="Phone Number"
                type="tel"
                name="phone"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError('');
                }}
                placeholder="+91 98765 43210"
                icon={<Phone className="w-5 h-5" />}
                error={!!phoneError}
                errorMessage={phoneError}
                disabled={passwordLoading}
                required
              />

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
                    placeholder="Enter your password"
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

              {/* Remember Me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>

              <Button
                variant="primary"
                type="submit"
                loading={passwordLoading}
                disabled={passwordLoading}
                fullWidth
              >
                Login
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Don't have an account?</p>
            <a
              href={ROUTES.REGISTER}
              className="inline-block px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
            >
              Register Here
            </a>
          </div>

          {/* Test Credentials */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 mb-2">
              <strong>Test Credentials:</strong>
            </p>
            <p className="text-xs text-yellow-700">Phone: +919876543210</p>
            <p className="text-xs text-yellow-700">Password: Password@123</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>By logging in, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
};

export default Login;