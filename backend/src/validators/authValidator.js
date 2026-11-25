import { ClientError } from '../utils/errors.js';
import { checkNewPassword } from '../utils/password.js';

const MAX_EMAIL_LENGTH = 254;
// bcrypt only reads the first 72 bytes; the cap just stops oversized input before hashing.
const MAX_PASSWORD_LENGTH = 128;

export function validateLoginInput(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new ClientError('Email dan password wajib diisi', 400);
  }
  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new ClientError('Email atau password terlalu panjang', 400);
  }
  return { email, password };
}

export function validateChangePasswordInput(body) {
  const currentPassword = typeof body?.current_password === 'string' ? body.current_password : '';
  const newPassword = body?.new_password;

  if (!currentPassword) {
    throw new ClientError('Password lama wajib diisi', 400);
  }
  if (currentPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ClientError('Password lama terlalu panjang', 400);
  }
  const problem = checkNewPassword(newPassword);
  if (problem) {
    throw new ClientError(`Password baru tidak valid: ${problem}`, 400);
  }
  if (newPassword === currentPassword) {
    throw new ClientError('Password baru harus berbeda dari password lama', 400);
  }
  return { currentPassword, newPassword };
}
