// models/StaffNote.js — internal staff notes on bookings (not visible to customers)
const mongoose = require('mongoose');

const staffNoteSchema = new mongoose.Schema(
  {
    bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    salonId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    authorId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ['owner','manager','receptionist','stylist'], required: true },
    content:    { type: String, required: true, maxlength: 1000 },
    isPinned:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

staffNoteSchema.index({ bookingId: 1, createdAt: -1 });
staffNoteSchema.index({ salonId: 1, createdAt: -1 });

module.exports = mongoose.model('StaffNote', staffNoteSchema);
