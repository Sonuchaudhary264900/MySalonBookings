// models/Barber.js
const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, sparse: true },
    email: String,
    gender: { type: String, enum: ['male', 'female'] },
    profilePhoto: String,
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    experience: { type: Number, default: 0 },
    specializations: [String],
    bio: String,
    isActive: { type: Boolean, default: true },
    workingDays: { type: [String], default: ['monday','tuesday','wednesday','thursday','friday','saturday'] },
    shiftStart: { type: String, default: '09:00' },
    shiftEnd: { type: String, default: '18:00' },
    breakTime: { start: String, end: String },
    servicesOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },

    // Staff management fields
    isOwner:            { type: Boolean, default: false },   // auto-created owner virtual record
    staffRole:          { type: String, enum: ['owner', 'manager', 'receptionist', 'stylist'], default: 'stylist' },
    status:             { type: String, enum: ['invited', 'active', 'blocked'], default: 'invited' },
    firebaseUid:        { type: String, sparse: true, unique: true },
    joinedAt:           { type: Date, default: null },
    lastLogin:          { type: Date, default: null },
    showEarningsToStaff:{ type: Boolean, default: false },
    ownerId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' }, // the Owner who added this staff
    refreshTokens:      [{ token: String, createdAt: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

barberSchema.index({ salonId: 1 });
barberSchema.index({ isActive: 1 });
barberSchema.index({ salonId: 1, isActive: 1 });           // team list — most common query
barberSchema.index({ salonId: 1, isOwner: 1 });            // find owner virtual record fast
barberSchema.index({ ownerId: 1 });                        // owner → all their staff
barberSchema.index({ salonId: 1, specializations: 1 });    // StyleAI Stylist Match query

// Keep only the last 5 refresh tokens to prevent unbounded array growth
barberSchema.pre('save', function (next) {
  if (this.isModified('refreshTokens') && this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  next();
});

module.exports = mongoose.model('Barber', barberSchema);