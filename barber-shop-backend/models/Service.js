// models/Service.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    category: { type: String, enum: ['haircut', 'beard_trim', 'coloring', 'treatment', 'styling', 'shaving', 'other'], default: 'haircut' },
    basePrice: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 },
    variants: [{ name: String, price: Number, duration: Number }],
    applicableFor: { type: [String], enum: ['male', 'female'], default: ['male'] },
    isActive: { type: Boolean, default: true },
    barberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Barber' }],
    photos: [String],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

serviceSchema.index({ salonId: 1, isActive: 1 }); // get active services for a salon (most common query)

module.exports = mongoose.model('Service', serviceSchema);