import bcrypt from 'bcrypt';

// Shared by seed-admin and PATCH /api/auth/password so both enforce the same rules.
export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 12;
// bcrypt ignores everything after 72 bytes, so a longer password would be silently truncated.
export const MAX_PASSWORD_BYTES = 72;

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Returns an Indonesian error message, or null when the password is acceptable. */
export function checkNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return `Password maksimal ${MAX_PASSWORD_BYTES} karakter`;
  }
  return null;
}
