const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    salonId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Business',  required: true },
    ownerId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Owner',  required: true },
    pricingTierId:     { type: mongoose.Schema.Types.ObjectId, ref: 'PromotionPricing' },
    radiusKm:          { type: Number, required: true },
    pricePaid:         { type: Number, required: true },
    startDate:         { type: Date },
    endDate:           { type: Date },
    status:            {
      type: String,
      enum: ['pending_payment', 'active', 'expired', 'cancelled'],
      default: 'pending_payment',
    },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
  },
  { timestamps: true }
);

// Query helpers
promotionSchema.index({ salonId: 1, status: 1, endDate: 1 });
promotionSchema.index({ ownerId: 1, createdAt: -1 });
promotionSchema.index({ status: 1, endDate: 1 }); // for global expiry cron

module.exports = mongoose.model('Promotion', promotionSchema);
