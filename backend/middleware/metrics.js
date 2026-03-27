// middleware/metrics.js
/*
  Prometheus Metrics Middleware
  Exposes /metrics endpoint for Grafana/Prometheus scraping

  Tracks:
  - HTTP request count (by method, route, status)
  - HTTP request duration histogram (p50/p95/p99 latency)
  - Active HTTP connections gauge
  - Node.js default metrics (CPU, memory, GC, event loop lag)
  - Cache hit/miss counters
  - Queue job counters
*/

const client = require('prom-client');

// ===================================================
// DEFAULT NODE.JS METRICS (CPU, memory, GC, event loop)
// ===================================================
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'msb_node_' });

// ===================================================
// HTTP METRICS
// ===================================================
const httpRequestsTotal = new client.Counter({
  name: 'msb_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'msb_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'msb_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// ===================================================
// BUSINESS METRICS
// ===================================================
const bookingsTotal = new client.Counter({
  name: 'msb_bookings_total',
  help: 'Total bookings created',
  labelNames: ['status'],
  registers: [register],
});

const paymentsTotal = new client.Counter({
  name: 'msb_payments_total',
  help: 'Total payment attempts',
  labelNames: ['status'],
  registers: [register],
});

const cacheHits = new client.Counter({
  name: 'msb_cache_hits_total',
  help: 'Redis cache hits',
  registers: [register],
});

const cacheMisses = new client.Counter({
  name: 'msb_cache_misses_total',
  help: 'Redis cache misses',
  registers: [register],
});

const queueJobsTotal = new client.Counter({
  name: 'msb_queue_jobs_total',
  help: 'Total queue jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

// ===================================================
// MIDDLEWARE — attaches to every HTTP request
// ===================================================
const metricsMiddleware = (req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    activeConnections.dec();

    // Normalize route to avoid cardinality explosion
    // /api/v1/salons/64abc123 → /api/v1/salons/:id
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.path.replace(/\/[0-9a-f]{24}/g, '/:id').replace(/\/\d+/g, '/:id');

    const labels = {
      method:      req.method,
      route:       route.slice(0, 100),
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    end(labels);
  });

  next();
};

// ===================================================
// /metrics ROUTE HANDLER
// ===================================================
const metricsHandler = async (req, res) => {
  // Optional: protect with a secret token
  const token = process.env.METRICS_TOKEN;
  if (token && req.headers['x-metrics-token'] !== token) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsHandler,
  metrics: {
    bookingsTotal,
    paymentsTotal,
    cacheHits,
    cacheMisses,
    queueJobsTotal,
  },
};
