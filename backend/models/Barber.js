// models/Barber.js
const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: String,
    email: String,
    gender: { type: String, enum: ['male', 'female'] },
    profilePhoto: String,
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    experience: { type: Number, default: 0 },
    specializations: [String],
    bio: String,
    isActive: { type: Boolean, default: true },
    workingDays: [String],
    shiftStart: { type: String, default: '09:00' },
    shiftEnd: { type: String, default: '18:00' },
    breakTime: { start: String, end: String },
    servicesOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

barberSchema.index({ salonId: 1 });
barberSchema.index({ isActive: 1 });

module.exports = mongoose.model('Barber', barberSchema);