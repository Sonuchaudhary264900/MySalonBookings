// models/BusinessReferral.js
// Tracks a "someone referred a new business" event for the company-funded ₹50 reward.
// Reward fires once the referred business is active >= N days AND has >= N completed bookings.
const mongoose = require('mongoose');

const businessReferralSchema = new mongoose.Schema(
  {
    referrerId:    { type: mongoose.Schema.Types.ObjectId, required: true }, // Customer or Owner
    referrerType:  { type: String, enum: ['Customer', 'Owner'], required: true },
    referrerCode:  { type: String },
    // The newly-referred owner (set at apply time; business may not exist yet during onboarding)
    referredOwnerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true, unique: true },
    referredBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
    status: { type: String, enum: ['pending', 'rewarded', 'rejected'], default: 'pending' },
    rewardAmount: { type: Number },
    rewardType:   { type: String, enum: ['cash', 'credit'] },
    rewardTxnId:  { type: mongoose.Schema.Types.ObjectId },
    completedBookingsAtReward: { type: Number },
    qualifiedAt: Date,
    rewardedAt:  Date,
  },
  { timestamps: true }
);

businessReferralSchema.index({ status: 1 });

module.exports = mongoose.model('BusinessReferral', businessReferralSchema);
