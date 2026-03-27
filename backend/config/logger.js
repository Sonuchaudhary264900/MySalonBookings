// config/logger.js
/*
  Winston Structured Logger
  - Every log line is JSON in production (ELK-ready)
  - Human-readable colorized output in development
  - Automatic request ID injection via AsyncLocalStorage
  - Log levels: error, warn, info, http, debug
*/

const { createLogger, format, transports } = require('winston');
const { AsyncLocalStorage } = require('async_hooks');

// ===================================================
// REQUEST CONTEXT STORE
// Attach requestId to every log within a request lifecycle
// Usage: reqContext.run({ requestId, userId }, () => next())
// ===================================================
const reqContext = new AsyncLocalStorage();

const getRequestContext = () => reqContext.getStore() || {};

// ===================================================
// CUSTOM FORMATS
// ===================================================

// Inject requestId + userId from async context into every log
const injectContext = format((info) => {
  const ctx = getRequestContext();
  if (ctx.requestId) info.requestId = ctx.requestId;
  if (ctx.userId)    info.userId    = ctx.userId;
  if (ctx.salonId)   info.salonId   = ctx.salonId;
  return info;
})();

const isDev = process.env.NODE_ENV !== 'production';

// ===================================================
// LOGGER INSTANCE
// ===================================================
const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: format.combine(
    injectContext,
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    isDev
      ? format.combine(format.colorize(), format.printf(({ level, message, timestamp, requestId, ...meta }) => {
          const rid = requestId ? ` [${requestId.slice(0, 8)}]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp}${rid} ${level}: ${message}${metaStr}`;
        }))
      : format.json()
  ),
  transports: [
    new transports.Console(),
  ],
  exitOnError: false,
});

// ===================================================
// HTTP REQUEST LOGGER MIDDLEWARE
// Replaces morgan — structured + traceable
// ===================================================
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger[level]('HTTP', {
      method:     req.method,
      url:        req.originalUrl,
      status:     res.statusCode,
      durationMs: duration,
      ip:         req.ip,
      userAgent:  req.get('User-Agent')?.slice(0, 100),
    });
  });
  next();
};

module.exports = { logger, reqContext, requestLogger };
