import React, { createContext, useState, useCallback, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

// Normalize phone to +91XXXXXXXXXX and validate Indian mobile format
const normalizeAndValidatePhone = (phone) => {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) digits = '+' + digits;
  else if (!String(phone).startsWith('+')) digits = '+' + digits;
  const normalized = digits.startsWith('+') ? digits : '+' + digits;
  if (!/^\+91[6-9]\d{9}$/.test(normalized)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number');
  }
  return normalized;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========== INITIALIZATION ==========

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Verify token by fetching user data
        const response = await API.get('/owner/auth/me');
        setUser(response.data.data);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ========== SEND OTP ==========

  const sendOtp = useCallback(async (phoneNumber) => {
    try {
      setError(null);

      const phone = normalizeAndValidatePhone(phoneNumber);
      const response = await API.post('/owner/auth/send-otp', {
        phone,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send OTP');
      }

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== VERIFY OTP ==========

  const verifyOtp = useCallback(async (phoneNumber, otp) => {
    try {
      setError(null);

      const phone = normalizeAndValidatePhone(phoneNumber);
      const response = await API.post('/owner/auth/verify-otp', {
        phone,
        otp,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'OTP verification failed');
      }

      // verify-otp only confirms the OTP, does NOT return token/user
      // token is issued after the full register step
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== REGISTER ==========

  const register = useCallback(async (phoneNumber, otp, name, email, password) => {
    try {
      setError(null);

      const phone = normalizeAndValidatePhone(phoneNumber);
      const response = await API.post('/owner/auth/register', {
        phone,
        otp,
        name,
        email,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }

      const { token, refreshToken, owner: userData } = response.data.data;

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      // Update user state
      setUser(userData);

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== LOGIN ==========

  const login = useCallback(async (phoneNumber, password) => {
    try {
      setError(null);

      // Backend expects `identifier` (phone or email), not `phone`
      const response = await API.post('/owner/auth/login', {
        identifier: phoneNumber,
        password: password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      // Backend returns `owner` not `user`
      const { token, refreshToken, owner: userData } = response.data.data;

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      // Update user state
      setUser(userData);

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== UPDATE PROFILE ==========

  const updateProfile = useCallback(async (profileData) => {
    try {
      setError(null);

      const response = await API.put('/owner/auth/me', profileData);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update profile');
      }

      // Update user state
      setUser(response.data.data);

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== CHANGE PASSWORD ==========

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      setError(null);

      const response = await API.post('/owner/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to change password');
      }

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to change password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== REFRESH USER ==========

  const refreshUser = useCallback(async () => {
    try {
      const response = await API.get('/owner/auth/me');
      setUser(response.data.data);
      return response.data.data;
    } catch { /* silent */ }
  }, []);

  // ========== LOGOUT ==========

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setError(null);
  }, []);

  // ========== CONTEXT VALUE ==========

  const value = {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,

    // Methods
    sendOtp,
    verifyOtp,
    register,
    login,
    updateProfile,
    changePassword,
    refreshUser,
    logout,

  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};