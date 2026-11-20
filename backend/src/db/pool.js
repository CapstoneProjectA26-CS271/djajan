import { readFileSync } from 'node:fs';
import pg from 'pg';
import { env } from '../config/env.js';

// Supabase signs its server certificates with its own root CA (public, not a secret).
const SUPABASE_CA_PATH = new URL('../../certs/prod-ca-2021.crt', import.meta.url);
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Local Docker Postgres has no TLS. Anything else (Supabase) must use TLS with full
 * certificate verification. Do not put `sslmode` in DATABASE_URL: pg lets it override this.
 */
export function sslConfigFor(databaseUrl) {
  const { hostname } = new URL(databaseUrl);
  if (LOCAL_HOSTS.includes(hostname)) {
    return false;
  }
  return { ca: readFileSync(SUPABASE_CA_PATH, 'utf8'), rejectUnauthorized: true };
}

// Use the Supabase pooler connection string in production (see docs/ARCHITECTURE.md).
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfigFor(env.DATABASE_URL),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// An idle client can drop (e.g. pooler restart); log it instead of crashing the process.
pool.on('error', (err) => {
  console.error('Koneksi database idle terputus:', err.message);
});
