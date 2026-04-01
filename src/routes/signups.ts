import { Router, Request } from 'express';
import { listSignups, submitSignup } from '../services/signup-service.js';

const router = Router();

router.post('/signups', async (req, res, next) => {
  try {
    const result = await submitSignup(req.body);
    const requestId = (req as Request & { requestId?: string }).requestId;
    res.json({
      code: 'OK',
      message: 'Signup submitted',
      requestId,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/signups', async (req, res, next) => {
  try {
    const result = await listSignups(req.query);
    const requestId = (req as Request & { requestId?: string }).requestId;
    res.json({
      code: 'OK',
      message: 'Signup list fetched',
      requestId,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
