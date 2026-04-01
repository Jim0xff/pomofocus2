function createRequestContextMiddleware(logger) {
  return (req, _res, next) => {
    req.logger = logger.child({
      method: req.method,
      path: req.originalUrl,
    });

    next();
  };
}

module.exports = {
  createRequestContextMiddleware,
};
