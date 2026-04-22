// models/WebhookEndpoint.js — registered URLs for event delivery
const mongoose = require('mongoose');
const crypto   = require('crypto');

const deliveryLogSchema = new mongoose.Schema({
  event:      String,
  statusCode: Number,
  attempt:    Number,
  success:    Boolean,
  error:      String,
  deliveredAt: { type: Date, default: Date.now },
}, { _id: false });

const webhookEndpointSchema = new mongoose.Schema(
  {
    ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    url:        { type: String, required: true },
    label:      { type: String, default: '' },
    events:     [{ type: String }],
    secret:     { type: String, required: true, select: false }, // HMAC signing secret
    isActive:   { type: Boolean, default: true },
    failureCount: { type: Number, default: 0 },
    lastDeliveryAt: { type: Date, default: null },
    deliveryLog: { type: [deliveryLogSchema], default: [] },
  },
  { timestamps: true }
);

webhookEndpointSchema.index({ ownerId: 1, businessId: 1 });

// Generate a new signing secret
webhookEndpointSchema.statics.generateSecret = () =>
  crypto.randomBytes(32).toString('hex');

// Sign a payload for delivery
webhookEndpointSchema.methods.sign = function (payload) {
  return crypto
    .createHmac('sha256', this.secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
};

module.exports = mongoose.model('WebhookEndpoint', webhookEndpointSchema);
