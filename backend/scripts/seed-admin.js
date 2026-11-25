// Usage: npm run seed:admin
// Creates one admin from ADMIN_EMAIL and ADMIN_PASSWORD. Idempotent: an existing email is left unchanged.
import bcrypt from 'bcrypt';
import { pool } from '../src/db/pool.js';
import { runCli } from './lib/runCli.js';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

await runCli(async () => {
  // CLI-only values, so they are read here instead of in src/config/env.js.
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('ADMIN_EMAIL wajib diisi dengan alamat email yang valid.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD wajib diisi, minimal ${MIN_PASSWORD_LENGTH} karakter.`);
  }

  const { rowCount: exists } = await pool.query('SELECT 1 FROM admins WHERE email = $1', [email]);
  if (exists > 0) {
    console.log(`Admin ${email} sudah ada, dilewati.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rowCount } = await pool.query(
    'INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
    [email, passwordHash],
  );
  console.log(rowCount > 0 ? `Admin ${email} dibuat.` : `Admin ${email} sudah ada, dilewati.`);
});
