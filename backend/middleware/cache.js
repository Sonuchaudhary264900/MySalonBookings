// middleware/cache.js
/*
  Redis Cache Middleware
  Usage:
    router.get('/salons', cache('salons', 300), salonController.list)

  Cache key builder helpers:
    cacheKey.salons(city, gender, category)
    cacheKey.salonProfile(salonId)
    cacheKey.slots(salonId, barberId, date)
    cacheKey.services(salonId)

  Cache invalidation helpers (call from controllers after writes):
    invalidate.salon(salonId, city)
    invalidate.slots(salonId, barberId, date)
*/

const { getJSON, setJSON, del, delPattern } = require('../config/redis');
const { logger } = require('../config/logger');

// ===================================================
// TTL CONSTANTS (seconds)
// ===================================================
const TTL = {
  SALON_LIST:    300,   // 5 min  — nearby/search results
  SALON_PROFILE: 600,   // 10 min — individual salon page
  SLOTS:          60,   // 1 min  — must be near real-time
  SERVICES:      900,   // 15 min — rarely changes
  USER_SESSION: 3600,   // 1 hr   — auth session
};

// ===================================================
// KEY BUILDERS
// ===================================================
const cacheKey = {
  salons:       (city = 'all', gender = 'all', cat = 'all', sort = 'nearby', lat = 0, lng = 0) =>
                  `salons:${city}:${gender}:${cat}:${sort}:${String(lat).slice(0,7)}:${String(lng).slice(0,7)}`,
  salonProfile: (salonId) => `salon:${salonId}`,
  slots:        (salonId, barberId, date) => `slots:${salonId}:${barberId}:${date}`,
  services:     (salonId) => `services:${salonId}`,
  userSession:  (userId)  => `session:${userId}`,
};

// ===================================================
// EXPRESS CACHE MIDDLEWARE
// Usage: router.get('/path', cache(TTL.SALON_LIST), handler)
// ===================================================
const cache = (ttlSeconds = 300, keyFn = null) => {
  return async (req, res, next) => {
    const key = keyFn ? keyFn(req) : `route:${req.originalUrl}`;

    try {
      const cached = await getJSON(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      res.set('X-Cache', 'MISS');
    } catch (err) {
      logger.warn('Cache read error (bypassing)', { key, error: err.message });
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await setJSON(key, body, ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
};

// ===================================================
// INVALIDATION HELPERS — call after write operations
// ===================================================
const invalidate = {
  // Invalidate all salon listing caches for a city
  salonList: async (city = '') => {
    await delPattern(`salons:${city}:*`);
    await delPattern('salons:all:*');
    logger.debug('Cache invalidated: salon listings', { city });
  },

  // Invalidate a specific salon's profile cache
  salonProfile: async (salonId) => {
    await del(cacheKey.salonProfile(salonId));
    logger.debug('Cache invalidated: salon profile', { salonId });
  },

  // Invalidate all caches for a salon (profile + listings + services)
  salon: async (salonId, city = '') => {
    await Promise.all([
      invalidate.salonList(city),
      invalidate.salonProfile(salonId),
      del(cacheKey.services(salonId)),
    ]);
  },

  // Invalidate slot cache after a booking is created/cancelled
  slots: async (salonId, barberId, date) => {
    await del(cacheKey.slots(salonId, barberId, date));
    logger.debug('Cache invalidated: slots', { salonId, barberId, date });
  },

  // Invalidate user session cache
  userSession: async (userId) => {
    await del(cacheKey.userSession(userId));
  },
};

module.exports = { cache, cacheKey, invalidate, TTL };
