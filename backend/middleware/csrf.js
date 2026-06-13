// CSRF protection — double-submit cookie pattern
// Works alongside httpOnly auth cookies.
// Mobile clients (no cookies) are auto-exempted.

const crypto = require('crypto');
const { setCSRFCookie } = require('../utils/cookies');

// Routes that never need CSRF (webhooks use HMAC, GET is safe)
const EXEMPT_PATTERNS = [
  /^\/api\/v1\/owner\/subscription\/webhook/,
  /^\/api\/v1\/staff\/auth\//,       // mobile staff login
  /^\/health/,
  /^\/metrics/,
  /^\/ping/,
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrf = (req, res, next) => {
  // Always issue / refresh CSRF token on GET (page loads)
  if (SAFE_METHODS.has(req.method)) {
    if (!req.cookies?.['csrf-token']) {
      setCSRFCookie(res, crypto.randomBytes(32).toString('hex'));
    }
    return next();
  }

  // Exempt patterns
  if (EXEMPT_PATTERNS.some((p) => p.test(req.originalUrl))) return next();

  // If no auth cookie present → likely a mobile/API client (Bearer token) → skip CSRF
  if (!req.cookies?.token && !req.cookies?.refreshToken) return next();

  const cookieToken  = req.cookies?.['csrf-token'];
  const headerToken  = req.headers['x-csrf-token'];

  // Constant-time comparison to avoid leaking the token via timing.
  const tokensMatch = (a, b) => {
    if (!a || !b) return false;
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  };

  if (!tokensMatch(cookieToken, headerToken)) {
    return res.status(403).json({ success: false, message: 'CSRF token mismatch. Refresh and try again.' });
  }

  next();
};

module.exports = { csrf };
