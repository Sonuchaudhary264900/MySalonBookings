import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [[, token], [, cachedUser]] = await AsyncStorage.multiGet(['token', 'ownerUser']);
        if (!token) { setLoading(false); return; }
        // Restore from cache immediately so app opens without logout
        if (cachedUser) {
          try { setUser(JSON.parse(cachedUser)); } catch {}
        }
        // Try to refresh from server
        try {
          const response = await api.get('/owner/auth/me');
          const u = response.data.data;
          setUser(u);
          await AsyncStorage.setItem('ownerUser', JSON.stringify(u));
        } catch (err) {
          // Interceptor shapes error as { status, message } — check both forms
          const status = err.response?.status ?? err.status;
          if (status === 401 || status === 403) {
            // Token invalid/expired — log out
            await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser']);
            setUser(null);
          }
          // Network error — keep cached session, don't log out
        }
      } catch {
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser']);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const firebaseLogin = useCallback(async (firebaseToken, phone) => {
    setError(null);
    const response = await api.post('/owner/auth/firebase-login', { firebaseToken, phone });
    if (!response.data.success) throw new Error(response.data.message || 'Login failed');
    const { token, refreshToken, owner: userData } = response.data.data;
    await AsyncStorage.setItem('token', token);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('ownerUser', JSON.stringify(userData));
    setUser(userData);
    return response.data;
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    setError(null);
    const response = await api.put('/owner/auth/me', profileData);
    if (!response.data.success) throw new Error(response.data.message || 'Failed to update profile');
    setUser(response.data.data);
    await AsyncStorage.setItem('ownerUser', JSON.stringify(response.data.data));
    return response.data;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/owner/auth/me');
      setUser(response.data.data);
      return response.data.data;
    } catch { /* silent */ }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser']);
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated: !!user, firebaseLogin, updateProfile, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
