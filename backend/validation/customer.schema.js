const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.bulkCustomerAction = Joi.object({
  ids:    Joi.array().items(objectId).min(1).max(500).required(),
  action: Joi.string().valid('tag','block','unblock','export').required(),
  payload: Joi.object({
    tag: Joi.string().valid('VIP','Regular','New').optional(),
  }).optional(),
});

exports.updateCustomer = Joi.object({
  name:        Joi.string().min(2).max(100).optional(),
  email:       Joi.string().email().optional().allow(''),
  dateOfBirth: Joi.date().iso().max('now').optional(),
  notes:       Joi.string().max(500).optional().allow(''),
});
