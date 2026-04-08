const mongoose = require('mongoose');

const usageTrackingSchema = new mongoose.Schema({
  serviceId:   { type: mongoose.Schema.Types.ObjectId },
  serviceName: { type: String },
  used:        { type: Number, default: 0 },
  limit:       { type: Number, default: 1 },
}, { _id: false });

const userPackageSchema = new mongoose.Schema({
  customerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName:   { type: String, required: true, trim: true },
  customerPhone:  { type: String, trim: true },
  salonId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  packageId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  type:           { type: String, enum: ['package', 'membership'], required: true },
  packageName:    { type: String, required: true, trim: true },
  pricePaid:      { type: Number, required: true },
  purchaseNote:   { type: String, trim: true, maxlength: 300 },

  // ── Lifecycle ───────────────────────────────────────────────────
  status:         { type: String, enum: ['pending', 'active', 'expired', 'rejected'], default: 'pending' },
  startDate:      { type: Date },
  endDate:        { type: Date },
  confirmedAt:    { type: Date },
  rejectedAt:     { type: Date },
  rejectedReason: { type: String, trim: true },

  // ── Usage tracking (memberships) ─────────────────────────────────
  usageTracking: { type: [usageTrackingSchema], default: [] },
}, { timestamps: true });

userPackageSchema.index({ salonId: 1, status: 1, createdAt: -1 });
userPackageSchema.index({ customerId: 1, status: 1, createdAt: -1 });
userPackageSchema.index({ endDate: 1, status: 1 }); // for expiry cron

module.exports = mongoose.model('UserPackage', userPackageSchema);
