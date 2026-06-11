// models/WithdrawalRequest.js
// A request to move wallet money back to the user's own UPI/bank account.
// The wallet is debited immediately when the request is created; if the
// request is rejected the amount is credited back ('withdrawal_refund').
const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerType' },
    ownerType: { type: String, enum: ['Customer', 'Owner'], required: true },
    amount: { type: Number, required: true, min: 1 },
    upiId: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
    refundTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction' },
    adminNote: String,
    processedAt: Date,
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ ownerId: 1, ownerType: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
