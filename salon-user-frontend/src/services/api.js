import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 s — fail fast instead of hanging forever
  headers: { "Content-Type": "application/json" },
});

// ── Request: attach token ──────────────────────────────────────
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("customerToken");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// ── Response: auto-refresh on 401, then retry once ────────────
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;
    const message  = error.response?.data?.message || "";

    // Retry with refreshed token on 401 (expired token)
    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem("customerRefreshToken");
        if (!refreshToken) throw new Error("no refresh token");

        const { data } = await axios.post(`${BASE_URL}/customer/auth/refresh-token`, { refreshToken });
        const newToken        = data.data?.token        ?? data.token;
        const newRefreshToken = data.data?.refreshToken ?? data.refreshToken;

        localStorage.setItem("customerToken", newToken);
        if (newRefreshToken) localStorage.setItem("customerRefreshToken", newRefreshToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return API(original); // retry original request with new token
      } catch {
        // Refresh failed — clear session and redirect
        localStorage.removeItem("customerToken");
        localStorage.removeItem("customerRefreshToken");
        const onAuthPage = ["/login", "/register"].includes(window.location.pathname);
        if (!onAuthPage) window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Wrong role token (owner logged into customer app)
    if (status === 403 && message.toLowerCase().includes("customer role")) {
      localStorage.removeItem("customerToken");
      localStorage.removeItem("customerRefreshToken");
      const onAuthPage = ["/login", "/register"].includes(window.location.pathname);
      if (!onAuthPage) window.location.href = "/login";
    }

    if (!error.response) {
      error.message = error.code === "ECONNABORTED"
        ? "Request timed out. Check your connection."
        : "Network error. Check your internet connection.";
    }

    return Promise.reject(error);
  }
);

export default API;
