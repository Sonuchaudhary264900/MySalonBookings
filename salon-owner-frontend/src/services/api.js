import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly auth cookies automatically
});

// Read CSRF token from cookie (non-httpOnly, set by server on GET requests)
const getCSRFToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// ── Request: attach CSRF header + clear Content-Type for FormData ──
api.interceptors.request.use(
  (config) => {
    // Attach CSRF token for all mutating requests (cookies are sent automatically)
    const SAFE = ['get', 'head', 'options'];
    if (!SAFE.includes((config.method || 'get').toLowerCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Bearer token fallback — kept for backward-compat with Android deep links / API clients
    // that might call web endpoints. Prefer cookie auth on web.
    const token = localStorage.getItem('token');
    if (token && !document.cookie.includes('token=')) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: auto-refresh token on 401, then retry ───────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isAuthEndpoint = /\/auth\/(firebase-)?(login|register)|\/auth\/refresh-token/.test(original.url || '');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        // Cookie-based refresh: server reads refreshToken cookie automatically
        const { data } = await axios.post(
          `${BASE_URL}/owner/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        // Also update localStorage for any legacy Bearer-token path
        const newToken = data.data?.token ?? data.token;
        if (newToken) localStorage.setItem('token', newToken);

        return api(original);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    if (!error.response) {
      // No response usually means the Render backend is cold-starting and the
      // gateway error page lacks CORS headers — retry a couple of times before
      // surfacing "network error" to the user.
      original._netRetries = (original._netRetries || 0) + 1;
      if (original._netRetries <= 2) {
        await new Promise(r => setTimeout(r, original._netRetries * 2000));
        return api(original);
      }
      error.message = error.code === 'ECONNABORTED'
        ? 'Request timeout. Check your connection.'
        : 'Server is waking up — please try again in a few seconds.';
    }

    return Promise.reject(error);
  }
);

// Warm up the backend as soon as the app loads so cold starts finish
// before the user submits anything (fire-and-forget).
try {
  const root = BASE_URL.replace(/\/api\/v1\/?$/, '');
  fetch(`${root}/health`).catch(() => {});
} catch { /* no-op */ }

export default api;
