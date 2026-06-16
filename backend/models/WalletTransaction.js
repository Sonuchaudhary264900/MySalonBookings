// models/WalletTransaction.js
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerType' },
    ownerType: { type: String, enum: ['Customer', 'Owner'], required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    source: {
      type: String,
      enum: [
        'recharge',           // self top-up via Razorpay
        'booking_payment',    // customer paid for a booking using wallet
        'booking_refund',     // refund credited back to customer wallet
        'booking_earning',    // owner earning from a customer's online/wallet booking payment
        'admin_adjustment',   // manual correction by admin
        'withdrawal',         // money withdrawn back to the user's bank/UPI account
        'withdrawal_refund',  // withdrawal request rejected — amount returned to wallet
        'referral_reward',    // company-funded ₹50 paid to an owner who referred a new business
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    description: String,
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ ownerId: 1, ownerType: 1, createdAt: -1 });
walletTransactionSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
