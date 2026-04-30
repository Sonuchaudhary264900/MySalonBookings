const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  customerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', unique: true, required: true },
  faceShape:      { type: String, enum: ['oval','round','square','heart','oblong'] },
  confidence:     Number,
  manualShape:    String,
  hairDensity:    { type: String, enum: ['thick','medium','fine'] },
  skinTone:       { type: String, enum: ['fair','medium','olive','deep'] },
  gender:         String,
  savedStyleIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'HairstyleCatalog' }],
  bookedStyleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HairstyleCatalog' }],
  lastScannedAt:  Date,
}, { timestamps: true });

schema.index({ customerId: 1 }, { unique: true });
schema.index({ faceShape: 1, gender: 1 });

module.exports = mongoose.model('UserFaceProfile', schema);
