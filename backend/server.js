/**
 * ============================================================
 * MYSALONBOOKINGS — HYPER-SCALE BACKEND SERVER v2.0
 * Node.js + Express + Redis + BullMQ + Prometheus
 * ============================================================
 */

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // Fix: ISP DNS blocks MongoDB Atlas SRV lookups

/* ============================================================
   SENTRY — must be initialized before any other requires
============================================================ */
const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.2,
  });
}

const express    = require("express");
const compression = require("compression");
const cors       = require("cors");
const helmet     = require("helmet");
const dotenv     = require("dotenv");
const http       = require("http");
const socketIO   = require("socket.io");
const mongoSanitize = require("express-mongo-sanitize");
const hpp        = require("hpp");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

/* ============================================================
   NEW: STRUCTURED LOGGER — replaces console.log / morgan
============================================================ */
const { logger, reqContext, requestLogger } = require("./config/logger");

/* ============================================================
   NEW: REDIS — cache + BullMQ connection
============================================================ */
require("./config/redis"); // init connection on startup

/* ============================================================
   DATABASE
============================================================ */
const connectDB = require("./config/database");

/* ============================================================
   ROUTES
============================================================ */
const routes      = require("./routes");
const healthRouter = require("./routes/health");

/* ============================================================
   SERVICES
============================================================ */
const { testCloudinaryConnection } = require("./config/cloudinary");
const { testRazorpayConnection }   = require("./config/razorpay");
const { testGoogleMapsConnection } = require("./config/googleMaps");
const { testFirebaseConnection }   = require("./config/firebaseAdmin");

/* ============================================================
   MIDDLEWARE
============================================================ */
const { globalErrorHandler, notFoundHandler, rateLimiter } = require("./middleware/validationMiddleware");
const { metricsMiddleware, metricsHandler } = require("./middleware/metrics");

/* ============================================================
   SOCKET HANDLER
============================================================ */
const socketHandler = require("./socket/socketHandler");

/* ============================================================
   CRON JOBS (legacy node-cron — kept for compatibility)
============================================================ */
const cronJobs = require("./cron");

/* ============================================================
   BULLMQ QUEUES + WORKERS
============================================================ */
const { initQueues } = require("./queues/index");

/* ============================================================
   CREATE APP
============================================================ */
const app    = express();
const server = http.createServer(app);

app.set("trust proxy", 1);

/* ============================================================
   ALLOWED ORIGINS
============================================================ */
const productionOrigins  = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];
const developmentOrigins = [
  "http://localhost:5173", "http://localhost:5174",
  "http://localhost:5175", "http://localhost:5176",
  "http://localhost:5177", "http://localhost:3000", "http://localhost:3001",
];
const allowedOrigins = process.env.NODE_ENV === "production"
  ? productionOrigins
  : [...new Set([...developmentOrigins, ...productionOrigins])];

/* ============================================================
   SOCKET.IO  (Redis adapter for horizontal scaling)
============================================================ */
const io = socketIO(server, { cors: { origin: allowedOrigins, credentials: true } });
app.set("io", io);

// Redis Pub/Sub adapter — enables socket.io across multiple pods
if (process.env.REDIS_URL) {
  try {
    const { createAdapter } = require("@socket.io/redis-adapter");
    const IORedis = require("ioredis");
    const pubClient = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("✅ Socket.io Redis adapter enabled (horizontal scaling ready)");
  } catch (e) {
    logger.warn("⚠️  Socket.io Redis adapter skipped (single-node mode)", { error: e.message });
  }
}

/* ============================================================
   REQUEST ID MIDDLEWARE
   Attaches unique requestId to every request for full traceability
============================================================ */
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId   = requestId;
  res.set("X-Request-ID", requestId);

  // Run the rest of the request inside async context so logger can pick up requestId
  const ctx = { requestId };
  if (req.user?.id)   ctx.userId  = req.user.id;
  if (req.owner?._id) ctx.userId  = req.owner._id;
  reqContext.run(ctx, next);
});

/* ============================================================
   SECURITY MIDDLEWARE
============================================================ */
app.use(compression({ level: 6, threshold: 1024 }));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions:  { action: "deny" },
}));

app.use(cors({ origin: allowedOrigins, credentials: true }));

/* ============================================================
   BODY PARSER + SANITIZATION
============================================================ */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static("uploads"));
app.use(mongoSanitize());
app.use(hpp());

/* ============================================================
   NEW: STRUCTURED HTTP LOGGING (replaces morgan)
============================================================ */
app.use(requestLogger);

/* ============================================================
   NEW: PROMETHEUS METRICS — must be before routes
============================================================ */
app.use(metricsMiddleware);

/* ============================================================
   RATE LIMITING
============================================================ */
app.use("/api/", rateLimiter(500, 900000));

/* ============================================================
   HEALTH CHECK ROUTES  (/health, /health/ready, /health/full)
============================================================ */
app.use("/health", healthRouter);

/* ============================================================
   NEW: PROMETHEUS SCRAPE ENDPOINT
============================================================ */
app.get("/metrics", metricsHandler);

/* ============================================================
   KEEP-ALIVE PING
============================================================ */
app.get("/ping", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

/* ============================================================
   API ROUTES
============================================================ */
app.use("/api/v1", routes);

/* ============================================================
   SOCKET CONNECTION
============================================================ */
io.on("connection", (socket) => {
  logger.debug("Socket connected", { socketId: socket.id });
  socketHandler(socket, io);
  socket.on("disconnect", () => {
    logger.debug("Socket disconnected", { socketId: socket.id });
  });
});

/* ============================================================
   ERROR HANDLING
============================================================ */
app.use(notFoundHandler);
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);

/* ============================================================
   DATABASE INIT
============================================================ */
const initializeDatabase = async () => {
  await connectDB();
  logger.info("✅ MongoDB connected");
};

/* ============================================================
   EXTERNAL SERVICES CHECK
============================================================ */
const testExternalServices = async () => {
  logger.info("📋 Testing external services...");
  const tests = [
    { name: "Cloudinary", fn: testCloudinaryConnection },
    { name: "Razorpay",   fn: testRazorpayConnection   },
    { name: "Google Maps",fn: testGoogleMapsConnection },
    { name: "Firebase",   fn: testFirebaseConnection   },
  ];
  for (const { name, fn } of tests) {
    try { await fn(); logger.info(`✅ ${name} connected`); }
    catch (e) { logger.warn(`⚠️  ${name} test failed`, { error: e.message }); }
  }
};

/* ============================================================
   STARTUP CATCH-UP — complete past bookings missed during sleep
============================================================ */
const startupCatchUp = async () => {
  try {
    const Booking = require("./models/Booking");
    const nowIST    = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST  = nowIST.toISOString().slice(0, 10);
    const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();

    const pastBookings = await Booking.find({
      status: { $in: ["pending", "confirmed", "in_progress"] },
    }).lean();

    const toComplete = pastBookings
      .filter((b) => {
        if (!b.appointmentDate || !b.appointmentTime) return false;
        const bookingDate = b.appointmentDate.toISOString().slice(0, 10);
        const [h, m] = b.appointmentTime.split(":").map(Number);
        if (isNaN(h)) return false;
        const slotEnd = h * 60 + m + (b.estimatedDuration || 30);
        return bookingDate < todayIST || (bookingDate === todayIST && slotEnd <= nowMinutes);
      })
      .map((b) => b._id);

    if (toComplete.length > 0) {
      await Booking.updateMany(
        { _id: { $in: toComplete } },
        { $set: { status: "completed", completedAt: new Date() } }
      );
      logger.info(`✅ Startup catch-up: completed ${toComplete.length} past booking(s)`);
    }
  } catch (e) {
    logger.warn("Startup catch-up error", { error: e.message });
  }
};

/* ============================================================
   START SERVER
============================================================ */
const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  logger.info("══════════════════════════════════════════════");
  logger.info("🚀 MYSALONBOOKINGS BACKEND v2.0 STARTING");
  logger.info("══════════════════════════════════════════════");

  await initializeDatabase();
  await testExternalServices();

  // Init BullMQ queues + workers
  try {
    initQueues();
    if (process.env.REDIS_URL || process.env.NODE_ENV !== "production") {
      require("./queues/workers"); // start workers
      logger.info("✅ BullMQ workers started");
    }
  } catch (e) {
    logger.warn("⚠️  BullMQ init failed (queues disabled)", { error: e.message });
  }

  // Legacy cron jobs (still active alongside BullMQ)
  cronJobs;
  logger.info("✅ Cron jobs started");

  await startupCatchUp();

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`✅ Server running on port ${PORT}`, {
      port: PORT,
      env: process.env.NODE_ENV || "development",
      pid: process.pid,
    });

    // Keep-alive ping for Render free tier
    if (process.env.NODE_ENV === "production") {
      const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      setInterval(() => {
        http.get(`${selfUrl}/ping`, res => res.resume()).on("error", () => {});
      }, 10 * 60 * 1000);
      logger.info("✅ Keep-alive ping enabled (every 10 min)");
    }
  });
};

startServer().catch((err) => {
  logger.error("❌ Failed to start server", { error: err.message });
  process.exit(1);
});

/* ============================================================
   GRACEFUL SHUTDOWN
============================================================ */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — graceful shutdown starting`);
  server.close(async () => {
    try {
      const { stopAllWorkers } = require("./queues/workers");
      await stopAllWorkers();
    } catch {}
    logger.info("✅ Graceful shutdown complete");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15000); // force kill after 15s
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

process.on("uncaughtException",  (err) => { logger.error("Uncaught exception",  { error: err.message, stack: err.stack }); });
process.on("unhandledRejection", (err) => { logger.error("Unhandled rejection", { error: err?.message }); });

module.exports = { app, server, io };
