const mongoose = require('mongoose');

const reelCommentSchema = new mongoose.Schema(
  {
    videoUrl:   { type: String, required: true, index: true },
    salonId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: String },  // set when customer is authenticated
    name:       { type: String, required: true, trim: true, maxlength: 60 },
    text:       { type: String, required: true, trim: true, maxlength: 500 },
    replies: [
      {
        ownerName: { type: String, required: true, trim: true, maxlength: 60 },
        text:      { type: String, required: true, trim: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReelComment', reelCommentSchema);
