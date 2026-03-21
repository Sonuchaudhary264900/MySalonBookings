// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    isWalkIn: { type: Boolean, default: false },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    customerGender: { type: String, enum: ['male', 'female'] },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    salonName: String,
    salonPhone: String,
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceName: String,
    services: [
      {
        serviceId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        serviceName:  String,
        servicePrice: Number,
        duration:     Number,
      }
    ],
    barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber' },
    barberName: String,
    appointmentDate: Date,
    appointmentTime: String,
    appointmentEndTime: String,
    estimatedDuration: Number,
    queuePosition: Number,
    estimatedWaitTime: Number,
    servicePrice: Number,
    discount: { type: Number, default: 0 },
    couponApplied: String,
    totalAmount: Number,
    paymentMethod: { type: String, enum: ['online', 'cash', 'wallet'] },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'] },
    transactionId: String,
    paidAt: Date,
    status: { type: String, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    confirmedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    refundAmount: { type: Number, default: 0 },
    refundStatus: String,
    specialRequests: String,
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    reviewPhotos: [String],
    reviewedAt: Date,
    confirmationSentAt: Date,
    reminderSentAt: Date,
    tenMinReminderSent: { type: Boolean, default: false },
    oneHourReminderSent: { type: Boolean, default: false },
    ownerNotes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound indexes for the most common query patterns
bookingSchema.index({ salonId: 1, appointmentDate: 1, status: 1 }); // slot-checking & owner bookings filter
bookingSchema.index({ customerId: 1, createdAt: -1 });               // customer booking list
bookingSchema.index({ salonId: 1, createdAt: -1 });                  // owner booking list (analytics)
bookingSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

bookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    // No DB round-trip: timestamp + random suffix is unique enough at this scale
    this.bookingId = `BOOK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);