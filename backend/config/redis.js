// config/redis.js
/*
  Redis Client — ioredis
  Supports:
  - Single instance (local/dev)
  - Redis Cloud / Upstash (production)
  - Cluster-ready via REDIS_CLUSTER_NODES env var
  - Auto-reconnect with exponential backoff
  - Graceful degradation (app works even if Redis is down)
*/

const Redis = require('ioredis');

let redisClient = null;
let isRedisConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Upstash (and any rediss:// URL) requires TLS
const isTLS = REDIS_URL.startsWith('rediss://');

let _quotaHit = false;

const redisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (_quotaHit) return null; // stop retrying completely when quota is exhausted
    if (times > 8) return null;
    return Math.min(times * 2000, 300000); // 2s → 5min max
  },
  reconnectOnError(err) {
    if (err.message.includes('READONLY')) return true;
    if (err.message.includes('max requests limit exceeded')) {
      _quotaHit = true;
      return false;
    }
    return false;
  },
  lazyConnect: false,
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  ...(isTLS && { tls: { rejectUnauthorized: false } }),
};

try {
  redisClient = new Redis(REDIS_URL, redisOptions);

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Redis Connected');
  });

  redisClient.on('ready', () => {
    isRedisConnected = true;
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    if (err.message && err.message.includes('max requests limit exceeded')) {
      _quotaHit = true;
      console.warn('⚠️  Upstash Redis quota exceeded — cache disabled until quota resets');
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Redis Error (app continues without cache):', err.message);
    }
  });

  redisClient.on('close', () => {
    isRedisConnected = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

} catch (err) {
  console.warn('⚠️  Redis init failed (app continues without cache):', err.message);
}


// ===================================================
// SAFE WRAPPERS — never throw, degrade gracefully
// ===================================================

const get = async (key) => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch { return null; }
};

const set = async (key, value, ttlSeconds = 300) => {
  if (!redisClient || !isRedisConnected) return false;
  try {
    await redisClient.setex(key, ttlSeconds, value);
    return true;
  } catch { return false; }
};

const del = async (...keys) => {
  if (!redisClient || !isRedisConnected) return false;
  try {
    await redisClient.del(...keys);
    return true;
  } catch { return false; }
};

// Pattern delete — uses SCAN (safe for production, never KEYS *)
const delPattern = async (pattern) => {
  if (!redisClient || !isRedisConnected) return false;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await redisClient.del(...keys);
    } while (cursor !== '0');
    return true;
  } catch { return false; }
};

const setJSON = async (key, value, ttlSeconds = 300) => {
  return set(key, JSON.stringify(value), ttlSeconds);
};

const getJSON = async (key) => {
  const raw = await get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const isHealthy = () => isRedisConnected;

module.exports = {
  redis: redisClient,
  isHealthy,
  get,
  set,
  del,
  delPattern,
  setJSON,
  getJSON,
};
