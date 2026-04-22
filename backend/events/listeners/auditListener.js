// auditListener.js — writes audit logs for booking/payment events
const AuditLog = require('../../models/AuditLog');
const { logger } = require('../../config/logger');

setImmediate(() => {
  const eventBus = require('../eventBus');

  const log = (action, entity) => (payload) => {
    AuditLog.create({
      ownerId:    payload.ownerId,
      businessId: payload.salonId || payload.businessId,
      actorRole:  payload.actorRole  || 'owner',
      actorName:  payload.actorName  || 'System',
      action,
      entity,
      entityId:   payload.entityId,
      before:     payload.before,
      after:      payload.after,
      ip:         payload.ip,
      userAgent:  payload.userAgent,
    }).catch((err) => logger.warn('[AuditListener] write failed', { error: err.message }));
  };

  eventBus.on('booking.created',   log('booking.created',    'Booking'));
  eventBus.on('booking.cancelled', log('booking.cancelled',  'Booking'));
  eventBus.on('booking.completed', log('booking.completed',  'Booking'));
  eventBus.on('booking.confirmed', log('booking.confirmed',  'Booking'));
  eventBus.on('payment.received',  log('payment.received',   'Subscription'));
});
