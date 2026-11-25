import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../services/authService.js';
import { ClientError } from '../utils/errors.js';

/** Guards /api/admin/*: needs `Authorization: Bearer <JWT>`, sets req.admin = { id, email }. */
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new ClientError('Silakan login terlebih dahulu', 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError
        ? 'Sesi sudah berakhir, silakan login kembali'
        : 'Sesi tidak valid, silakan login kembali';
    throw new ClientError(message, 401);
  }

  req.admin = { id: payload.sub, email: payload.email };
  next();
}
