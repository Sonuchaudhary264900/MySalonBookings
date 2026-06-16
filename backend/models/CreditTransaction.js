// models/CreditTransaction.js
// Append-only history of Booking Credit movements (earn / redeem / admin adjustments).
const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema(
  {
    customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    scopeSalonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
    type:   { type: String, enum: ['earn', 'redeem', 'admin_grant', 'admin_remove'], required: true },
    source: {
      type: String,
      enum: ['referral', 'shop_referral', 'promo', 'coupon', 'reward', 'admin', 'booking', 'booking_refund'],
      required: true,
    },
    amount:       { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true }, // available in that scope after this txn
    bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    description:  String,
    meta:         mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

creditTransactionSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
