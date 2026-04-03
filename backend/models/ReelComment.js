const mongoose = require('mongoose');

const reelCommentSchema = new mongoose.Schema(
  {
    videoUrl:    { type: String, required: true, index: true },
    salonId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    text:        { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReelComment', reelCommentSchema);