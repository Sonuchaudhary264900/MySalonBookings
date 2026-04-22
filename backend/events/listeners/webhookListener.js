// webhookListener.js — delivers events to registered webhook endpoints
const axios           = require('axios');
const WebhookEndpoint = require('../../models/WebhookEndpoint');
const { logger }      = require('../../config/logger');

const WEBHOOK_EVENTS = [
  'booking.created','booking.confirmed','booking.cancelled','booking.completed',
  'payment.received','review.created','customer.blocked',
];

const deliverWebhook = async (endpoint, event, payload) => {
  const body      = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = endpoint.sign(body);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.post(endpoint.url, body, {
        headers: {
          'Content-Type':       'application/json',
          'X-Glowloox-Event':   event,
          'X-Glowloox-Signature': `sha256=${signature}`,
        },
        timeout: 10000,
      });

      await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
        failureCount:   0,
        lastDeliveryAt: new Date(),
        $push: {
          deliveryLog: {
            $each:     [{ event, statusCode: res.status, attempt, success: true }],
            $slice:    -50, // keep last 50 entries
          },
        },
      });
      return;
    } catch (err) {
      const statusCode = err.response?.status || 0;
      logger.warn(`[Webhook] delivery failed`, { url: endpoint.url, attempt, statusCode, error: err.message });

      if (attempt === maxRetries) {
        await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
          $inc: { failureCount: 1 },
          $push: {
            deliveryLog: {
              $each:  [{ event, statusCode, attempt, success: false, error: err.message }],
              $slice: -50,
            },
          },
        });

        // Disable endpoint after 20 consecutive failures (dead-letter)
        const doc = await WebhookEndpoint.findById(endpoint._id);
        if (doc?.failureCount >= 20) {
          await WebhookEndpoint.findByIdAndUpdate(endpoint._id, { isActive: false });
          logger.warn(`[Webhook] endpoint disabled after 20 failures`, { url: endpoint.url });
        }
      } else {
        // Exponential backoff before retry
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
};

// Fan-out to all active endpoints for this business + event
const fanOut = async (event, payload) => {
  try {
    const businessId = payload?.salonId || payload?.businessId;
    if (!businessId) return;

    const endpoints = await WebhookEndpoint.find({
      businessId,
      isActive: true,
      events:   event,
    }).select('+secret');

    await Promise.allSettled(endpoints.map((ep) => deliverWebhook(ep, event, payload)));
  } catch (err) {
    logger.error('[Webhook] fanOut error', { error: err.message });
  }
};

// Register listeners for all webhook-triggering events
const eventBusModule = module; // avoid circular at top level
setImmediate(() => {
  const eventBus = require('../eventBus');
  WEBHOOK_EVENTS.forEach((event) => {
    eventBus.on(event, (payload) => fanOut(event, payload));
  });
});
