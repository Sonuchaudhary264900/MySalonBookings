/*
  Fast2SMS — DLT (transactional) SMS sender.

  The Jio/TRAI DLT portal only *registers* your Entity, Header (sender ID) and
  Content Templates. To actually deliver an SMS you push the approved template
  through an aggregator — here, Fast2SMS (https://www.fast2sms.com).

  DLT flow on Fast2SMS:
    GET https://www.fast2sms.com/dev/bulkV2
        ?authorization=<API_KEY>
        &route=dlt
        &sender_id=<6-char approved Header>
        &message=<numeric Content-Template ID>
        &variables_values=<val1|val2|...>   (fills {#var#} in order)
        &flash=0
        &numbers=<comma-separated 10-digit numbers>

  Every helper is a graceful no-op when its env vars aren't set, so the app
  keeps working before the DLT templates are approved — exactly like whatsapp.js.

  Required env:
    FAST2SMS_API_KEY            – Fast2SMS API key (Dev API section)
    FAST2SMS_SENDER_ID          – your DLT-approved Header, e.g. GLOWLX
  Per-template IDs (the numeric "Message ID" Fast2SMS shows for each approved template):
    FAST2SMS_OTP_TEMPLATE_ID
    FAST2SMS_BOOKING_TEMPLATE_ID
    FAST2SMS_REMINDER_TEMPLATE_ID
    FAST2SMS_DELAY_TEMPLATE_ID
    FAST2SMS_STATUS_TEMPLATE_ID
*/

const https = require('https');

const API_KEY   = process.env.FAST2SMS_API_KEY;
const SENDER_ID = process.env.FAST2SMS_SENDER_ID;

// Fast2SMS wants a bare 10-digit Indian number (no +91). Multiple → comma list.
function toNumbers(phone) {
  if (Array.isArray(phone)) {
    return phone.map(toNumbers).filter(Boolean).join(',');
  }
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 ? d : null;
}

// DLT variable values are pipe-separated. Pipes/newlines inside a value would
// corrupt the mapping, so strip them.
function cleanVar(v) {
  return String(v == null ? '' : v).replace(/[|\r\n]+/g, ' ').trim();
}

function request(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* non-JSON */ }
        // Fast2SMS returns { return: true, ... } on success
        const ok = res.statusCode < 400 && (json ? json.return === true : true);
        if (!ok) console.error('[sms] Fast2SMS error:', json || raw);
        resolve({ ok, status: res.statusCode, data: json || raw });
      });
    });
    req.on('error', (e) => {
      console.error('[sms] request error:', e.message);
      resolve({ ok: false, error: e.message });
    });
    req.end();
  });
}

/**
 * Send an approved DLT template.
 * @param {string|string[]} phone     recipient number(s)
 * @param {string}          templateId numeric Fast2SMS message/template ID
 * @param {Array}           variables  ordered values for {#var#} placeholders
 */
async function sendDlt(phone, templateId, variables = []) {
  if (!API_KEY || !SENDER_ID) {
    console.warn('[sms] FAST2SMS_API_KEY / FAST2SMS_SENDER_ID not set — skipping');
    return { ok: false, skipped: true, error: 'not_configured' };
  }
  if (!templateId) {
    return { ok: false, skipped: true, error: 'no_template_id' };
  }
  const numbers = toNumbers(phone);
  if (!numbers) return { ok: false, error: 'invalid_phone' };

  const vals = variables.map(cleanVar).join('|');
  const url =
    'https://www.fast2sms.com/dev/bulkV2' +
    `?authorization=${encodeURIComponent(API_KEY)}` +
    '&route=dlt' +
    `&sender_id=${encodeURIComponent(SENDER_ID)}` +
    `&message=${encodeURIComponent(templateId)}` +
    `&variables_values=${encodeURIComponent(vals)}` +
    '&flash=0' +
    `&numbers=${encodeURIComponent(numbers)}`;

  return request(url);
}

// ── Transactional helpers ────────────────────────────────────────────────────
// Each maps 1:1 to a registered DLT Content Template. Keep the variable order
// identical to how you register the {#var#} placeholders (see SMS_TEMPLATES.md).

// NOTE: TRAI "Service Inferred" templates allow at most 3 variables, so these
// map to ≤3 vars (see docs/SMS_TEMPLATES.md). Extra args are accepted but folded
// into the allowed variables (e.g. date + time are combined into one value).

/** OTP → [otp]  (1 var) */
function sendOtpSms({ phone, otp }) {
  return sendDlt(phone, process.env.FAST2SMS_OTP_TEMPLATE_ID, [otp]);
}

/** Booking: "Your booking at {#a#} for {#a#} is confirmed for {#a#}." → [salon, service, dateTime]  (3 vars) */
function sendBookingConfirmationSms({ phone, salonName, serviceName, date, time }) {
  const dateTime = [date, time].filter(Boolean).join(' ');
  return sendDlt(phone, process.env.FAST2SMS_BOOKING_TEMPLATE_ID, [
    salonName, serviceName, dateTime,
  ]);
}

/** Reminder: "Reminder: your {#a#} at {#a#} is at {#a#}." → [service, salon, time]  (3 vars) */
function sendReminderSms({ phone, serviceName, salonName, time }) {
  return sendDlt(phone, process.env.FAST2SMS_REMINDER_TEMPLATE_ID, [
    serviceName, salonName, time,
  ]);
}

/** Delay: "Your appointment at {#a#} is delayed, now expected around {#a#}." → [salon, tentativeTime]  (2 vars) */
function sendDelayAlertSms({ phone, salonName, tentativeTime }) {
  return sendDlt(phone, process.env.FAST2SMS_DELAY_TEMPLATE_ID, [
    salonName, tentativeTime,
  ]);
}

/** Status: "Your booking at {#a#} on {#a#} is now {#a#}." → [salon, date, status]  (3 vars) */
function sendStatusSms({ phone, salonName, date, status }) {
  return sendDlt(phone, process.env.FAST2SMS_STATUS_TEMPLATE_ID, [
    salonName, date, status,
  ]);
}

module.exports = {
  sendDlt,
  sendOtpSms,
  sendBookingConfirmationSms,
  sendReminderSms,
  sendDelayAlertSms,
  sendStatusSms,
};
