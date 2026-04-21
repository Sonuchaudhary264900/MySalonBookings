const mongoose = require('mongoose');

const catalogEntrySchema = new mongoose.Schema({
  businessType:  { type: String, required: true, trim: true },
  category:      { type: String, required: true, trim: true },
  categoryImage: { type: String, default: '' },
  subCategory:   { type: String, default: '', trim: true },
  name:          { type: String, required: true, trim: true },
  defaultImage:  { type: String, default: '' },
  priceHints:    [{ type: Number }],
  durationHints: [{ type: Number }],
  defaultDuration: { type: Number, default: 30 },
  isActive:      { type: Boolean, default: true },
  order:         { type: Number, default: 0 },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

// Prevent duplicate service within same businessType+category+subCategory
catalogEntrySchema.index(
  { businessType: 1, category: 1, subCategory: 1, name: 1 },
  { unique: true }
);
catalogEntrySchema.index({ businessType: 1, category: 1 });
catalogEntrySchema.index({ isActive: 1 });

module.exports = mongoose.model('CatalogEntry', catalogEntrySchema);
