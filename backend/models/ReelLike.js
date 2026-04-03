const mongoose = require('mongoose');

const reelLikeSchema = new mongoose.Schema(
  {
    videoUrl:   { type: String, required: true, index: true },
    salonId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    // customerId — set when the user is authenticated (required for new likes)
    customerId: { type: String, required: true },
    // fingerprint kept for backward compat with legacy anonymous likes
    fingerprint: { type: String },
  },
  { timestamps: true }
);

// One like per customer per video
reelLikeSchema.index({ videoUrl: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('ReelLike', reelLikeSchema);
