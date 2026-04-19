// queues/workers.js
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { logger } = require('../config/logger');
const { metrics } = require('../middleware/metrics');
const { sendExpoPush } = require('../services/pushService');
const { initiateRefund } = require('../config/razorpay');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = REDIS_URL.startsWith('rediss://');

// Track whether the quota limit has been hit — circuit breaker
let quotaExceeded = false;

// Single shared connection config for all workers.
// BullMQ calls .duplicate() internally, so each worker gets its own connection,
// but they all inherit this config — one source of truth for retry behaviour.
const attachErrorHandler = (conn) => {
  conn.on('error', (err) => {
    if (err.message && err.message.includes('ERR max requests limit exceeded')) {
      if (!quotaExceeded) {
        quotaExceeded = true;
        logger.warn('[Workers] Upstash Redis quota exceeded — stopping all workers');
        stopAllWorkers().catch(() => {});
      }
    }
  });
  // Patch duplicate() so BullMQ's internal connections also have an error handler
  const _dup = conn.duplicate.bind(conn);
  conn.duplicate = (...args) => {
    const d = _dup(...args);
    attachErrorHandler(d);
    return d;
  };
  return conn;
};

const makeWorkerConn = () => {
  const conn = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,   // required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      if (quotaExceeded) return null;
      if (times > 8) return null;
      return Math.min(times * 2000, 300000);
    },
    reconnectOnError(err) {
      if (err.message && err.message.includes('ERR max requests limit exceeded')) {
        quotaExceeded = true;
        return false;
      }
      return false;
    },
    ...(isTLS && { tls: { rejectUnauthorized: false } }),
  });

  return attachErrorHandler(conn);
};

const workers = [];

// ===================================================
// NOTIFICATION WORKER
// ===================================================
const notificationWorker = new Worker('notifications', async (job) => {
  const { token, title, body, data } = job.data;
  if (!token) return;
  await sendExpoPush(token, title, body, data || {});
  metrics.queueJobsTotal.inc({ queue: 'notifications', status: 'completed' });
}, {
  connection: makeWorkerConn(),
  concurrency: 5,
});

// ===================================================
// EMAIL WORKER
// ===================================================
const emailWorker = new Worker('emails', async (job) => {
  if (process.env.GMAIL_ENABLED !== 'true') {
    logger.info('[Email disabled] Skipping email job', { subject: job.data.subject, to: job.data.to });
    return;
  }
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail(job.data);
  metrics.queueJobsTotal.inc({ queue: 'emails', status: 'completed' });
}, {
  connection: makeWorkerConn(),
  concurrency: 2,
});

// ===================================================
// BOOKING REMINDER WORKER
// ===================================================
const bookingReminderWorker = new Worker('bookingReminder', async (job) => {
  const Booking = require('../models/Booking');
  const booking = await Booking.findById(job.data.bookingId)
    .populate('customerId', 'expoPushToken name')
    .populate('salonId', 'name')
    .lean();

  if (!booking || booking.status === 'cancelled') return;

  const token = booking.customerId?.expoPushToken;
  if (!token) return;

  const messages = {
    '24h_reminder':   { title: '📅 Appointment Tomorrow', body: `Your booking at ${booking.salonId?.name} is tomorrow. See you there!` },
    '1h_reminder':    { title: '⏰ 1 Hour to Go!',        body: `Your appointment at ${booking.salonId?.name} is in 1 hour.` },
    '30min_reminder': { title: '🕐 30 Minutes!',          body: `Your appointment at ${booking.salonId?.name} starts in 30 minutes. Get ready!` },
  };

  const msg = messages[job.name];
  if (msg) await sendExpoPush(token, msg.title, msg.body, { bookingId: booking._id });

  metrics.queueJobsTotal.inc({ queue: 'bookingReminder', status: 'completed' });
}, {
  connection: makeWorkerConn(),
  concurrency: 3,
});

// ===================================================
// ANALYTICS WORKER — low priority, skip if quota hit
// ===================================================
const analyticsWorker = new Worker('analytics', async (job) => {
  logger.info('analytics_event', { event: job.name, ...job.data });
  metrics.queueJobsTotal.inc({ queue: 'analytics', status: 'completed' });
}, {
  connection: makeWorkerConn(),
  concurrency: 2,
});

// ===================================================
// REFUND WORKER
// ===================================================
const refundWorker = new Worker('refunds', async (job) => {
  const { paymentId, amount } = job.data;
  logger.info('Processing refund', { paymentId, amount });
  await initiateRefund(paymentId, amount);
  logger.info('Refund processed', { paymentId });
  metrics.queueJobsTotal.inc({ queue: 'refunds', status: 'completed' });
}, {
  connection: makeWorkerConn(),
  concurrency: 2,
});

// ===================================================
// ERROR HANDLERS
// ===================================================
const allWorkers = [
  { worker: notificationWorker,    name: 'notifications' },
  { worker: emailWorker,           name: 'emails' },
  { worker: bookingReminderWorker, name: 'bookingReminder' },
  { worker: analyticsWorker,       name: 'analytics' },
  { worker: refundWorker,          name: 'refunds' },
];

const lastErrorLog = {};

allWorkers.forEach(({ worker, name }) => {
  worker.on('failed', (job, err) => {
    metrics.queueJobsTotal.inc({ queue: name, status: 'failed' });
    logger.error(`Queue job failed [${name}]`, {
      jobId:    job?.id,
      jobName:  job?.name,
      attempts: job?.attemptsMade,
      error:    err.message,
    });
  });

  worker.on('error', (err) => {
    const isRateLimit = err.message?.includes('ERR max requests limit exceeded');
    const now = Date.now();
    const last = lastErrorLog[name] || 0;
    const throttle = isRateLimit ? 300000 : 10000; // rate-limit: 5min, others: 10s
    if (now - last > throttle) {
      lastErrorLog[name] = now;
      if (isRateLimit) {
        logger.warn(`Worker [${name}] Upstash quota exceeded — workers will stop.`);
      } else {
        logger.error(`Worker error [${name}]`, { error: err.message });
      }
    }
  });

  workers.push(worker);
});

const stopAllWorkers = async () => {
  await Promise.all(workers.map(w => w.close().catch(() => {})));
  logger.info('All BullMQ workers stopped');
};

module.exports = { stopAllWorkers };
