const { sendError } = require('../errors');

function createErrorHandler(logger) {
  return (error, req, res, _next) => {
    if (!error.status) {
      const requestLogger = req.logger || logger;
      requestLogger.error('Unhandled application error', { error });
    }

    return sendError(res, error);
  };
}

module.exports = {
  createErrorHandler,
};
