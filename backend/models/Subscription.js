// models/Subscription.js
// Billing history & invoice records for each owner's billing cycle

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: true,
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    planType: {
      type: String,
      enum: ['starter', 'per_booking'],
      required: true,
    },
    // YYYY-MM format e.g. "2025-03"
    billingMonth: {
      type: String,
      required: true,
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySubscriptionId: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ ownerId: 1, billingMonth: -1 });
subscriptionSchema.index({ salonId: 1 });
subscriptionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
