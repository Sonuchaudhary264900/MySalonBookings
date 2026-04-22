const Joi = require('joi');

const VALID_EVENTS = [
  'booking.created','booking.confirmed','booking.cancelled','booking.completed',
  'payment.received','review.created','customer.blocked',
];

exports.createWebhook = Joi.object({
  url:    Joi.string().uri({ scheme: ['http','https'] }).required(),
  events: Joi.array().items(Joi.string().valid(...VALID_EVENTS)).min(1).required(),
  label:  Joi.string().max(80).optional().allow(''),
});

exports.updateWebhook = exports.createWebhook.fork(['url','events'], (f) => f.optional());
