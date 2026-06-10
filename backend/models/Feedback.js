// models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userType' },
    userType: { type: String, enum: ['Customer', 'Owner'], required: true },
    userName:  String,
    userPhone: String,

    type:     { type: String, enum: ['bug', 'suggestion', 'feedback'], default: 'feedback' },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },

    subject:     { type: String, required: true },
    description: { type: String, required: true },

    screenshotUrl: String,

    sourceSurface: {
      type: String,
      enum: ['customer_web', 'customer_android', 'owner_web', 'owner_android'],
      required: true,
    },
    appVersion: String,
    osVersion: String,
    deviceInfo: String,

    status: { type: String, enum: ['open', 'in_review', 'resolved', 'closed'], default: 'open' },
    adminNotes: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
