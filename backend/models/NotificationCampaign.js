const mongoose = require('mongoose');

const notificationCampaignSchema = new mongoose.Schema(
  {
    salonId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Salon',   required: true },
    packageId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    packageName: String,
    packageType: String,

    targetType: {
      type: String,
      enum: ['my_customers', 'radius_5km', 'radius_10km', 'radius_25km'],
      required: true,
    },
    targetGender: {
      type: String,
      enum: ['male', 'female', 'both'],
      default: 'both',
    },

    title:   { type: String, required: true },
    message: { type: String, required: true },

    recipientCount: { type: Number, default: 0 },

    isFree: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ['free', 'pending', 'paid'],
      default: 'free',
    },
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    status: {
      type: String,
      enum: ['draft', 'payment_pending', 'sent', 'failed'],
      default: 'draft',
    },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationCampaignSchema.index({ salonId: 1, createdAt: -1 });
notificationCampaignSchema.index({ salonId: 1, status: 1 });

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema);
