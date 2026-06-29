import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.glowloox.com/api/v1';

// In-memory token for sync access in interceptors
let _token = null;

export const setToken = (t) => { _token = t; };
export const clearToken = () => { _token = null; };

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((req) => {
  if (_token) req.headers.Authorization = `Bearer ${_token}`;
  return req;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;

    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('customerRefreshToken');
        if (!refreshToken) throw new Error('no refresh token');

        const { data } = await axios.post(`${BASE_URL}/customer/auth/refresh-token`, { refreshToken });
        const newToken        = data.data?.token        ?? data.token;
        const newRefreshToken = data.data?.refreshToken ?? data.refreshToken;

        await AsyncStorage.setItem('customerToken', newToken);
        if (newRefreshToken) await AsyncStorage.setItem('customerRefreshToken', newRefreshToken);
        setToken(newToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        await AsyncStorage.multiRemove(['customerToken', 'customerRefreshToken', 'customerUser']);
        clearToken();
        return Promise.reject(error);
      }
    }

    const msg =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timed out. Check your connection.' :
       !error.response              ? 'Network error. Check your internet connection.' :
       error.message               || 'Something went wrong.');

    return Promise.reject({ status: status ?? 0, message: msg, data: error.response?.data });
  }
);

export default api;
