import { pool } from '../db/pool.js';

export async function findAdminByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, COALESCE(locked_until > now(), false) AS is_locked
     FROM admins
     WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findAdminById(id) {
  const { rows } = await pool.query('SELECT id, email, created_at FROM admins WHERE id = $1', [id]);
  return rows[0] ?? null;
}

/** Only for verifying the current password; never return this row to a client. */
export async function findAdminPasswordHash(id) {
  const { rows } = await pool.query('SELECT password_hash FROM admins WHERE id = $1', [id]);
  return rows[0]?.password_hash ?? null;
}

/** Also clears any login lock: the owner just proved they know the password. */
export async function updateAdminPassword(id, passwordHash) {
  const { rowCount } = await pool.query(
    'UPDATE admins SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1',
    [id, passwordHash],
  );
  return rowCount > 0;
}

/**
 * Counts one failed login. On reaching `maxAttempts` the account is locked for `lockMinutes`
 * and the counter restarts. Runs as one UPDATE so parallel attempts cannot skip the lock.
 * Returns true when this attempt locked the account.
 */
export async function recordFailedLogin(id, { maxAttempts, lockMinutes }) {
  const { rows } = await pool.query(
    `UPDATE admins
     SET failed_attempts = CASE WHEN failed_attempts + 1 >= $2 THEN 0 ELSE failed_attempts + 1 END,
         locked_until    = CASE WHEN failed_attempts + 1 >= $2
                                THEN now() + make_interval(mins => $3)
                                ELSE locked_until END
     WHERE id = $1
     RETURNING COALESCE(locked_until > now(), false) AS is_locked`,
    [id, maxAttempts, lockMinutes],
  );
  return rows[0]?.is_locked === true;
}

export async function recordSuccessfulLogin(id) {
  await pool.query('UPDATE admins SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [id]);
}
