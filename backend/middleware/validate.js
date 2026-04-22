// validate(schema) — Joi validation middleware factory
// Usage: router.post('/route', validate(mySchema), handler)

const { formatErrorResponse } = require('../utils/formatters');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly:    false,
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => d.message.replace(/["]/g, ''));
    return res.status(400).json(formatErrorResponse('Validation error', 400, errors));
  }

  req[source] = value; // replace with sanitized + coerced value
  next();
};

module.exports = { validate };
