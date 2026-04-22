// auditLogger(action, entity) — wraps a route and logs before/after state
// Usage: router.patch('/bookings/:id/status', authenticateOwner, auditLogger('booking.status_changed', 'Booking'), handler)

const AuditLog = require('../models/AuditLog');
const { logger } = require('../config/logger');

const auditLogger = (action, entity, getEntityId = (req) => req.params.id) => {
  return async (req, res, next) => {
    // Capture before state asynchronously without blocking request
    let before = null;
    try {
      const Model = require(`../models/${entity}`);
      const entityId = getEntityId(req);
      if (entityId) {
        before = await Model.findById(entityId).lean();
      }
    } catch {}

    // Intercept res.json to capture after state
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const Model  = require(`../models/${entity}`);
          const entityId = getEntityId(req);
          const after    = entityId ? await Model.findById(entityId).lean() : null;

          const ownerId    = req.owner?._id || req.staff?.ownerId;
          const businessId = req.owner?.businessId || req.activeSalonId;
          const actorRole  = req.owner ? 'owner' : (req.staff?.staffRole || 'unknown');
          const actorName  = req.owner?.name || req.staff?.name || 'Unknown';

          if (ownerId) {
            AuditLog.create({
              ownerId,
              businessId,
              actorRole,
              actorName,
              action,
              entity,
              entityId:  getEntityId(req),
              before,
              after,
              ip:        req.ip || req.connection?.remoteAddress,
              userAgent: req.headers['user-agent'],
            }).catch((err) => logger.warn('AuditLog write failed', { error: err.message }));
          }
        } catch (err) {
          logger.warn('AuditLog error', { error: err.message });
        }
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditLogger };
