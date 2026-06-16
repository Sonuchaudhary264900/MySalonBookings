// models/CreditBalance.js
// Non-cash Booking Credits balance, per (customer, scope).
// scopeSalonId = null  → platform-wide credit (usable at any shop)
// scopeSalonId = <id>  → shop-locked credit (usable ONLY at that salon)
const mongoose = require('mongoose');

const creditBalanceSchema = new mongoose.Schema(
  {
    customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    scopeSalonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
    earned:       { type: Number, default: 0, min: 0 },
    used:         { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Exactly one row per (customer, scope). null scope is a valid unique value → one platform-wide row.
creditBalanceSchema.index({ customerId: 1, scopeSalonId: 1 }, { unique: true });

module.exports = mongoose.model('CreditBalance', creditBalanceSchema);
