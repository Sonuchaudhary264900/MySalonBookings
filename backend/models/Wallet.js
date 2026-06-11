// models/Wallet.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerType' },
    ownerType: { type: String, enum: ['Customer', 'Owner'], required: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

walletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
