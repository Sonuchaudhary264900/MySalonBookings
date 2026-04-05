const mongoose = require('mongoose');

const promotionPricingSchema = new mongoose.Schema(
  {
    radiusKm:     { type: Number, required: true, min: 1 },
    pricePerWeek: { type: Number, required: true, min: 0 },
    label:        { type: String, trim: true },   // e.g. "5 km – ₹299/week"
    isActive:     { type: Boolean, default: true },
    sortOrder:    { type: Number, default: 0 },   // for display ordering
  },
  { timestamps: true }
);

promotionPricingSchema.index({ radiusKm: 1 }, { unique: true });
promotionPricingSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('PromotionPricing', promotionPricingSchema);
