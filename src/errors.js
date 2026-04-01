class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function sendError(res, error) {
  const status = error.status || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.status ? error.message : 'Internal server error';

  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (error.details) {
    payload.error.details = error.details;
  }

  return res.status(status).json(payload);
}

module.exports = {
  AppError,
  sendError,
};
