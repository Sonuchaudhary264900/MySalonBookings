const Joi = require('joi');

exports.createCoupon = Joi.object({
  code:           Joi.string().alphanum().min(3).max(20).uppercase().required(),
  discountType:   Joi.string().valid('percentage','fixed').required(),
  discountValue:  Joi.number().min(0).max(100000).required(),
  minOrderAmount: Joi.number().min(0).default(0),
  maxUsageCount:  Joi.number().integer().min(1).default(1000),
  expiresAt:      Joi.date().iso().min('now').optional(),
  description:    Joi.string().max(200).optional().allow(''),
});

exports.updateCoupon = exports.createCoupon.fork(
  ['code','discountType','discountValue'], (f) => f.optional()
);
