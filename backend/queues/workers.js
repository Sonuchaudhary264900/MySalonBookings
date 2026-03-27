// queues/workers.js
/*
  BullMQ Workers — consume jobs from queues
  Each worker processes jobs independently with retry + error handling.

  Workers:
  - notificationWorker  → Expo push notifications
  - emailWorker         → Nodemailer emails
  - bookingReminderWorker → Scheduled booking reminders
  - analyticsWorker     → Analytics event ingestion
  - refundWorker        → Razorpay refund processing
*/

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { logger } = require('../config/logger');
const { metrics } = require('../middleware/metrics');
const { sendExpoPush } = require('../services/pushService');
const { initiateRefund } = require('../config/razorpay');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const workerConnection = () => new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const workers = [];

// ===================================================
// NOTIFICATION WORKER
// Processes Expo push notification jobs
// ===================================================
const notificationWorker = new Worker('notifications', async (job) => {
  const { token, title, body, data } = job.data;
  if (!token) return;
  await sendExpoPush(token, title, body, data || {});
  metrics.queueJobsTotal.inc({ queue: 'notifications', status: 'completed' });
}, {
  connection: workerConnection(),
  concurrency: 20,
});

// ===================================================
// EMAIL WORKER
// Processes nodemailer email jobs
// ===================================================
const emailWorker = new Worker('emails', async (job) => {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail(job.data);
  metrics.queueJobsTotal.inc({ queue: 'emails', status: 'completed' });
}, {
  connection: workerConnection(),
  concurrency: 5,
});

// ===================================================
// BOOKING REMINDER WORKER
// Processes scheduled reminder jobs (24h, 1h, 30min)
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
    '24h_reminder':  { title: '📅 Appointment Tomorrow', body: `Your booking at ${booking.salonId?.name} is tomorrow. See you there!` },
    '1h_reminder':   { title: '⏰ 1 Hour to Go!', body: `Your appointment at ${booking.salonId?.name} is in 1 hour.` },
    '30min_reminder':{ title: '🕐 30 Minutes!', body: `Your appointment at ${booking.salonId?.name} starts in 30 minutes. Get ready!` },
  };

  const msg = messages[job.name];
  if (msg) await sendExpoPush(token, msg.title, msg.body, { bookingId: booking._id });

  metrics.queueJobsTotal.inc({ queue: 'bookingReminder', status: 'completed' });
}, {
  connection: workerConnection(),
  concurrency: 10,
});

// ===================================================
// ANALYTICS WORKER
// Fire-and-forget event ingestion
// ===================================================
const analyticsWorker = new Worker('analytics', async (job) => {
  // Future: write to ClickHouse / BigQuery
  // For now: structured log that can be shipped via ELK
  logger.info('analytics_event', { event: job.name, ...job.data });
  metrics.queueJobsTotal.inc({ queue: 'analytics', status: 'completed' });
}, {
  connection: workerConnection(),
  concurrency: 10,
});

// ===================================================
// REFUND WORKER
// Idempotent Razorpay refund processing
// ===================================================
const refundWorker = new Worker('refunds', async (job) => {
  const { paymentId, amount, reason } = job.data;
  logger.info('Processing refund', { paymentId, amount });
  await initiateRefund(paymentId, amount);
  logger.info('Refund processed', { paymentId });
  metrics.queueJobsTotal.inc({ queue: 'refunds', status: 'completed' });
}, {
  connection: workerConnection(),
  concurrency: 3,
});

// ===================================================
// ERROR HANDLERS — log failures, don't crash
// ===================================================
const allWorkers = [
  { worker: notificationWorker,   name: 'notifications' },
  { worker: emailWorker,          name: 'emails' },
  { worker: bookingReminderWorker,name: 'bookingReminder' },
  { worker: analyticsWorker,      name: 'analytics' },
  { worker: refundWorker,         name: 'refunds' },
];

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
    logger.error(`Worker error [${name}]`, { error: err.message });
  });

  workers.push(worker);
});

const stopAllWorkers = async () => {
  await Promise.all(workers.map(w => w.close()));
  logger.info('All BullMQ workers stopped');
};

module.exports = { stopAllWorkers };
