import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.glowloox.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = /\/auth\/(firebase-)?(login|register)|\/auth\/refresh-token/.test(original.url || '');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('no refresh token');
        const { data } = await axios.post(`${BASE_URL}/owner/auth/refresh-token`, { refreshToken });
        const newToken = data.data?.token ?? data.token;
        const newRefreshToken = data.data?.refreshToken ?? data.refreshToken;
        await AsyncStorage.setItem('token', newToken);
        if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'ownerUser']);
        return Promise.reject(error);
      }
    }

    if (!error.response) {
      // Render cold start — retry for up to ~45s before surfacing a network error
      original._netRetries = (original._netRetries || 0) + 1;
      const MAX_NET_RETRIES = 8;
      if (original._netRetries <= MAX_NET_RETRIES) {
        const delay = Math.min(original._netRetries * 3000, 8000);
        await new Promise(r => setTimeout(r, delay));
        return api(original);
      }
      error.message = error.code === 'ECONNABORTED'
        ? 'Request timeout. Check your connection.'
        : 'Server is waking up — please try again in a few seconds.';
    }

    return Promise.reject(error);
  }
);

export default api;
