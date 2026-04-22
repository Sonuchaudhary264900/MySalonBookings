// eventBus.js — lightweight Node.js EventEmitter for decoupled side-effects
// Usage: eventBus.emit('booking.created', { booking, owner })
//        eventBus.on('booking.created', handler)

const EventEmitter = require('events');
const { logger } = require('../config/logger');

class EventBus extends EventEmitter {
  emit(event, ...args) {
    logger.debug(`[EventBus] emit: ${event}`);
    return super.emit(event, ...args);
  }
}

const eventBus = new EventBus();
eventBus.setMaxListeners(50);

// Auto-load all listeners
require('./listeners/webhookListener');
require('./listeners/auditListener');

module.exports = eventBus;
