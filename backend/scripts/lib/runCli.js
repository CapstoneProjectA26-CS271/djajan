import { pool } from '../../src/db/pool.js';
import { env } from '../../src/config/env.js';

/** Host and database name only: never print the connection string (it holds the password). */
export function describeDatabase(databaseUrl = env.DATABASE_URL) {
  const url = new URL(databaseUrl);
  return `${url.hostname}:${url.port || 5432}${url.pathname}`;
}

/** Runs a CLI script, prints only the error message on failure, and always closes the pool. */
export async function runCli(main) {
  try {
    console.log(`Database: ${describeDatabase()}`);
    await main();
  } catch (err) {
    // ECONNREFUSED arrives as an AggregateError with an empty message.
    console.error(err.message || err.code || 'Gagal terhubung ke database');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
