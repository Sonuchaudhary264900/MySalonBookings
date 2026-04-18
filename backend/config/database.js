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

    // ── One-time migration: drop TTL index on refreshTokens.createdAt ──
    // expires: 7d on a subdocument array field caused MongoDB to delete entire
    // Owner/Customer documents 7 days after first login. Must be dropped from Atlas.
    for (const collName of ['owners', 'customers']) {
      try {
        const coll = conn.connection.db.collection(collName);
        const indexes = await coll.indexes();
        const ttlIndex = indexes.find(i => i.name === 'refreshTokens.createdAt_1');
        if (ttlIndex) {
          await coll.dropIndex('refreshTokens.createdAt_1');
          console.log(`✅ Migration: dropped TTL index on ${collName}.refreshTokens.createdAt`);
        }
      } catch (migErr) {
        console.warn(`⚠️  Migration (${collName} TTL index): ` + migErr.message);
      }
    }

    // ── One-time migration: drop unused fields from customers ──────────────
    try {
      const customers = conn.connection.db.collection('customers');
      const sample = await customers.findOne({ $or: [{ alternatePhone: { $exists: true } }, { preferredBarbers: { $exists: true } }] });
      if (sample) {
        const { modifiedCount } = await customers.updateMany({}, { $unset: { alternatePhone: '', preferredBarbers: '' } });
        console.log(`✅ Migration: removed alternatePhone/preferredBarbers from ${modifiedCount} customer(s)`);
      }
    } catch (migErr) {
      console.warn('⚠️  Migration (customers unused fields): ' + migErr.message);
    }

    // ── One-time migration: drop unused referral fields from owners ─────────
    try {
      const owners = conn.connection.db.collection('owners');
      const sample = await owners.findOne({ $or: [{ referredBy: { $exists: true } }, { referralCode: { $exists: true } }, { referralAppliedAt: { $exists: true } }] });
      if (sample) {
        const { modifiedCount } = await owners.updateMany({}, { $unset: { referredBy: '', referralCode: '', referralAppliedAt: '' } });
        console.log(`✅ Migration: removed referral fields from ${modifiedCount} owner(s)`);
      }
    } catch (migErr) {
      console.warn('⚠️  Migration (owners referral fields): ' + migErr.message);
    }

    // ── One-time migration: drop ctaPhoto from salons ───────────────────────
    try {
      const salons = conn.connection.db.collection('salons');
      const sample = await salons.findOne({ ctaPhoto: { $exists: true } });
      if (sample) {
        const { modifiedCount } = await salons.updateMany({}, { $unset: { ctaPhoto: '' } });
        console.log(`✅ Migration: removed ctaPhoto from ${modifiedCount} salon(s)`);
      }
    } catch (migErr) {
      console.warn('⚠️  Migration (salons ctaPhoto): ' + migErr.message);
    }

    // ── One-time migration: bookings — drop duplicate top-level service fields
    //    and promote flat reminder booleans into remindersSent sub-object ─────
    try {
      const bookings = conn.connection.db.collection('bookings');

      // Drop legacy single-service fields (duplicated in services[])
      const legacySample = await bookings.findOne({ $or: [{ serviceId: { $exists: true } }, { serviceName: { $exists: true } }, { servicePrice: { $exists: true } }] });
      if (legacySample) {
        const { modifiedCount } = await bookings.updateMany({}, { $unset: { serviceId: '', serviceName: '', servicePrice: '' } });
        console.log(`✅ Migration: removed legacy service fields from ${modifiedCount} booking(s)`);
      }

      // Migrate flat reminder booleans → remindersSent sub-object
      const reminderSample = await bookings.findOne({ tenMinReminderSent: { $exists: true } });
      if (reminderSample) {
        const { modifiedCount } = await bookings.updateMany(
          { tenMinReminderSent: { $exists: true } },
          [
            {
              $set: {
                remindersSent: {
                  tenMin:    { $ifNull: ['$tenMinReminderSent',    false] },
                  thirtyMin: { $ifNull: ['$thirtyMinReminderSent', false] },
                  oneHour:   { $ifNull: ['$oneHourReminderSent',   false] },
                },
              },
            },
            { $unset: ['tenMinReminderSent', 'thirtyMinReminderSent', 'oneHourReminderSent'] },
          ]
        );
        console.log(`✅ Migration: consolidated remindersSent on ${modifiedCount} booking(s)`);
      }
    } catch (migErr) {
      console.warn('⚠️  Migration (bookings cleanup): ' + migErr.message);
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