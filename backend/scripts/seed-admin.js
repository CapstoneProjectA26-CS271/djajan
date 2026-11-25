// Usage: npm run seed:admin
// Creates one admin from ADMIN_EMAIL and ADMIN_PASSWORD. Idempotent: an existing email is left unchanged.
import { pool } from '../src/db/pool.js';
import { checkNewPassword, hashPassword } from '../src/utils/password.js';
import { runCli } from './lib/runCli.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

await runCli(async () => {
  // CLI-only values, so they are read here instead of in src/config/loadEnv.js.
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('ADMIN_EMAIL wajib diisi dengan alamat email yang valid.');
  }
  const passwordProblem = checkNewPassword(password);
  if (passwordProblem) {
    throw new Error(`ADMIN_PASSWORD tidak valid: ${passwordProblem}.`);
  }

  const { rowCount: exists } = await pool.query('SELECT 1 FROM admins WHERE email = $1', [email]);
  if (exists > 0) {
    console.log(`Admin ${email} sudah ada, dilewati.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const { rowCount } = await pool.query(
    'INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
    [email, passwordHash],
  );
  console.log(rowCount > 0 ? `Admin ${email} dibuat.` : `Admin ${email} sudah ada, dilewati.`);
});
