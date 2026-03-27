// middleware/idempotency.js
/*
  Idempotency Middleware for Payment & Booking Endpoints

  How it works:
  1. Client sends header: Idempotency-Key: <uuid>
  2. First request → process normally → cache response in Redis for 24h
  3. Same key arrives again → return cached response immediately (no double charge)

  Usage:
    router.post('/create-order', idempotency, createOrderHandler)
    router.post('/verify-payment', idempotency, verifyPaymentHandler)

  Client responsibility:
    - Generate a UUID per payment attempt
    - Re-use the same UUID on retries (network failures, etc.)
    - Use a new UUID for new payment attempts
*/

const { get, set } = require('../config/redis');
const { logger } = require('../config/logger');

const IDEMPOTENCY_TTL = 86400; // 24 hours

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];

  // If no key provided, pass through (non-idempotent call)
  if (!key) return next();

  // Validate key format (must be UUID-like, prevent injection)
  if (!/^[a-zA-Z0-9_\-]{8,128}$/.test(key)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Idempotency-Key format. Use a UUID.',
    });
  }

  const redisKey = `idempotent:${key}`;

  try {
    const cached = await get(redisKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      logger.info('Idempotent request replayed', { key, statusCode: parsed.statusCode });
      res.set('X-Idempotent-Replay', 'true');
      return res.status(parsed.statusCode).json(parsed.body);
    }
  } catch (err) {
    logger.warn('Idempotency cache read failed, processing normally', { key, error: err.message });
    return next(); // degrade gracefully
  }

  // Intercept res.json to store the response
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const toCache = JSON.stringify({ statusCode: res.statusCode, body });
      await set(redisKey, toCache, IDEMPOTENCY_TTL).catch(() => {});
    }
    return originalJson(body);
  };

  next();
};

module.exports = { idempotency };
