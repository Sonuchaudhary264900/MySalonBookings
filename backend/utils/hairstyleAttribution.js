const HairstyleInteraction = require('../models/HairstyleInteraction');
const UserFaceProfile      = require('../models/UserFaceProfile');
const { getJSON, setJSON, del, redis } = require('../config/redis');
const { logger } = require('../config/logger');

exports.storePendingAttribution = async (customerId, hairstyleId, suggestedService) => {
  await setJSON(
    `hairstyle:pending_attr:${customerId}`,
    { hairstyleId: hairstyleId.toString(), suggestedService, storedAt: Date.now() },
    7 * 24 * 3600
  );
};

exports.checkAndFireAttribution = async (customerId, bookingId, serviceNames) => {
  try {
    // Distributed lock prevents duplicate converted_booking if two processes fire simultaneously
    const lockKey = `hairstyle:attr_lock:${bookingId}`;
    const locked  = redis
      ? await redis.set(lockKey, '1', 'EX', 30, 'NX')  // ioredis syntax
      : 'OK';                                            // Redis down — proceed anyway
    if (!locked) return;

    try {
      const key     = `hairstyle:pending_attr:${customerId}`;
      const pending = await getJSON(key);
      if (!pending) return;

      const words   = (pending.suggestedService || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matched = serviceNames.some(sn => words.some(w => sn.toLowerCase().includes(w)));
      if (!matched) return;

      await HairstyleInteraction.create({
        customerId,
        hairstyleId: pending.hairstyleId,
        event_type:  'converted_booking',
        bookingId,
      });

      await UserFaceProfile.updateOne(
        { customerId },
        { $addToSet: { bookedStyleIds: pending.hairstyleId } }
      );

      await del(key);
      logger.info('hairstyle.attribution.converted', {
        customerId: customerId.toString(),
        bookingId:  bookingId.toString(),
      });
    } finally {
      if (redis) await redis.del(lockKey);
    }
  } catch (e) {
    // Non-fatal — never block booking completion
  }
};
