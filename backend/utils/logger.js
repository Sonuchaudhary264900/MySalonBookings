// utils/logger.js
/*
  Logger Service
  Centralized logging for:
  - Console logs (development)
  - File logs (production)
  - Error tracking
  - API request/response logging
*/

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  SUCCESS: 'SUCCESS',
};

class Logger {
  constructor() {
    this.timestamp = () => new Date().toISOString();
    this.isDev = process.env.NODE_ENV === 'development';
  }

  // Format log message
  format(level, message, data = null) {
    const formatted = {
      timestamp: this.timestamp(),
      level,
      message,
      ...(data && { data }),
    };
    return formatted;
  }

  // Write to file
  writeToFile(level, message, data) {
    if (process.env.NODE_ENV !== 'production') return;

    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    const logEntry = JSON.stringify(this.format(level, message, data)) + '\n';

    fs.appendFile(logFile, logEntry, (err) => {
      if (err) console.error('Error writing to log file:', err);
    });
  }

  // ERROR - Critical errors that need immediate attention
  error(message, error = null) {
    const formatted = this.format(LOG_LEVELS.ERROR, message, error);
    console.error(`❌ ${message}`, error);
    this.writeToFile(LOG_LEVELS.ERROR, message, error);
  }

  // WARN - Warnings that should be reviewed
  warn(message, data = null) {
    const formatted = this.format(LOG_LEVELS.WARN, message, data);
    console.warn(`⚠️  ${message}`, data);
    this.writeToFile(LOG_LEVELS.WARN, message, data);
  }

  // INFO - General information
  info(message, data = null) {
    const formatted = this.format(LOG_LEVELS.INFO, message, data);
    if (this.isDev) console.log(`ℹ️  ${message}`, data);
    this.writeToFile(LOG_LEVELS.INFO, message, data);
  }

  // DEBUG - Detailed debug information
  debug(message, data = null) {
    if (!this.isDev) return;
    const formatted = this.format(LOG_LEVELS.DEBUG, message, data);
    console.log(`🐛 ${message}`, data);
  }

  // SUCCESS - Successful operations
  success(message, data = null) {
    const formatted = this.format(LOG_LEVELS.SUCCESS, message, data);
    console.log(`✅ ${message}`, data);
    this.writeToFile(LOG_LEVELS.SUCCESS, message, data);
  }

  // HTTP Request logging
  httpRequest(method, url, statusCode, duration) {
    const message = `${method} ${url} - ${statusCode} - ${duration}ms`;
    if (statusCode >= 400) {
      this.warn(message);
    } else {
      this.info(message);
    }
  }

  // Database operation logging
  database(operation, collection, duration, error = null) {
    if (error) {
      this.error(`DB: ${operation} on ${collection}`, error);
    } else {
      this.debug(`DB: ${operation} on ${collection} - ${duration}ms`);
    }
  }

  // Authentication logging
  auth(action, userId, success, reason = null) {
    const message = `Auth ${action} for user ${userId}`;
    if (success) {
      this.success(message);
    } else {
      this.warn(message, { reason });
    }
  }

  // Payment logging
  payment(action, bookingId, amount, status) {
    const message = `Payment ${action}: Booking ${bookingId}, Amount ₹${amount}, Status: ${status}`;
    if (status === 'success') {
      this.success(message);
    } else {
      this.error(message);
    }
  }

  // Clear old logs (older than 30 days)
  clearOldLogs() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    fs.readdirSync(logsDir).forEach((file) => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted old log file: ${file}`);
      }
    });
  }
}

module.exports = new Logger();
