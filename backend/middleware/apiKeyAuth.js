// apiKeyAuth — authenticate via X-API-Key header + enforce permissions
const ApiKey  = require('../models/ApiKey');
const { get, set } = require('../config/redis');
const { formatErrorResponse } = require('../utils/formatters');

// Check if key has required permission
const keyHasPermission = (key, permission) => {
  if (!permission) return true;
  return key.permissions.includes(permission) || key.permissions.includes(permission.split(':')[0] + ':write');
};

// Rate limit per key using Redis sliding window
const checkKeyRateLimit = async (keyId, limit) => {
  const redisKey = `api_rl:${keyId}:${Math.floor(Date.now() / 60000)}`; // per-minute bucket
  try {
    const current = await get(redisKey);
    const count   = current ? parseInt(current) : 0;
    if (count >= limit) return false;
    await set(redisKey, String(count + 1), 60);
    return true;
  } catch {
    return true; // degrade gracefully
  }
};

const apiKeyAuth = (requiredPermission) => async (req, res, next) => {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) {
    return res.status(401).json(formatErrorResponse('API key required. Pass X-API-Key header.', 401));
  }

  const apiKey = await ApiKey.findByRawKey(rawKey).catch(() => null);
  if (!apiKey) {
    return res.status(401).json(formatErrorResponse('Invalid or revoked API key.', 401));
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return res.status(401).json(formatErrorResponse('API key expired.', 401));
  }

  if (!keyHasPermission(apiKey, requiredPermission)) {
    return res.status(403).json(
      formatErrorResponse(`API key missing permission: ${requiredPermission}`, 403)
    );
  }

  const allowed = await checkKeyRateLimit(apiKey._id, apiKey.rateLimit.requestsPerMinute);
  if (!allowed) {
    return res.status(429).json(formatErrorResponse('API key rate limit exceeded.', 429));
  }

  // Update lastUsedAt async (fire-and-forget)
  ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).catch(() => {});

  req.apiKey     = apiKey;
  req.activeSalonId = apiKey.businessId;
  next();
};

module.exports = { apiKeyAuth };
