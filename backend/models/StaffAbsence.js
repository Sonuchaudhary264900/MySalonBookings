const mongoose = require('mongoose');

const staffAbsenceSchema = new mongoose.Schema({
  salonId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  barberId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Barber',   required: true },
  date:      { type: String, required: true }, // YYYY-MM-DD
  reason:    { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

staffAbsenceSchema.index({ salonId: 1, barberId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StaffAbsence', staffAbsenceSchema);
