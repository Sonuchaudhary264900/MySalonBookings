const mongoose = require('mongoose');

const reelViewSchema = new mongoose.Schema(
  {
    videoUrl: { type: String, required: true, index: true },
    salonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    // fingerprint to allow client-side deduplication per session; not unique in DB
    fingerprint: { type: String },
  },
  { timestamps: true }
);

// Index for analytics aggregation
reelViewSchema.index({ salonId: 1, createdAt: -1 });

module.exports = mongoose.model('ReelView', reelViewSchema);
