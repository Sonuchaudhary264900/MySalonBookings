// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true },
    razorpayId: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
    amount: Number,
    currency: { type: String, default: 'INR' },
    discount: Number,
    finalAmount: Number,
    paymentMethod: String,
    paymentStatus: { type: String, enum: ['pending', 'success', 'failed'] },
    razorpayResponse: mongoose.Schema.Types.Mixed,
    refundAmount: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ['none', 'partial', 'full'] },
    refundDate: Date,
    refundRazorpayId: String,
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

transactionSchema.index({ customerId: 1 });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);