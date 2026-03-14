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
      serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ MongoDB Connected`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);

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