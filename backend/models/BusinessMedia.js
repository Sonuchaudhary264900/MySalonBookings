// models/BusinessMedia.js
const mongoose = require('mongoose');

const businessMediaSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['photo', 'video', 'reel'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
    tags: [{ type: String }],
    isCover: {
      type: Boolean,
      default: false,
    },
    // For reels only
    categories: [{ type: String }],
    targetGender: {
      type: String,
      enum: ['male', 'female', 'both'],
      default: 'both',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

businessMediaSchema.index({ businessId: 1, type: 1 });

module.exports = mongoose.model('BusinessMedia', businessMediaSchema);
