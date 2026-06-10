const https = require('https');

const TOKEN      = process.env.WHATSAPP_TOKEN;
const PHONE_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VER    = 'v21.0';

// Normalize to E.164 — assumes Indian numbers if no country code
function toE164(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (phone.startsWith('+')) return phone.replace(/\s/g, '');
  return `+${digits}`;
}

function post(body) {
  return new Promise((resolve) => {
    if (!TOKEN || !PHONE_ID) {
      console.warn('[whatsapp] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set — skipping');
      return resolve(null);
    }
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/${API_VER}/${PHONE_ID}/messages`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            if (res.statusCode >= 400) console.error('[whatsapp] API error:', json);
            resolve(json);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', (e) => {
      console.error('[whatsapp] request error:', e.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Send a WhatsApp template message.
 *
 * Meta requires pre-approved templates for business-initiated messages.
 * Create these templates in your Meta Business Manager > WhatsApp > Message Templates.
 *
 * @param {string}   phone       - customer phone number
 * @param {string}   template    - approved template name (env var driven)
 * @param {string[]} components  - ordered parameter values for {{1}}, {{2}}, ...
 */
async function sendTemplate(phone, template, components) {
  const to = toE164(phone);
  if (!to) return null;

  return post({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: components.map((v) => ({ type: 'text', text: String(v) })),
        },
      ],
    },
  });
}

/**
 * Booking confirmation WhatsApp message.
 *
 * Template: booking_confirmation  (or WHATSAPP_BOOKING_TEMPLATE env var)
 * Example body: "Hi {{1}}! Your booking at {{2}} for {{3}} on {{4}} at {{5}} is confirmed. See you soon!"
 */
async function sendBookingConfirmation({ phone, customerName, salonName, serviceName, date, time }) {
  const template = process.env.WHATSAPP_BOOKING_TEMPLATE || 'booking_confirmation';
  return sendTemplate(phone, template, [customerName, salonName, serviceName, date, time]);
}

/**
 * 24-hour reminder WhatsApp message.
 *
 * Template: appointment_reminder_24h  (or WHATSAPP_REMINDER_24H_TEMPLATE)
 * Example body: "Hi {{1}}! Just a reminder — your {{2}} at {{3}} is tomorrow at {{4}}. See you soon!"
 */
async function sendReminder24h({ phone, customerName, serviceName, salonName, time }) {
  const template = process.env.WHATSAPP_REMINDER_24H_TEMPLATE || 'appointment_reminder_24h';
  return sendTemplate(phone, template, [customerName, serviceName, salonName, time]);
}

/**
 * 1-hour reminder WhatsApp message.
 *
 * Template: appointment_reminder_1h  (or WHATSAPP_REMINDER_1H_TEMPLATE)
 * Example body: "Hi {{1}}! Your {{2}} appointment at {{3}} starts in 1 hour ({{4}}). Time to head out!"
 */
async function sendReminder1h({ phone, customerName, serviceName, salonName, time }) {
  const template = process.env.WHATSAPP_REMINDER_1H_TEMPLATE || 'appointment_reminder_1h';
  return sendTemplate(phone, template, [customerName, serviceName, salonName, time]);
}

/**
 * Delay alert WhatsApp message — sent when a customer's tentative
 * appointment time shifts by >=10 min from the originally booked time.
 *
 * Template: appointment_delay_alert  (or WHATSAPP_DELAY_ALERT_TEMPLATE)
 * Example body: "Hi {{1}}! Your {{2}} at {{3}} (originally {{4}}) is now expected around {{5}} — running about {{6}} min late. Sorry for the wait!"
 */
async function sendDelayAlert({ phone, customerName, serviceName, salonName, originalTime, tentativeTime, delayMinutes }) {
  const template = process.env.WHATSAPP_DELAY_ALERT_TEMPLATE || 'appointment_delay_alert';
  return sendTemplate(phone, template, [customerName, serviceName, salonName, originalTime, tentativeTime, String(delayMinutes)]);
}

module.exports = { sendBookingConfirmation, sendReminder24h, sendReminder1h, sendDelayAlert };
