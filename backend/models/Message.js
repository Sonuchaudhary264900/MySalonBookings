const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Customer↔Owner chat (booking-scoped)
  bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },

  // All messages belong to a salon
  salonId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },

  // 'customer' = customer↔owner chat, 'team' = internal staff channel
  type:       { type: String, enum: ['customer', 'team'], default: 'customer' },

  senderRole: { type: String, enum: ['owner', 'customer', 'manager', 'receptionist', 'stylist'], required: true },
  senderId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  senderName: { type: String, default: '' },
  text:       { type: String, required: true, trim: true, maxlength: 1000 },
  readAt:     { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ bookingId: 1, createdAt: 1 });
messageSchema.index({ salonId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
