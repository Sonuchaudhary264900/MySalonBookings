const { sendExpoPush } = require('./pushNotification');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Send a push notification with up to 3 attempts (5s apart).
 * Logs failures on the booking document if bookingId provided.
 */
async function sendWithRetry(tokens, title, body, data = {}, options = {}, bookingId = null) {
  const MAX = 3;
  const DELAY = 5000;

  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      const result = await sendExpoPush(tokens, title, body, data, options);
      return result;
    } catch (err) {
      const errMsg = err?.message || String(err);
      if (bookingId) {
        try {
          const Booking = require('../models/Booking');
          await Booking.updateOne(
            { _id: bookingId },
            { $push: { pushFailures: { attemptedAt: new Date(), error: `attempt ${attempt}: ${errMsg}` } } }
          );
        } catch {}
      }
      if (attempt < MAX) await sleep(DELAY);
    }
  }
  return null;
}

module.exports = { sendWithRetry };
