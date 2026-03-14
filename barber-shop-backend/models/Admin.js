// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: String,
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['super_admin', 'admin', 'moderator'], default: 'admin' },
    permissions: [String],
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    activityLog: [
      {
        action: String,
        targetId: mongoose.Schema.Types.ObjectId,
        timestamp: { type: Date, default: Date.now },
        details: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

adminSchema.index({ email: 1 });

module.exports = mongoose.model('Admin', adminSchema);