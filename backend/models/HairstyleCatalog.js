const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name:                   { type: String, required: true, trim: true },
  faceShapes:             { type: [String], enum: ['oval','round','square','heart','oblong'], required: true },
  gender:                 { type: String, enum: ['male','female','unisex'], default: 'unisex' },
  imageUrl:               { type: String, required: true },
  description:            String,
  whyItWorks:             String,
  suggestedService:       { type: String, required: true },
  compatibleSkinTones:    [String],
  recommendedHairDensity: [String],
  hairType:               { type: String, enum: ['straight','wavy','curly','coily','any'], default: 'any' },
  trending:               { type: Boolean, default: false },
  trendingScore:          { type: Number, default: 0 },
  isActive:               { type: Boolean, default: true },
  order:                  { type: Number, default: 0 },
  overlayImageUrl:        { type: String, default: null },
  promotedSalonIds:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
  // promotionScore is NOT stored — computed inline: promotedSalonIds.length > 0 ? 1000 : 0
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

schema.index({ faceShapes: 1, gender: 1, isActive: 1 });
schema.index({ trending: 1, trendingScore: -1 });
schema.index({ suggestedService: 1 });

module.exports = mongoose.model('HairstyleCatalog', schema);
