const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  hairstyleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'HairstyleCatalog', required: true },
  event_type:    {
    type: String, required: true,
    enum: [
      'impression', 'click', 'save', 'unsave', 'book_cta',
      'converted_booking', 'outcome_positive', 'outcome_negative',
      'stylist_match_click', 'manual_override',
    ],
  },
  faceShape:     { type: String, enum: ['oval','round','square','heart','oblong'], default: null },
  confidence:    Number,
  detectionMode: { type: String, enum: ['on_device','server','manual'], default: null },
  bookingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  platform:      { type: String, enum: ['web','mobile'], default: 'web' },
  createdAt:     { type: Date, default: Date.now },
}, { timestamps: false });

schema.index({ customerId: 1, createdAt: -1 });
schema.index({ hairstyleId: 1, event_type: 1 });
schema.index({ event_type: 1, createdAt: -1 });
schema.index({ customerId: 1, event_type: 1, createdAt: -1 });
schema.index({ event_type: 1, createdAt: 1 }); // for monthly impression cleanup cron

// NO TTL index — would destroy ML training data (converted_booking, outcome_positive, manual_override).
// Use monthly cron: HairstyleInteraction.deleteMany({ event_type:'impression', createdAt:{ $lt: 90daysAgo } })

module.exports = mongoose.model('HairstyleInteraction', schema);
