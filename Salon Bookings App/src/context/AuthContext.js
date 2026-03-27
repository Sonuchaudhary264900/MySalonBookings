import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]             = useState(true);

  // Bootstrap: restore session from cache, then refresh from server
  useEffect(() => {
    (async () => {
      try {
        const [token, cachedUser] = await AsyncStorage.multiGet(['customerToken', 'customerUser']);
        if (!token[1]) { setLoading(false); return; }
        // Restore from cache immediately so app opens without logout
        setToken(token[1]);
        if (cachedUser[1]) {
          try {
            setUser(JSON.parse(cachedUser[1]));
            setIsAuthenticated(true);
          } catch {}
        }
        // Try to refresh from server
        try {
          const res = await api.get('/customer/auth/me');
          const u = res.data.data?.customer || res.data.data || res.data.customer;
          if (u) {
            setUser(u);
            setIsAuthenticated(true);
            await AsyncStorage.setItem('customerUser', JSON.stringify(u));
          }
        } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            // Token invalid/expired — log out
            await AsyncStorage.multiRemove(['customerToken', 'customerRefreshToken', 'customerUser']);
            clearToken();
            setUser(null);
            setIsAuthenticated(false);
          }
          // Network error — keep cached session, don't log out
        }
      } catch {
        // AsyncStorage read failure — clear everything
        await AsyncStorage.multiRemove(['customerToken', 'customerRefreshToken', 'customerUser']);
        clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (phone, password) => {
    const res = await api.post('/customer/auth/login', { phone, password });
    const { token, refreshToken, customer } = res.data.data || {};
    if (!token) throw new Error('Login failed — no token received');
    await AsyncStorage.setItem('customerToken', token);
    if (refreshToken) await AsyncStorage.setItem('customerRefreshToken', refreshToken);
    setToken(token);
    const u = customer || (await api.get('/customer/auth/me')).data.data?.customer;
    if (u) await AsyncStorage.setItem('customerUser', JSON.stringify(u));
    setUser(u);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try { await api.post('/customer/auth/logout'); } catch {}
    await AsyncStorage.multiRemove(['customerToken', 'customerRefreshToken', 'customerUser']);
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/customer/auth/me');
      const u = res.data.data?.customer || res.data.data || res.data.customer;
      if (u) {
        setUser(u);
        setIsAuthenticated(true);
      }
    } catch {}
  };

  const updateProfile = async (fields) => {
    const res = await api.put('/customer/auth/me', fields);
    const u = res.data.data?.customer || res.data.data;
    if (u) {
      setUser(u);
      await AsyncStorage.setItem('customerUser', JSON.stringify(u));
    }
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
