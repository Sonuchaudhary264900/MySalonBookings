const mongoose = require('mongoose');

const reelLikeSchema = new mongoose.Schema(
  {
    videoUrl:  { type: String, required: true, index: true },
    salonId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    // fingerprint = anonymous identifier (IP or device ID from client)
    fingerprint: { type: String, required: true },
  },
  { timestamps: true }
);

// One like per fingerprint per video
reelLikeSchema.index({ videoUrl: 1, fingerprint: 1 }, { unique: true });

module.exports = mongoose.model('ReelLike', reelLikeSchema);
