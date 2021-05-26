
const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(errors.array()[0].msg || 'Invalid input');
    error.statusCode = 422;
    error.data = errors.array();
    return next(error);
  }
  next();
};
