const { validationResult } = require('express-validator');

/**
 * handleValidationErrors
 * ----------------------
 * Reads the result of express-validator checks and returns a 422
 * response with a list of field errors if anything failed.
 * Must be placed AFTER the validation chain in the route definition.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = handleValidationErrors;
