// models/BusinessMedia.js
const mongoose = require('mongoose');

const businessMediaSchema = new mongoose.Schema(
  {
    businessId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Business',
      required: true,
      index:    true,
    },
    type: {
      type:     String,
      enum:     ['photo', 'video', 'reel'],
      required: true,
    },
    url:       { type: String, required: true },
    publicId:  { type: String, default: '' },
    caption:   { type: String, default: '' },
    tags:      [{ type: String }],
    isCover:   { type: Boolean, default: false },

    // Before/after portfolio pairing
    role:       { type: String, enum: ['before', 'after', null], default: null },
    pairedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessMedia', default: null },

    // For reels only
    categories:   [{ type: String }],
    targetGender: { type: String, enum: ['male', 'female', 'both'], default: 'both' },

    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

businessMediaSchema.index({ businessId: 1, type: 1 });
businessMediaSchema.index({ businessId: 1, role: 1 }, { sparse: true });
businessMediaSchema.index({ deletedAt: 1 }, { sparse: true });

module.exports = mongoose.model('BusinessMedia', businessMediaSchema);
