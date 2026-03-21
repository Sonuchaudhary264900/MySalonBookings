const https = require('https');

/**
 * Send Expo push notification(s)
 * Silently ignores invalid or missing tokens.
 */
async function sendExpoPush(tokens, title, body, data = {}) {
  const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter(
    (t) => t && typeof t === 'string' && t.startsWith('ExponentPushToken')
  );
  if (tokenList.length === 0) return;

  const messages = tokenList.map((to) => ({
    to,
    title,
    body,
    data,
    sound: 'default',
    priority: 'high',
  }));

  const payload = JSON.stringify(messages);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'exp.host',
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch { resolve(null); }
        });
      }
    );
    req.on('error', (e) => {
      console.error('Push send error:', e.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { sendExpoPush };
