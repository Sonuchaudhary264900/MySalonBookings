const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema({
  serviceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  serviceName: { type: String, required: true, trim: true },
  price:       { type: Number, default: 0 },
  duration:    { type: Number, default: 30 }, // minutes
}, { _id: false });

const freeServiceSchema = new mongoose.Schema({
  serviceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  serviceName: { type: String, required: true, trim: true },
  usageLimit:  { type: Number, default: 1 }, // per billing period
}, { _id: false });

const packageSchema = new mongoose.Schema({
  salonId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  type:        { type: String, enum: ['package', 'membership'], required: true },
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 300 },
  icon:        { type: String, default: '✨' },
  tag:         { type: String, enum: ['popular', 'recommended', 'best_value', ''], default: '' },
  isActive:    { type: Boolean, default: true },

  // ── Package-specific ────────────────────────────────────────────
  services:        { type: [serviceItemSchema], default: [] },
  originalPrice:   { type: Number, default: 0 },
  discountedPrice: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  totalDuration:   { type: Number, default: 0 }, // minutes

  // ── Membership-specific ─────────────────────────────────────────
  price:        { type: Number, default: 0 },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  durationDays: { type: Number, default: 30 },
  benefits: {
    freeServices:    { type: [freeServiceSchema], default: [] },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    priorityBooking: { type: Boolean, default: false },
  },
}, { timestamps: true });

packageSchema.index({ salonId: 1, isActive: 1, type: 1 });

module.exports = mongoose.model('Package', packageSchema);
