// models/OTP.js
/*
  OTP Model
  One-Time Password storage for verification
*/

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: String,
    email: String,
    otp: {
      type: String,
      required: true,
    },
    purpose: { type: String, enum: ['registration', 'login', 'phone_verification'] },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    userType: { type: String, enum: ['owner', 'customer'] },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      index: { expireAfterSeconds: 0 },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

otpSchema.index({ phone: 1, purpose: 1 });
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
