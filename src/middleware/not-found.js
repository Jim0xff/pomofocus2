const { AppError } = require('../errors');

function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found.`));
}

module.exports = {
  notFoundHandler,
};
