const Booking = require('../models/Booking');
const { sendExpoPush } = require('./pushNotification');
const { sendDelayAlert } = require('./whatsapp');

const DELAY_THRESHOLD_MIN = 10;

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const clamped = Math.max(0, Math.min(1439, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function nowISTMinutes() {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
}

function dateToISTMinutes(date) {
  const d = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * Recalculate live "tentative" timing for a barber's bookings on a given day.
 *
 * Cascades delay forward: if the barber's currently in-progress booking is
 * overrunning its estimatedDuration, every later pending/confirmed booking
 * for that barber today shifts later by the overrun amount.
 *
 * @param {string} salonId
 * @param {string} barberId
 * @param {string} dateStr  - "YYYY-MM-DD"
 * @param {object} [io]     - Socket.IO instance, for live customer updates
 */
async function recalcQueueTiming(salonId, barberId, dateStr, io = null) {
  if (!barberId) return;

  const dayStart = new Date(dateStr + 'T00:00:00.000Z');
  const dayEnd   = new Date(dateStr + 'T23:59:59.999Z');

  const bookings = await Booking.find({
    salonId,
    barberId,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
  })
    .sort({ appointmentTime: 1 })
    .populate('customerId', 'pushToken phone name');

  const nowMins = nowISTMinutes();
  let cursor = null;

  for (const booking of bookings) {
    if (!booking.appointmentTime) continue;
    const scheduledStart = timeToMinutes(booking.appointmentTime);
    const duration = booking.estimatedDuration || 30;

    if (booking.status === 'in_progress') {
      if (booking.startedAt) {
        const startedMins = dateToISTMinutes(booking.startedAt);
        const expectedEnd = startedMins + duration;
        cursor = nowMins > expectedEnd ? nowMins : expectedEnd;
      }
      continue;
    }

    let tentativeStart = scheduledStart;
    if (cursor !== null && cursor > scheduledStart) {
      tentativeStart = cursor;
    }
    const delayMinutes = Math.max(0, tentativeStart - scheduledStart);
    cursor = tentativeStart + duration;

    const newTentativeTime = delayMinutes > 0 ? minutesToTime(tentativeStart) : null;

    const changed = (booking.delayMinutes || 0) !== delayMinutes
      || (booking.tentativeTime || null) !== newTentativeTime;

    if (changed) {
      booking.tentativeTime = newTentativeTime;
      booking.delayMinutes = delayMinutes;
      booking.queueRecalcAt = new Date();
    }

    const lastNotified = booking.lastDelayNotifiedMinutes || 0;
    let notifyChanged = false;

    if (delayMinutes >= DELAY_THRESHOLD_MIN &&
        Math.floor(delayMinutes / DELAY_THRESHOLD_MIN) > Math.floor(lastNotified / DELAY_THRESHOLD_MIN)) {
      await sendDelayNotification(booking, delayMinutes);
      booking.lastDelayNotifiedMinutes = delayMinutes;
      notifyChanged = true;
    } else if (delayMinutes === 0 && lastNotified !== 0) {
      booking.lastDelayNotifiedMinutes = 0;
      notifyChanged = true;
    }

    if (changed || notifyChanged) {
      await booking.save();
      if (io && booking.customerId) {
        const customerId = booking.customerId._id || booking.customerId;
        io.to(`customer-${customerId}`).emit('tentative-time-updated', {
          bookingId: booking._id.toString(),
          tentativeTime: booking.tentativeTime,
          delayMinutes: booking.delayMinutes,
        });
      }
    }
  }
}

async function sendDelayNotification(booking, delayMinutes) {
  const customer = booking.customerId;
  const tentativeLabel = minutesToTime(timeToMinutes(booking.appointmentTime) + delayMinutes);

  if (customer?.pushToken) {
    sendExpoPush(
      customer.pushToken,
      '⏱️ Your appointment is running late',
      `Your appointment at ${booking.salonName} is now expected around ${tentativeLabel} (running ${delayMinutes} min late).`,
      { bookingId: booking._id.toString(), type: 'delay_alert' },
      { channelId: 'reminders' }
    ).catch(() => {});
  }

  // Walk-ins have no linked account — fall back to the booking's phone
  const delayPhone = customer?.phone || booking.customerPhone;
  if (delayPhone) {
    sendDelayAlert({
      phone: delayPhone,
      customerName: customer?.name || booking.customerName || 'there',
      serviceName: booking.serviceName || 'your appointment',
      salonName: booking.salonName,
      originalTime: booking.appointmentTime,
      tentativeTime: tentativeLabel,
      delayMinutes,
    }).catch(() => {});
  }
}

module.exports = { recalcQueueTiming, timeToMinutes, minutesToTime, DELAY_THRESHOLD_MIN };
