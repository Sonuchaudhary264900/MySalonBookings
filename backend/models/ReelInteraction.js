const mongoose = require('mongoose');

// Phase 2/3: tracks per-user behavioural signals for feed personalisation.
// Each document records one interaction event (skip, full-watch, replay).
// Used by GET /public/reels to compute per-user category boosts/penalties.
const reelInteractionSchema = new mongoose.Schema(
  {
    videoUrl:      { type: String, required: true, index: true },
    salonId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    // Identity: prefer customerId when logged in, fall back to fingerprint
    customerId:    { type: String, index: true },
    fingerprint:   { type: String, index: true },
    // Categories from the reel at time of interaction (denormalised for fast aggregation)
    categories:    [{ type: String }],
    // What happened: skip = watched < 3 s; watch_full = watched ≥ 70 %; replay = looped
    action:        { type: String, enum: ['skip', 'watch_full', 'replay'], required: true },
    watchTime:     { type: Number, default: 0 }, // seconds actually watched
    videoDuration: { type: Number, default: 0 }, // total video length in seconds
    // 0–1: watchTime / videoDuration (0 = skipped immediately, 1 = watched completely)
    watchRatio:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Queries used during personalised feed construction
reelInteractionSchema.index({ customerId:  1, createdAt: -1 });
reelInteractionSchema.index({ fingerprint: 1, createdAt: -1 });

module.exports = mongoose.model('ReelInteraction', reelInteractionSchema);
