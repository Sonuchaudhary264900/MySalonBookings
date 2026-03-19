import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://mysalonbookings.onrender.com/api/v1';

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
    const isAuthEndpoint =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/refresh-token');

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
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        return Promise.reject(error);
      }
    }

    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'Request timeout. Check your connection.'
        : !error.response
        ? 'Network error. Check your internet connection.'
        : error.message || 'Something went wrong.');

    return Promise.reject({ status: error.response?.status ?? 0, message, data: error.response?.data });
  }
);

export default api;
