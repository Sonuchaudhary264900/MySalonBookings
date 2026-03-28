// models/Coupon.js
const mongoose = require('mongoose');

const usageHistorySchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    discountApplied: { type: Number, default: 0 },
    usedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: String,
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', default: null },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    maxDiscount: Number,
    minAmount: { type: Number, default: 0 },
    validFrom: Date,
    validUntil: Date,
    maxUsageCount: Number,
    maxUsagePerCustomer: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    usedBy: [mongoose.Schema.Types.ObjectId],
    usageHistory: [usageHistorySchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ salonId: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
