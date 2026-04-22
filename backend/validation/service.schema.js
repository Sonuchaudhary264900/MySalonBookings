const Joi = require('joi');

exports.createService = Joi.object({
  name:        Joi.string().min(2).max(100).required(),
  category:    Joi.string().min(2).max(60).required(),
  price:       Joi.number().min(0).max(100000).required(),
  duration:    Joi.number().integer().min(5).max(480).required(),
  description: Joi.string().max(500).optional().allow(''),
  isActive:    Joi.boolean().default(true),
  imageUrl:    Joi.string().uri().optional().allow(''),
});

exports.updateService = exports.createService.fork(
  ['name','category','price','duration'], (f) => f.optional()
);

exports.bulkUpsertServices = Joi.object({
  services: Joi.array().items(exports.createService).min(1).max(100).required(),
});
