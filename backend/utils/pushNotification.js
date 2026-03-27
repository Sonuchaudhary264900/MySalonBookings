const https = require('https');

/**
 * Send Expo push notification(s)
 * @param {string|string[]} tokens  - Expo push token(s)
 * @param {string}          title
 * @param {string}          body
 * @param {object}          data       - custom data payload
 * @param {object}          options    - { channelId, badge, sound }
 */
async function sendExpoPush(tokens, title, body, data = {}, options = {}) {
  const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter(
    (t) => t && typeof t === 'string' && t.startsWith('ExponentPushToken')
  );
  if (tokenList.length === 0) return;

  const { channelId = 'default', badge, sound = 'default' } = options;

  const messages = tokenList.map((to) => ({
    to,
    title,
    body,
    data,
    sound,
    priority: 'high',
    channelId,           // Android notification channel
    ...(badge != null ? { badge } : {}),
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
