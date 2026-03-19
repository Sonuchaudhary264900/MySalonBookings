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
        const token = await AsyncStorage.getItem('token');
        if (!token) { setLoading(false); return; }
        const response = await api.get('/owner/auth/me');
        setUser(response.data.data);
      } catch {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (identifier, password) => {
    setError(null);
    const response = await api.post('/owner/auth/login', { identifier, password });
    if (!response.data.success) throw new Error(response.data.message || 'Login failed');
    const { token, refreshToken, owner: userData } = response.data.data;
    await AsyncStorage.setItem('token', token);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    return response.data;
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    setError(null);
    const response = await api.put('/owner/auth/me', profileData);
    if (!response.data.success) throw new Error(response.data.message || 'Failed to update profile');
    setUser(response.data.data);
    return response.data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setError(null);
    const response = await api.post('/owner/auth/change-password', { currentPassword, newPassword });
    if (!response.data.success) throw new Error(response.data.message || 'Failed to change password');
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
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated: !!user, login, updateProfile, changePassword, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
