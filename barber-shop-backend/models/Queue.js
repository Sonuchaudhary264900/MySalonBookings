// models/Queue.js
const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    date: Date,
    queue: [
      {
        position: Number,
        bookingId: mongoose.Schema.Types.ObjectId,
        customerId: mongoose.Schema.Types.ObjectId,
        customerName: String,
        serviceName: String,
        barberId: mongoose.Schema.Types.ObjectId,
        barberName: String,
        appointmentTime: String,
        estimatedDuration: Number,
        status: { type: String, enum: ['waiting', 'in_progress', 'completed'] },
        startedAt: Date,
        completedAt: Date,
      },
    ],
    totalWaiting: { type: Number, default: 0 },
    totalServed: { type: Number, default: 0 },
    averageWaitTime: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

queueSchema.index({ salonId: 1, date: 1 });

module.exports = mongoose.model('Queue', queueSchema);