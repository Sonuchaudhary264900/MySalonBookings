// models/SubscriptionLog.js
// Immutable audit log for every subscription lifecycle event

const mongoose = require('mongoose');

const subscriptionLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: true,
      index: true,
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
    },
    event: {
      type: String,
      enum: [
        'trial_started',
        'trial_reminder_sent',
        'trial_expired',
        'plan_selected',
        'payment_order_created',
        'payment_success',
        'payment_failed',
        'payment_retry',
        'access_granted',
        'access_blocked',
        'billing_reset',
        'booking_counted',
        'grace_period_started',
        'grace_period_expired',
      ],
      required: true,
      index: true,
    },
    planType: {
      type: String,
      enum: ['free_trial', 'starter', 'per_booking', null],
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['trial', 'paid', 'overdue', 'failed', null],
      default: null,
    },
    accessStatus: {
      type: String,
      enum: ['trial', 'active', 'overdue', 'restricted', null],
      default: null,
    },
    bookingCount: {
      type: Number,
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // IP / source for security audit
    ip: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionLogSchema.index({ ownerId: 1, createdAt: -1 });
subscriptionLogSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionLog', subscriptionLogSchema);
