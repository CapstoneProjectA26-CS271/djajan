import { Router } from 'express';
import { loginLimiter, passwordChangeLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { changePassword, getCurrentAdmin, login } from '../services/authService.js';
import { validateChangePasswordInput, validateLoginInput } from '../validators/authValidator.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { token } = await login(validateLoginInput(req.body));
  res.json({ status: 'success', data: { token } });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const admin = await getCurrentAdmin(req.admin.id);
  res.json({ status: 'success', data: { admin } });
});

authRouter.patch('/password', requireAuth, passwordChangeLimiter, async (req, res) => {
  await changePassword(req.admin.id, validateChangePasswordInput(req.body));
  res.json({ status: 'success', message: 'Password berhasil diubah' });
});
