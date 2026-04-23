import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [[, token], [, cachedUser], [, userRole]] = await AsyncStorage.multiGet(['token', 'ownerUser', 'userRole']);
        if (!token) { setLoading(false); return; }
        if (cachedUser) {
          try { setUser(JSON.parse(cachedUser)); } catch {}
        }
        // Refresh from server based on role
        try {
          const endpoint = userRole === 'staff' ? '/staff/auth/me' : '/owner/auth/me';
          const response = await api.get(endpoint);
          const u = response.data.data;
          setUser(u);
          await AsyncStorage.setItem('ownerUser', JSON.stringify(u));
        } catch (err) {
          const status = err.response?.status ?? err.status;
          if (status === 401 || status === 403) {
            await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser', 'userRole']);
            try { await auth().signOut(); } catch {}
            setUser(null);
          }
        }
      } catch {
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser', 'userRole']);
        try { await auth().signOut(); } catch {}
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
    await AsyncStorage.setItem('userRole', 'owner');
    setUser(userData);
    return response.data;
  }, []);

  // Staff login — called when owner login returns 404
  const staffFirebaseLogin = useCallback(async (firebaseToken, phone) => {
    setError(null);
    const response = await api.post('/staff/auth/firebase-login', { firebaseToken, phone });
    if (!response.data.success) throw new Error(response.data.message || 'Staff login failed');
    const { token, refreshToken, staff: userData } = response.data.data;
    await AsyncStorage.setItem('token', token);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('ownerUser', JSON.stringify(userData));
    await AsyncStorage.setItem('userRole', 'staff');
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
      const userRole = await AsyncStorage.getItem('userRole');
      const endpoint = userRole === 'staff' ? '/staff/auth/me' : '/owner/auth/me';
      const response = await api.get(endpoint);
      setUser(response.data.data);
      return response.data.data;
    } catch { /* silent */ }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser', 'userRole']);
    try { await auth().signOut(); } catch {}
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated: !!user, firebaseLogin, staffFirebaseLogin, updateProfile, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
