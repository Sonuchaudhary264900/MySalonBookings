import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach token + clear Content-Type for FormData ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // If body is FormData, remove the default application/json header
    // so axios can set multipart/form-data with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: auto-refresh token on 401, then retry ───────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Try refresh once before giving up
    // Skip retry for auth endpoints (login/refresh) — they should surface errors directly
    const isAuthEndpoint = original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh-token');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('no refresh token');

        const { data } = await axios.post(`${BASE_URL}/owner/auth/refresh-token`, { refreshToken });
        const newToken        = data.data?.token        ?? data.token;
        const newRefreshToken = data.data?.refreshToken ?? data.refreshToken;

        localStorage.setItem('token', newToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original); // retry with new token
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // ── Normalise error shape ──────────────────────────────────
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timeout. Check your connection.' :
       !error.response           ? 'Network error. Check your internet connection.' :
       error.message             || 'Something went wrong.');

    return Promise.reject({
      status:  error.response?.status ?? 0,
      message,
      data:    error.response?.data,
    });
  }
);

export default api;
