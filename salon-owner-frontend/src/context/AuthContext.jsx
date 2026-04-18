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

  // ========== REGISTER (Firebase Phone Auth) ==========
  // firebaseToken: ID token obtained from Firebase after phone OTP verification

  const register = useCallback(async (firebaseToken, name, email, password, gender) => {
    try {
      setError(null);

      const response = await API.post('/owner/auth/firebase-register', {
        firebaseToken,
        name,
        email,
        password,
        gender,
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

  // ========== LOGIN (Firebase OTP) ==========

  const login = useCallback(async (firebaseToken) => {
    try {
      setError(null);

      const response = await API.post('/owner/auth/firebase-login', { firebaseToken });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      const { token, refreshToken, owner: userData } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

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
    register,
    login,
    updateProfile,
    changePassword,
    refreshUser,
    logout,

  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};