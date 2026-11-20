import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

export const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/;

// Only these env vars may be injected into migration SQL; anything else (e.g. DATABASE_URL) is rejected.
export const SQL_PLACEHOLDER_ENV = ['APP_BACKEND_DB_PASSWORD', 'FORECAST_JOB_DB_PASSWORD'];

const PLACEHOLDER_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;
// Arbitrary constant so two runners against the same database never apply migrations concurrently.
const MIGRATION_LOCK_KEY = 727001;

const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    text PRIMARY KEY,
    checksum    text NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )`;

/** Same checksum on every OS: ignore a UTF-8 BOM and CRLF line endings from git autocrlf. */
export function normalizeSql(content) {
  return content.replace(/^﻿/, '').replace(/\r\n/g, '\n');
}

export function checksumOf(content) {
  return createHash('sha256').update(normalizeSql(content)).digest('hex');
}

/** Reads `NNN_name.sql` files from `dir`, sorted by name. Other files are ignored. */
export async function loadMigrations(dir) {
  const names = (await readdir(dir)).filter((name) => MIGRATION_FILE_PATTERN.test(name)).sort();
  return Promise.all(
    names.map(async (name) => {
      const sql = normalizeSql(await readFile(path.join(dir, name), 'utf8'));
      return { name, sql, checksum: checksumOf(sql) };
    }),
  );
}

/**
 * Replaces `{{ENV_NAME}}` with the value escaped as an SQL literal. A line whose placeholder has no
 * value is dropped (so a placeholder must sit in a one-line statement) and its name is returned in
 * `skipped`. The checksum is always taken from the file, never from the rendered SQL.
 */
export function renderPlaceholders(sql, values) {
  const skipped = new Set();
  const lines = [];

  for (const line of sql.split('\n')) {
    const names = [...line.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
    const unknown = names.filter((name) => !SQL_PLACEHOLDER_ENV.includes(name));
    if (unknown.length > 0) {
      throw new Error(`Placeholder tidak dikenal di migrasi: ${unknown.join(', ')}`);
    }

    const missing = names.filter((name) => !values[name]);
    if (missing.length > 0) {
      missing.forEach((name) => skipped.add(name));
      continue;
    }

    lines.push(line.replace(PLACEHOLDER_PATTERN, (_, name) => pg.escapeLiteral(values[name])));
  }

  return { sql: lines.join('\n'), skipped: [...skipped] };
}

/** Compares files on disk with rows in schema_migrations. */
export function planMigrations(migrations, appliedRows) {
  const applied = new Map(appliedRows.map((row) => [row.filename, row]));
  const fileNames = new Set(migrations.map((m) => m.name));

  return {
    pending: migrations.filter((m) => !applied.has(m.name)),
    changed: migrations
      .filter((m) => applied.has(m.name) && applied.get(m.name).checksum !== m.checksum)
      .map((m) => m.name),
    missing: appliedRows.filter((row) => !fileNames.has(row.filename)).map((row) => row.filename),
  };
}

async function readApplied(client) {
  const { rows } = await client.query(
    'SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename',
  );
  return rows;
}

/**
 * Applies pending migrations in file order, each in its own transaction. Stops before running anything
 * when an already-applied file has a different checksum, or when a placeholder value is missing and
 * `allowMissingValues` is false (only localhost may run without role passwords). `client` must be a
 * dedicated connection (not a pool) because the advisory lock is held per session.
 */
export async function runMigrations({
  client,
  migrations,
  values = {},
  allowMissingValues = false,
  log = console,
}) {
  await client.query(CREATE_TRACKING_TABLE);
  await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);

  try {
    const plan = planMigrations(migrations, await readApplied(client));

    if (plan.changed.length > 0) {
      throw new Error(
        `Checksum berubah untuk migrasi yang sudah dijalankan: ${plan.changed.join(', ')}. ` +
          'Jangan mengubah file migrasi lama; buat file migrasi baru.',
      );
    }
    for (const name of plan.missing) {
      log.warn(`Peringatan: ${name} tercatat di schema_migrations tetapi filenya tidak ada.`);
    }
    if (plan.pending.length === 0) {
      log.info('Tidak ada migrasi baru.');
      return [];
    }

    // Render every file first so a bad placeholder fails before any migration runs.
    const rendered = plan.pending.map((migration) => ({
      migration,
      ...renderPlaceholders(migration.sql, values),
    }));

    const missing = rendered.filter((r) => r.skipped.length > 0);
    if (missing.length > 0 && !allowMissingValues) {
      const names = [...new Set(missing.flatMap((r) => r.skipped))].join(', ');
      const files = missing.map((r) => r.migration.name).join(', ');
      throw new Error(
        `${names} wajib diisi untuk database non-lokal (dipakai ${files}). ` +
          'Isi di backend/.env lalu jalankan ulang. Tidak ada migrasi yang dijalankan.',
      );
    }

    for (const { migration, sql, skipped } of rendered) {
      for (const name of skipped) {
        log.warn(
          `Peringatan: ${name} kosong; statement password di ${migration.name} dilewati. ` +
            'Role belum bisa login dengan password.',
        );
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [
          migration.name,
          migration.checksum,
        ]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        // Only the message: the error object can carry SQL, and the SQL can carry a password.
        throw new Error(`Migrasi ${migration.name} gagal dan dibatalkan: ${err.message}`);
      }
      log.info(`Berhasil: ${migration.name}`);
    }

    return plan.pending.map((m) => m.name);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
  }
}

/** One row per file or tracked migration: status is applied | pending | changed | missing. */
export async function getMigrationStatus({ client, migrations }) {
  const { rows: exists } = await client.query("SELECT to_regclass('schema_migrations') AS name");
  const appliedRows = exists[0].name ? await readApplied(client) : [];
  const applied = new Map(appliedRows.map((row) => [row.filename, row]));
  const plan = planMigrations(migrations, appliedRows);

  const fileRows = migrations.map((m) => {
    const row = applied.get(m.name);
    if (!row) return { filename: m.name, status: 'pending', appliedAt: null };
    const status = plan.changed.includes(m.name) ? 'changed' : 'applied';
    return { filename: m.name, status, appliedAt: row.applied_at };
  });
  const missingRows = plan.missing.map((name) => ({
    filename: name,
    status: 'missing',
    appliedAt: applied.get(name).applied_at,
  }));

  return [...fileRows, ...missingRows].sort((a, b) => a.filename.localeCompare(b.filename));
}
