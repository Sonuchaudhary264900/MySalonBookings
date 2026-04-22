// models/ApiKey.js — public API key for 3rd-party integrations
const mongoose = require('mongoose');
const crypto   = require('crypto');

const VALID_PERMISSIONS = [
  'bookings:read','bookings:write',
  'customers:read','customers:write',
  'services:read','services:write',
  'analytics:read',
];

const apiKeySchema = new mongoose.Schema(
  {
    ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    businessId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    label:       { type: String, required: true, maxlength: 80 },
    keyHash:     { type: String, required: true, select: false }, // SHA-256 of raw key
    keyPrefix:   { type: String, required: true },                // first 8 chars (shown in UI)
    permissions: { type: [String], enum: VALID_PERMISSIONS, default: ['bookings:read'] },
    rateLimit:   {
      requestsPerMinute: { type: Number, default: 60 },
      requestsPerDay:    { type: Number, default: 10000 },
    },
    isActive:   { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
    expiresAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

apiKeySchema.index({ ownerId: 1 });
apiKeySchema.index({ keyHash: 1 }, { unique: true });

// Generate a new raw key — returns { rawKey, keyHash, keyPrefix }
apiKeySchema.statics.generateKey = () => {
  const raw    = 'glx_' + crypto.randomBytes(32).toString('hex');
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12);
  return { rawKey: raw, keyHash: hash, keyPrefix: prefix };
};

// Verify a raw key — returns matching document or null
apiKeySchema.statics.findByRawKey = async function (rawKey) {
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return this.findOne({ keyHash: hash, isActive: true }).select('+keyHash');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
