const mongoose = require('mongoose');

const reelViewSchema = new mongoose.Schema(
  {
    videoUrl: { type: String, required: true, index: true },
    salonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    // fingerprint to allow client-side deduplication per session; not unique in DB
    fingerprint:   { type: String },
    // Phase 2: engagement tracking — how long the user watched this video
    watchTime:     { type: Number, default: 0 }, // seconds actually watched
    videoDuration: { type: Number, default: 0 }, // total video length in seconds
  },
  { timestamps: true }
);

// Index for analytics aggregation
reelViewSchema.index({ salonId: 1, createdAt: -1 });

module.exports = mongoose.model('ReelView', reelViewSchema);
