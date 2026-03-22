/**
 * ============================================================
 * BARBER SHOP SAAS - BACKEND SERVER
 * Production-ready Express server configuration
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
    tracesSampleRate: 0.2,   // capture 20% of requests for performance tracing
  });
}

const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const morgan = require("morgan");

/* ============================================================
   LOAD ENVIRONMENT
============================================================ */

dotenv.config();

/* ============================================================
   DATABASE
============================================================ */

const connectDB = require("./config/database");

/* ============================================================
   ROUTES
============================================================ */

const routes = require("./routes");

/* ============================================================
   SERVICES
============================================================ */

const { testCloudinaryConnection } = require("./config/cloudinary");
const { testRazorpayConnection } = require("./config/razorpay");
const { testGoogleMapsConnection } = require("./config/googleMaps");
const { testFirebaseConnection } = require("./config/firebaseAdmin");

/* ============================================================
   MIDDLEWARE
============================================================ */

const {
  globalErrorHandler,
  notFoundHandler,
  rateLimiter
} = require("./middleware/validationMiddleware");

/* ============================================================
   SOCKET HANDLER
============================================================ */

const socketHandler = require("./socket/socketHandler");

/* ============================================================
   CRON JOBS
============================================================ */

const cronJobs = require("./cron");

/* ============================================================
   CREATE APP
============================================================ */

const app = express();
const server = http.createServer(app);

/* ============================================================
   ALLOWED ORIGINS
============================================================ */

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:3000",
  "http://localhost:3001"
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

/* ============================================================
   SOCKET.IO CONFIGURATION
============================================================ */

const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Make io accessible in route handlers via req.app.get('io')
app.set('io', io);

/* ============================================================
   SECURITY MIDDLEWARE
============================================================ */

// Gzip all responses — reduces payload size by 60–80%
app.use(compression({ level: 6, threshold: 1024 }));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" },
}));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

/* ============================================================
   BODY PARSER
============================================================ */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static("uploads"));

/* ============================================================
   LOGGER
============================================================ */

if (process.env.NODE_ENV !== "test") {
  // "tiny" omits request headers (prevents auth tokens from appearing in logs)
  app.use(morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev"));
}

/* ============================================================
   GLOBAL RATE LIMIT
============================================================ */

app.use("/api/", rateLimiter(500, 900000));

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Barber Shop SaaS API",
    timestamp: new Date().toISOString()
  });
});

/* ============================================================
   API ROUTES
============================================================ */

app.use("/api/v1", routes);

// Keep-alive ping endpoint
app.get("/ping", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

/* ============================================================
   SOCKET CONNECTION
============================================================ */

io.on("connection", (socket) => {
  console.log(`📱 Client connected: ${socket.id}`);

  socketHandler(socket, io);

  socket.on("disconnect", () => {
    console.log(`📵 Client disconnected: ${socket.id}`);
  });
});

/* ============================================================
   ERROR HANDLING
============================================================ */

app.use(notFoundHandler);
// Sentry error handler — must be before globalErrorHandler
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);

/* ============================================================
   DATABASE INIT
============================================================ */

const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

/* ============================================================
   EXTERNAL SERVICES CHECK
============================================================ */

const testExternalServices = async () => {
  console.log("\n📋 Testing External Services...\n");

  try {
    await testCloudinaryConnection();
    console.log("✅ Cloudinary Connected");
  } catch {
    console.warn("⚠️ Cloudinary test failed");
  }

  try {
    await testRazorpayConnection();
    console.log("✅ Razorpay Connected");
  } catch {
    console.warn("⚠️ Razorpay test failed");
  }

  try {
    const googleStatus = await testGoogleMapsConnection();

    if (googleStatus) {
      console.log("✅ Google Maps Connected");
    } else {
      console.log("❌ Google Maps Not Working");
    }
  } catch {
    console.warn("⚠️ Google Maps test failed");
  }

  try {
    await testFirebaseConnection();
    console.log("✅ Firebase Connected (Phone OTP ready)");
  } catch (err) {
    console.warn("⚠️ Firebase test failed:", err.message);
  }
};

/* ============================================================
   START SERVER
============================================================ */

const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5000;

    console.log("══════════════════════════════════════════════");
    console.log("🚀 BARBER SHOP SaaS BACKEND SERVER STARTING");
    console.log("══════════════════════════════════════════════");

    await initializeDatabase();
    await testExternalServices();

    cronJobs;
    console.log("✅ Cron jobs started");

    // Run auto-complete immediately on startup to catch any bookings
    // missed while the server was sleeping (Render free tier)
    try {
      const Booking = require("./models/Booking");
      const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const todayIST = nowIST.toISOString().slice(0, 10);
      const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();

      // Fetch all active bookings (no date filter — let the IST logic below decide)
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
        console.log(`✅ Startup catch-up: completed ${toComplete.length} past booking(s)`);
      }
    } catch (e) {
      console.error("⚠️ Startup catch-up error:", e.message);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);

      // Keep-alive: ping self every 10 min to prevent Render free-tier cold starts
      const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      if (process.env.NODE_ENV === "production") {
        setInterval(() => {
          http.get(`${selfUrl}/ping`, (res) => {
            res.resume(); // discard response body
          }).on("error", () => {}); // silent — don't crash on network hiccup
        }, 10 * 60 * 1000); // every 10 minutes
        console.log("✅ Keep-alive ping enabled (every 10 min)");
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

/* ============================================================
   GRACEFUL SHUTDOWN
============================================================ */

process.on("SIGINT", () => {
  console.log("\n🛑 Server shutting down...");
  process.exit();
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Server terminated...");
  process.exit();
});

/* ============================================================
   EXPORT
============================================================ */

module.exports = { app, server, io };