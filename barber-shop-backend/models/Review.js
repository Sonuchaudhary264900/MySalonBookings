// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber' },
    salonRating: { type: Number, min: 1, max: 5, required: true },
    barberRating: { type: Number, min: 1, max: 5 },
    serviceRating: { type: Number, min: 1, max: 5 },
    title: String,
    reviewText: String,
    photos: [String],
    isVerified: { type: Boolean, default: true },
    helpfulCount: { type: Number, default: 0 },
    unhelpfulCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    ownerResponse: String,
    ownerRespondedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

reviewSchema.index({ salonId: 1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Review', reviewSchema);