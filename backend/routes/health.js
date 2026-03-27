// routes/health.js
/*
  Health Check Endpoints

  GET /health         — quick liveness check (load balancer ping)
  GET /health/full    — deep dependency check (Kubernetes readiness probe)
  GET /health/ready   — readiness probe (is the service ready for traffic?)

  Response format:
  {
    status: 'healthy' | 'degraded' | 'unhealthy',
    uptime: 12345,
    timestamp: '2026-01-01T00:00:00.000Z',
    version: '2.0.0',
    dependencies: {
      mongodb: { status: 'up', latencyMs: 4 },
      redis:   { status: 'up', latencyMs: 1 },
    }
  }
*/

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isHealthy: isRedisHealthy } = require('../config/redis');

// ===================================================
// LIVENESS — /health
// Fast: just returns 200 if process is alive
// Used by: load balancers, uptime monitors
// ===================================================
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

// ===================================================
// READINESS — /health/ready
// Checks if app can handle requests (MongoDB connected)
// Used by: Kubernetes readinessProbe
// ===================================================
router.get('/ready', async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;

  if (!mongoReady) {
    return res.status(503).json({
      status: 'not_ready',
      reason: 'MongoDB not connected',
    });
  }

  res.status(200).json({ status: 'ready' });
});

// ===================================================
// FULL HEALTH — /health/full
// Deep check of all dependencies
// Used by: monitoring dashboards, ops team
// ===================================================
router.get('/full', async (req, res) => {
  const results = {};
  let overallHealthy = true;

  // --- MongoDB check ---
  try {
    const t0 = Date.now();
    await mongoose.connection.db.admin().ping();
    results.mongodb = { status: 'up', latencyMs: Date.now() - t0 };
  } catch (err) {
    results.mongodb = { status: 'down', error: err.message };
    overallHealthy = false;
  }

  // --- Redis check ---
  try {
    const redisUp = isRedisHealthy();
    results.redis = { status: redisUp ? 'up' : 'down' };
    if (!redisUp) overallHealthy = false;  // degraded but not fatal
  } catch (err) {
    results.redis = { status: 'down', error: err.message };
  }

  // --- System metrics ---
  const mem = process.memoryUsage();
  results.system = {
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMB: {
      rss:      Math.round(mem.rss      / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal:Math.round(mem.heapTotal/ 1024 / 1024),
    },
    nodeVersion: process.version,
    pid:         process.pid,
  };

  const degraded = results.redis?.status === 'down' && results.mongodb?.status === 'up';
  const status = overallHealthy
    ? (degraded ? 'degraded' : 'healthy')
    : 'unhealthy';

  res.status(overallHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    dependencies: results,
  });
});

module.exports = router;
