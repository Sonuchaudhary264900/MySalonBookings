// queues/index.js
/*
  BullMQ Queue Registry
  All queues are defined here and shared across producers and workers.

  Queues:
  - notifications   (push/SMS/email triggers)
  - emails          (nodemailer jobs)
  - bookingReminder (24h, 1h, 30min reminders)
  - analytics       (event ingestion)
  - refunds         (Razorpay refund jobs with retry)

  Priority levels:
  - 1 = highest (payment/refund)
  - 5 = normal  (reminders)
  - 10 = lowest (analytics)
*/

const { Queue } = require('bullmq');
const { redis } = require('../config/redis');
const { logger } = require('../config/logger');

// BullMQ needs a separate connection (not shared with cache ops)
const IORedis = require('ioredis');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let queueConnection = null;

const getQueueConnection = () => {
  if (!queueConnection) {
    queueConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
  }
  return queueConnection;
};

// ===================================================
// QUEUE DEFINITIONS
// ===================================================
let queues = {};

const initQueues = () => {
  const conn = getQueueConnection();

  const defaultOpts = {
    connection: conn,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },   // keep last 100 completed
      removeOnFail:     { count: 500 },   // keep last 500 failed for debugging
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,  // 2s, 4s, 8s
      },
    },
  };

  queues = {
    notifications:   new Queue('notifications',   { ...defaultOpts, defaultJobOptions: { ...defaultOpts.defaultJobOptions, priority: 5 } }),
    emails:          new Queue('emails',          { ...defaultOpts, defaultJobOptions: { ...defaultOpts.defaultJobOptions, priority: 5 } }),
    bookingReminder: new Queue('bookingReminder', { ...defaultOpts, defaultJobOptions: { ...defaultOpts.defaultJobOptions, priority: 5 } }),
    analytics:       new Queue('analytics',       { ...defaultOpts, defaultJobOptions: { ...defaultOpts.defaultJobOptions, attempts: 1, priority: 10 } }),
    refunds:         new Queue('refunds',         { ...defaultOpts, defaultJobOptions: { ...defaultOpts.defaultJobOptions, priority: 1, attempts: 5 } }),
  };

  logger.info('✅ BullMQ Queues initialized');
  return queues;
};

// ===================================================
// PRODUCER HELPERS — use these in controllers/cron
// ===================================================

const addNotificationJob = async (type, data, delayMs = 0) => {
  if (!queues.notifications) return null;
  return queues.notifications.add(type, data, {
    delay: delayMs,
    jobId: data.jobId || undefined,  // set jobId to prevent duplicates
  });
};

const addEmailJob = async (type, data) => {
  if (!queues.emails) return null;
  return queues.emails.add(type, data);
};

const addReminderJob = async (bookingId, type, runAt) => {
  if (!queues.bookingReminder) return null;
  const delayMs = Math.max(0, new Date(runAt).getTime() - Date.now());
  return queues.bookingReminder.add(type, { bookingId }, {
    delay: delayMs,
    jobId: `reminder:${type}:${bookingId}`,  // dedup — same booking won't get 2 reminders
    removeOnComplete: true,
  });
};

const addAnalyticsJob = async (event, data) => {
  if (!queues.analytics) return null;
  return queues.analytics.add(event, data).catch(() => null); // fire-and-forget
};

const addRefundJob = async (paymentId, amount, reason) => {
  if (!queues.refunds) return null;
  return queues.refunds.add('process_refund', { paymentId, amount, reason }, {
    priority: 1,
    jobId: `refund:${paymentId}`,  // idempotent — one refund per payment
  });
};

module.exports = {
  initQueues,
  getQueueConnection,
  get queues() { return queues; },
  addNotificationJob,
  addEmailJob,
  addReminderJob,
  addAnalyticsJob,
  addRefundJob,
};
