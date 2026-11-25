import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  findAdminByEmail,
  findAdminById,
  findAdminPasswordHash,
  recordFailedLogin,
  recordSuccessfulLogin,
  updateAdminPassword,
} from '../repositories/adminRepository.js';
import { ClientError } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';

// docs/API.md: token valid 8 hours; 5 wrong passwords -> 429 for 15 minutes.
const TOKEN_TTL = '8h';
const JWT_ALGORITHM = 'HS256';
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

// Hash of a random string (cost 12, same as BCRYPT_ROUNDS in utils/password.js). Compared against when the email is unknown,
// so the response time does not reveal which emails have an account.
const DUMMY_HASH = '$2b$12$9X0GRMYKsl5HtDPNhshDCOr/GwnOfvyCZvGCxob4o/cW7PWm7IUoa';

const INVALID_CREDENTIALS = 'Email atau password salah';
const LOCKED = `Terlalu banyak percobaan login gagal. Coba lagi dalam ${LOCK_MINUTES} menit.`;

export function signAccessToken(admin) {
  return jwt.sign({ email: admin.email }, env.JWT_SECRET, {
    subject: admin.id,
    expiresIn: TOKEN_TTL,
    algorithm: JWT_ALGORITHM,
  });
}

/** Throws jsonwebtoken errors (TokenExpiredError, JsonWebTokenError) for bad tokens. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
}

export async function login({ email, password }) {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ClientError(INVALID_CREDENTIALS, 401);
  }
  if (admin.is_locked) {
    throw new ClientError(LOCKED, 429);
  }

  const passwordMatches = await bcrypt.compare(password, admin.password_hash);
  if (!passwordMatches) {
    const locked = await recordFailedLogin(admin.id, {
      maxAttempts: MAX_FAILED_ATTEMPTS,
      lockMinutes: LOCK_MINUTES,
    });
    throw new ClientError(locked ? LOCKED : INVALID_CREDENTIALS, locked ? 429 : 401);
  }

  await recordSuccessfulLogin(admin.id);
  return { token: signAccessToken(admin) };
}

const ACCOUNT_GONE = 'Akun tidak ditemukan, silakan login kembali';

export async function getCurrentAdmin(adminId) {
  const admin = await findAdminById(adminId);
  if (!admin) {
    throw new ClientError(ACCOUNT_GONE, 401);
  }
  return admin;
}

/**
 * A wrong current password is 400, not 401: the session is still valid, and the frontend
 * logs the owner out on any 401 from an admin call.
 */
export async function changePassword(adminId, { currentPassword, newPassword }) {
  const passwordHash = await findAdminPasswordHash(adminId);
  if (!passwordHash) {
    throw new ClientError(ACCOUNT_GONE, 401);
  }
  if (!(await bcrypt.compare(currentPassword, passwordHash))) {
    throw new ClientError('Password lama salah', 400);
  }
  if (!(await updateAdminPassword(adminId, await hashPassword(newPassword)))) {
    throw new ClientError(ACCOUNT_GONE, 401);
  }
}
