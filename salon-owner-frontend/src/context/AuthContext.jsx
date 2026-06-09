import React, { createContext, useState, useCallback, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();


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
        if (!token) { setLoading(false); return; }
        const role = localStorage.getItem('userRole');
        const endpoint = role === 'staff' ? '/staff/auth/me' : '/owner/auth/me';
        const response = await API.get(endpoint);
        setUser(response.data.data);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ========== REGISTER (Firebase Phone Auth) ==========
  // firebaseToken: ID token obtained from Firebase after phone OTP verification

  const register = useCallback(async (firebaseToken, name, email) => {
    try {
      setError(null);

      const response = await API.post('/owner/auth/firebase-register', {
        firebaseToken,
        name,
        ...(email ? { email } : {}),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }

      const { token, refreshToken, owner: userData } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);

      return response.data;
    } catch (err) {
      // 409 = owner already exists → auto-login with same token
      if (err.response?.status === 409) {
        try {
          const loginRes = await API.post('/owner/auth/firebase-login', { firebaseToken });
          if (!loginRes.data.success) throw new Error(loginRes.data.message || 'Login failed');
          const { token, refreshToken, owner: userData } = loginRes.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
          setUser(userData);
          return loginRes.data;
        } catch (loginErr) {
          const msg = loginErr.response?.data?.message || loginErr.message || 'Login failed';
          setError(msg);
          throw new Error(msg);
        }
      }
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // ========== LOGIN (Firebase OTP) ==========

  const login = useCallback(async (firebaseToken, phone) => {
    setError(null);
    try {
      const response = await API.post('/owner/auth/firebase-login', { firebaseToken, phone });
      if (!response.data.success) throw new Error(response.data.message || 'Login failed');
      const { token, refreshToken, owner: userData } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userRole', 'owner');
      setUser(userData);
      return response.data;
    } catch (ownerErr) {
      const ownerStatus = ownerErr.response?.status;
      const ownerMsg = (ownerErr.response?.data?.message || ownerErr.message || '').toLowerCase();
      const isNotFound = ownerStatus === 404 || ownerMsg.includes('not found') || ownerMsg.includes('no glowloox');

      if (isNotFound) {
        // Try staff login
        try {
          const staffRes = await API.post('/staff/auth/firebase-login', { firebaseToken, phone });
          if (!staffRes.data.success) throw new Error(staffRes.data.message || 'Login failed');
          const { token, refreshToken, staff: staffData } = staffRes.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('userRole', 'staff');
          setUser(staffData);
          return staffRes.data;
        } catch (staffErr) {
          const msg = staffErr.response?.data?.message || staffErr.message || 'Login failed';
          setError(msg);
          throw new Error(msg);
        }
      }

      const errorMessage = ownerErr.response?.data?.message || ownerErr.message || 'Login failed';
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
      const role = localStorage.getItem('userRole');
      const endpoint = role === 'staff' ? '/staff/auth/me' : '/owner/auth/me';
      const response = await API.get(endpoint);
      setUser(response.data.data);
      return response.data.data;
    } catch { /* silent */ }
  }, []);

  // ========== LOGOUT ==========

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
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
    register,
    login,
    updateProfile,
    changePassword,
    refreshUser,
    logout,

  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};