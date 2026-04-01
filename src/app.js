const express = require('express');
const { AppError } = require('./errors');
const { createLogger } = require('./infra/logger');
const { createErrorHandler } = require('./middleware/error-handler');
const { notFoundHandler } = require('./middleware/not-found');
const { createRequestContextMiddleware } = require('./middleware/request-context');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[0-9()\-\s]{6,32}$/;
const SIGNUP_TYPES = new Set(['individual', 'team']);
const SIGNUP_STATUSES = new Set(['pending', 'approved', 'rejected']);

function normalizeString(value, { lowerCase = false } = {}) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  return lowerCase ? normalized.toLowerCase() : normalized;
}

function normalizeSignup(body = {}) {
  return {
    signupType: normalizeString(body.signupType, { lowerCase: true }),
    name: normalizeString(body.name),
    email: normalizeString(body.email, { lowerCase: true }),
    phone: normalizeString(body.phone),
    projectName: normalizeString(body.projectName),
    projectIntro: normalizeString(body.projectIntro),
  };
}

function normalizeStatusUpdate(body = {}) {
  return {
    status: normalizeString(body.status, { lowerCase: true }),
  };
}

function normalizeListQuery(query = {}) {
  const pageRaw = query.page == null ? '1' : String(query.page).trim();
  const sizeRaw = query.size == null ? '20' : String(query.size).trim();
  const status = query.status == null ? '' : normalizeString(query.status, { lowerCase: true });

  return {
    pageRaw,
    sizeRaw,
    status,
  };
}

function validateSignup(input) {
  const details = [];

  if (!input.signupType) {
    details.push({ field: 'signupType', message: 'Signup type is required.' });
  } else if (!SIGNUP_TYPES.has(input.signupType)) {
    throw new AppError(400, 'INVALID_SIGNUP_TYPE', 'Signup type must be individual or team.');
  }

  if (!input.name) {
    details.push({ field: 'name', message: 'Name is required.' });
  }

  if (!input.email) {
    details.push({ field: 'email', message: 'Email is required.' });
  } else if (!EMAIL_PATTERN.test(input.email)) {
    details.push({ field: 'email', message: 'Email must be valid.' });
  }

  if (!input.phone) {
    details.push({ field: 'phone', message: 'Phone is required.' });
  } else if (!PHONE_PATTERN.test(input.phone)) {
    details.push({ field: 'phone', message: 'Phone must be valid.' });
  }

  if (!input.projectName) {
    details.push({ field: 'projectName', message: 'Project name is required.' });
  }

  if (!input.projectIntro) {
    details.push({ field: 'projectIntro', message: 'Project intro is required.' });
  }

  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', details);
  }
}

function validateListQuery(query) {
  const details = [];
  const page = Number.parseInt(query.pageRaw, 10);
  const size = Number.parseInt(query.sizeRaw, 10);

  if (!Number.isInteger(page) || page < 1) {
    details.push({ field: 'page', message: 'Page must be an integer greater than or equal to 1.' });
  }

  if (!Number.isInteger(size) || size < 1 || size > 100) {
    details.push({ field: 'size', message: 'Size must be an integer between 1 and 100.' });
  }

  if (query.status && !SIGNUP_STATUSES.has(query.status)) {
    details.push({
      field: 'status',
      message: 'Status must be one of pending, approved, or rejected.',
    });
  }

  if (details.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', details);
  }

  return {
    page,
    size,
    status: query.status || undefined,
  };
}

function validateStatusUpdate(input) {
  if (!input.status) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', [
      { field: 'status', message: 'Status is required.' },
    ]);
  }

  if (!SIGNUP_STATUSES.has(input.status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Status must be pending, approved, or rejected.');
  }
}

function parseSignupId(value) {
  const id = Number.parseInt(String(value), 10);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(404, 'SIGNUP_NOT_FOUND', 'Signup not found.');
  }

  return id;
}

function requireAdminToken(adminToken) {
  return (req, _res, next) => {
    if (req.get('x-admin-token') !== adminToken) {
      return next(new AppError(403, 'FORBIDDEN', 'Admin access is required.'));
    }

    return next();
  };
}

function createApp({ signupRepository, adminToken = 'dev-admin-token', logger } = {}) {
  const app = express();
  const appLogger = logger && typeof logger.child === 'function' ? logger : createLogger();

  app.use(express.json());
  app.use(createRequestContextMiddleware(appLogger));

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.post('/api/signups', (req, res, next) => {
    try {
      const signup = normalizeSignup(req.body);
      validateSignup(signup);

      const createdSignup = signupRepository.createSignup(signup);

      return res.status(201).json({
        success: true,
        data: createdSignup,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api/admin', requireAdminToken(adminToken));

  app.get('/api/admin/signups', (req, res, next) => {
    try {
      const query = validateListQuery(normalizeListQuery(req.query));
      const result = signupRepository.listSignups(query);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/signups/:id', (req, res, next) => {
    try {
      const signupId = parseSignupId(req.params.id);
      const signup = signupRepository.getSignupById(signupId);

      if (!signup) {
        throw new AppError(404, 'SIGNUP_NOT_FOUND', 'Signup not found.');
      }

      return res.json({
        success: true,
        data: signup,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/admin/signups/:id/status', (req, res, next) => {
    try {
      const signupId = parseSignupId(req.params.id);
      const payload = normalizeStatusUpdate(req.body);
      validateStatusUpdate(payload);

      const signup = signupRepository.updateSignupStatus(signupId, payload.status);

      if (!signup) {
        throw new AppError(404, 'SIGNUP_NOT_FOUND', 'Signup not found.');
      }

      return res.json({
        success: true,
        data: {
          id: signup.id,
          status: signup.status,
          updatedAt: signup.updatedAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler(appLogger));

  return app;
}

module.exports = {
  createApp,
};
