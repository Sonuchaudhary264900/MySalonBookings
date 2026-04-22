// models/AuditLog.js — immutable audit trail for all owner-initiated actions
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    actorRole:  { type: String, enum: ['owner', 'manager', 'receptionist', 'stylist', 'admin'], required: true },
    actorName:  { type: String, default: 'Unknown' },
    action:     { type: String, required: true },    // e.g. 'booking.status_changed'
    entity:     { type: String, required: true },    // e.g. 'Booking'
    entityId:   { type: mongoose.Schema.Types.ObjectId },
    before:     { type: mongoose.Schema.Types.Mixed }, // snapshot before change
    after:      { type: mongoose.Schema.Types.Mixed }, // snapshot after change
    ip:         { type: String },
    userAgent:  { type: String },
    meta:       { type: mongoose.Schema.Types.Mixed }, // extra context
  },
  {
    timestamps: true,
    // Immutable — never update audit logs
    strict: true,
  }
);

// TTL: auto-delete after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
// Query patterns
auditLogSchema.index({ businessId: 1, createdAt: -1 });
auditLogSchema.index({ ownerId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
