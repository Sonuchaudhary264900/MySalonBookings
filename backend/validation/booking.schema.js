const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.createBooking = Joi.object({
  customerId:       objectId.required(),
  serviceIds:       Joi.array().items(objectId).min(1).required(),
  barberId:         objectId.optional(),
  appointmentDate:  Joi.date().iso().min('now').required(),
  appointmentTime:  Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  notes:            Joi.string().max(500).optional().allow(''),
  isWalkIn:         Joi.boolean().default(false),
  couponCode:       Joi.string().max(50).optional().allow(''),
});

exports.updateBookingStatus = Joi.object({
  status:     Joi.string().valid('confirmed','in_progress','completed','cancelled','no_show').required(),
  reason:     Joi.string().max(300).optional().allow(''),
  staffNotes: Joi.string().max(500).optional().allow(''),
});

exports.bulkBookingAction = Joi.object({
  ids:    Joi.array().items(objectId).min(1).max(100).required(),
  action: Joi.string().valid('cancel','complete','reassign').required(),
  payload: Joi.object({
    reason:   Joi.string().max(300).optional(),
    barberId: objectId.optional(),
  }).optional(),
});
