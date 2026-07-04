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
const cookieParser = require("cookie-parser");
const { csrf }     = require("./middleware/csrf");

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
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
  : [];
const developmentOrigins = [
  "http://localhost:5173", "http://localhost:5174",
  "http://localhost:5175", "http://localhost:5176",
  "http://localhost:5177", "http://localhost:3000", "http://localhost:3001",
];

// First-party domains that must ALWAYS be allowed, regardless of the
// ALLOWED_ORIGINS env var — a missing/incomplete env var must never lock
// our own owner/customer/admin frontends out (this caused login CORS failures).
const firstPartyHostRegex = /(^|\.)(mysalonbookings\.com|glowloox\.com)$/i;

const staticAllowedOrigins = new Set([
  ...productionOrigins,
  ...(process.env.NODE_ENV === "production" ? [] : developmentOrigins),
]);

// Function-based origin check used by both Express CORS and Socket.io.
const isOriginAllowed = (origin) => {
  // Non-browser clients (curl, mobile apps, server-to-server) send no Origin.
  if (!origin) return true;
  if (staticAllowedOrigins.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (firstPartyHostRegex.test(hostname)) return true;
    if (process.env.NODE_ENV !== "production" && hostname === "localhost") return true;
  } catch { /* malformed origin — reject below */ }
  return false;
};

const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) return callback(null, true);
  logger.warn("⛔ CORS blocked origin", { origin });
  return callback(new Error("Not allowed by CORS"));
};

/* ============================================================
   SOCKET.IO  (Redis adapter for horizontal scaling)
============================================================ */
const io = socketIO(server, { cors: { origin: corsOrigin, credentials: true } });
app.set("io", io);

// Redis Pub/Sub adapter — enables socket.io across multiple pods
let socketPubClient = null;
let socketSubClient = null;
if (process.env.REDIS_URL) {
  try {
    const { createAdapter } = require("@socket.io/redis-adapter");
    const IORedis = require("ioredis");
    const redisTLS = process.env.REDIS_URL?.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {};
    let socketQuotaHit = false;
    const socketRedisOptions = {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (socketQuotaHit) return null;
        if (times > 8) return null;
        return Math.min(times * 2000, 300000);
      },
      reconnectOnError(err) {
        if (err.message.includes('max requests limit exceeded')) {
          socketQuotaHit = true;
          return false;
        }
        return false;
      },
      ...redisTLS,
    };
    socketPubClient = new IORedis(process.env.REDIS_URL, socketRedisOptions);
    socketSubClient = socketPubClient.duplicate();
    const onSocketRedisError = (err) => {
      if (err?.message?.includes('max requests limit exceeded')) {
        socketQuotaHit = true;
        logger.warn("⚠️  Upstash Redis quota exceeded — Socket.io adapter degraded to single-node mode");
      } else {
        logger.warn("⚠️  Socket.io Redis adapter error", { error: err?.message });
      }
    };
    socketPubClient.on("error", onSocketRedisError);
    socketSubClient.on("error", onSocketRedisError);
    io.adapter(createAdapter(socketPubClient, socketSubClient));
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

app.use(cors({ origin: corsOrigin, credentials: true }));

/* ============================================================
   BODY PARSER + SANITIZATION
============================================================ */
// Keep the raw body so the Razorpay webhook can verify its HMAC signature.
app.use(express.json({ limit: "1mb", verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static("uploads"));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(csrf);

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
   SOCKET IDENTITY (best-effort, non-blocking)
   Attaches socket.user when a valid token is present (cookie for web,
   auth.token for mobile). Never rejects — guests still connect for
   read-only rooms; sensitive socket actions verify socket.user themselves.
============================================================ */
io.use((socket, next) => {
  try {
    const { verifyToken } = require("./middleware/authMiddleware");
    const raw =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
    if (raw) socket.user = verifyToken(raw);
  } catch {
    /* invalid/expired token → treat as guest */
  }
  next();
});

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
  const timeout = (ms) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
  await Promise.allSettled(
    tests.map(({ name, fn }) =>
      Promise.race([fn(), timeout(8000)])
        .then(() => logger.info(`✅ ${name} connected`))
        .catch((e) => logger.warn(`⚠️  ${name} test failed`, { error: e.message }))
    )
  );
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

    // Bound the scan to bookings up to end of today (IST). appointmentDate is
    // stored at noon UTC, so tomorrow-noon-UTC covers all of today IST.
    // This keeps the catch-up off the (potentially large) set of future bookings.
    const tomorrowNoonUTC = new Date();
    tomorrowNoonUTC.setDate(tomorrowNoonUTC.getDate() + 1);
    tomorrowNoonUTC.setUTCHours(12, 0, 0, 0);

    const pastBookings = await Booking.find({
      status: { $in: ["pending", "confirmed", "in_progress"] },
      appointmentDate: { $lte: tomorrowNoonUTC },
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

  // Only the DB is required before we start serving. Connect, then bring the
  // server up immediately — everything else (external-service probes, one-time
  // data fixups, booking catch-up) runs in the background so cold starts on
  // Render's free tier respond to the first request as fast as possible.
  await initializeDatabase();

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

  // Background maintenance — never blocks the server from accepting requests.
  const runBackgroundMaintenance = async () => {
    await testExternalServices().catch(() => {});
    await startupCatchUp();

    // Fix customers with broken lastLocation (type set but no coordinates)
    try {
      const Customer = require("./models/Customer");
      const result = await Customer.updateMany(
        { 'lastLocation.type': 'Point', 'lastLocation.coordinates': { $exists: false } },
        { $unset: { lastLocation: '' } }
      );
      if (result.modifiedCount > 0)
        logger.info(`✅ Fixed ${result.modifiedCount} customer(s) with broken lastLocation`);
    } catch (e) {
      logger.warn("lastLocation fix error", { error: e.message });
    }

    // Remove explicit email:null from owners so sparse unique index allows multiple email-less accounts
    try {
      const Owner = require("./models/Owner");
      const result = await Owner.updateMany({ email: null }, { $unset: { email: "" } });
      if (result.modifiedCount > 0)
        logger.info(`✅ Cleared email:null from ${result.modifiedCount} owner(s) — sparse index fix`);
    } catch (e) {
      logger.warn("Owner email null-fix error", { error: e.message });
    }
  };

  // Allow up to 10 minutes for large uploads (Cloudinary direct-upload register calls are fast,
  // but keep this high so any legacy proxy path also gets sufficient time)
  server.timeout          = 10 * 60 * 1000; // 10 min
  server.keepAliveTimeout = 10 * 60 * 1000;
  server.headersTimeout   = 10 * 60 * 1000 + 1000;

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`✅ Server running on port ${PORT}`, {
      port: PORT,
      env: process.env.NODE_ENV || "development",
      pid: process.pid,
    });

    // Run maintenance after we're already accepting requests (non-blocking)
    runBackgroundMaintenance().catch((e) =>
      logger.warn("Background maintenance error", { error: e.message })
    );

    // Warm up Python AI service (sends a harmless health request after 5s so MediaPipe is ready)
    if (process.env.PYTHON_AI_URL) {
      setTimeout(() => {
        const http = require(process.env.PYTHON_AI_URL.startsWith('https') ? 'https' : 'http');
        http.get(`${process.env.PYTHON_AI_URL}/health`, (res) => res.resume()).on('error', () => {});
        logger.info('StyleAI: Python warmup ping sent');
      }, 5000);
    }

    // Keep-alive ping for Render free tier (pings well inside the 15-min
    // inactivity spin-down window so the service never actually sleeps)
    if (process.env.NODE_ENV === "production") {
      const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      setInterval(() => {
        const mod = require(selfUrl.startsWith("https") ? "https" : "http");
        mod.get(`${selfUrl}/ping`, (res) => res.resume()).on("error", () => {});
      }, 5 * 60 * 1000);
      logger.info("✅ Keep-alive ping enabled (every 5 min)");
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
    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
      logger.info("✅ MongoDB connection closed");
    } catch (e) {
      logger.warn("⚠️  Error closing MongoDB connection", { error: e.message });
    }
    try {
      const { redis } = require("./config/redis");
      if (redis) await redis.quit();
      if (socketPubClient) await socketPubClient.quit();
      if (socketSubClient) await socketSubClient.quit();
      logger.info("✅ Redis connections closed");
    } catch (e) {
      logger.warn("⚠️  Error closing Redis connections", { error: e.message });
    }
    logger.info("✅ Graceful shutdown complete");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15000); // force kill after 15s
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — exiting", { error: err.message, stack: err.stack });
  process.exit(1);
});
// Redis/Upstash errors are non-fatal: the app runs in degraded mode (cache
// disabled, single-node sockets) without it, so a quota/connection error must
// never crash the process. Swallow those; exit only on genuinely fatal rejections.
const isNonFatalRejection = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return (
    err?.name === 'ReplyError' ||
    msg.includes('max requests limit exceeded') ||
    msg.includes('upstash') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('redis')
  );
};
process.on("unhandledRejection", (err) => {
  if (isNonFatalRejection(err)) {
    logger.warn("Non-fatal unhandled rejection (ignored — degraded mode)", { error: err?.message });
    return;
  }
  logger.error("Unhandled rejection — exiting", { error: err?.message, stack: err?.stack });
  process.exit(1);
});

module.exports = { app, server, io };
