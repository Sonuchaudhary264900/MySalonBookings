/*
  config/database.js
  MongoDB Connection Setup
*/

const mongoose = require("mongoose");

const connectDB = async () => {
  try {

    console.log("🔌 Connecting to MongoDB...");

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,          // max concurrent connections
      minPoolSize: 2,           // keep at least 2 connections warm
      socketTimeoutMS: 45000,   // close idle sockets after 45s
      serverSelectionTimeoutMS: 30000, // allow more time on cloud deployments
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ MongoDB Connected`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);

    // ── One-time migration: drop old global unique index on coupons.code ──
    // The schema now uses a compound unique index { code, salonId } instead.
    try {
      const coupons = conn.connection.db.collection('coupons');
      const indexes = await coupons.indexes();
      if (indexes.some(i => i.name === 'code_1')) {
        await coupons.dropIndex('code_1');
        console.log('✅ Migration: dropped old global coupon code index');
      }
    } catch (migErr) {
      console.warn('⚠️  Migration (coupon index): ' + migErr.message);
    }

    // Connection events
    mongoose.connection.on("connected", () => {
      console.log("📡 Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

  } catch (error) {

    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);

  }
};

module.exports = connectDB;