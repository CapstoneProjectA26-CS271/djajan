// Usage: npm run migrate          -> apply pending migrations in backend/migrations/
//        npm run migrate:status   -> show which migrations are applied, pending, or changed
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/env.js';
import { isLocalDatabase, pool } from '../src/db/pool.js';
import { runCli } from './lib/runCli.js';
import {
  SQL_PLACEHOLDER_ENV,
  getMigrationStatus,
  loadMigrations,
  runMigrations,
} from './lib/migrator.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const STATUS_LABELS = { applied: 'sudah', pending: 'BELUM', changed: 'BERUBAH', missing: 'FILE HILANG' };

async function printStatus(client, migrations) {
  const rows = await getMigrationStatus({ client, migrations });
  for (const row of rows) {
    const time = row.appliedAt ? new Date(row.appliedAt).toISOString() : '-';
    console.log(`${STATUS_LABELS[row.status].padEnd(11)}  ${row.filename.padEnd(30)}  ${time}`);
  }
  if (rows.some((row) => row.status === 'changed')) process.exitCode = 1;
}

await runCli(async () => {
  const command = process.argv[2] ?? 'up';
  if (!['up', 'status'].includes(command)) {
    throw new Error(`Perintah tidak dikenal: ${command}. Pakai "up" atau "status".`);
  }

  const migrations = await loadMigrations(MIGRATIONS_DIR);
  // Dedicated connection: the migration advisory lock is held per session.
  const client = await pool.connect();
  try {
    if (command === 'status') {
      await printStatus(client, migrations);
      return;
    }
    // CLI-only values, so they are read here instead of in src/config/env.js.
    const values = Object.fromEntries(SQL_PLACEHOLDER_ENV.map((name) => [name, process.env[name]]));
    // Role passwords may only be empty on localhost; Supabase roles must be able to log in.
    await runMigrations({
      client,
      migrations,
      values,
      allowMissingValues: isLocalDatabase(env.DATABASE_URL),
    });
  } finally {
    client.release();
  }
});
