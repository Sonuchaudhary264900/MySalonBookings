const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  salonId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Business',   required: true },
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  senderRole:   { type: String, enum: ['owner', 'customer'], required: true },
  text:         { type: String, required: true, trim: true, maxlength: 1000 },
  readAt:       { type: Date, default: null }, // null = unread
}, { timestamps: true });

messageSchema.index({ bookingId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
