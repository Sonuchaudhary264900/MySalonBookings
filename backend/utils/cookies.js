// Cookie configuration helpers for httpOnly auth tokens
const isProd = process.env.NODE_ENV === 'production';

const TOKEN_TTL_MS     = 24 * 60 * 60 * 1000;        // 24h
const REFRESH_TTL_MS   = 7  * 24 * 60 * 60 * 1000;   // 7d

const BASE_OPTS = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'Strict' : 'Lax',
  path:     '/',
};

const setAuthCookies = (res, token, refreshToken) => {
  res.cookie('token',        token,        { ...BASE_OPTS, maxAge: TOKEN_TTL_MS });
  res.cookie('refreshToken', refreshToken, { ...BASE_OPTS, maxAge: REFRESH_TTL_MS });
};

const clearAuthCookies = (res) => {
  res.clearCookie('token',        { ...BASE_OPTS });
  res.clearCookie('refreshToken', { ...BASE_OPTS });
};

// Non-httpOnly CSRF token — readable by JS, used for double-submit pattern
const setCSRFCookie = (res, csrfToken) => {
  res.cookie('csrf-token', csrfToken, {
    httpOnly: false,
    secure:   isProd,
    sameSite: isProd ? 'Strict' : 'Lax',
    path:     '/',
    maxAge:   TOKEN_TTL_MS,
  });
};

module.exports = { setAuthCookies, clearAuthCookies, setCSRFCookie };
