import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checksumOf,
  getMigrationStatus,
  loadMigrations,
  renderPlaceholders,
  runMigrations,
} from '../scripts/lib/migrator.js';

/** Records every query; answers SELECTs on schema_migrations with `applied`. */
function createFakeClient({ applied = [], failOn } = {}) {
  const queries = [];
  return {
    queries,
    async query(text, params) {
      queries.push(text.trim());
      if (failOn && text.includes(failOn)) {
        throw new Error('syntax error at or near "BOOM"');
      }
      if (text.includes('to_regclass')) {
        return { rows: [{ name: 'schema_migrations' }] };
      }
      if (text.startsWith('SELECT filename')) {
        return { rows: applied };
      }
      if (text.startsWith('INSERT INTO schema_migrations')) {
        applied.push({ filename: params[0], checksum: params[1], applied_at: new Date() });
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const silentLog = { info() {}, warn() {} };

function migration(name, sql) {
  return { name, sql, checksum: checksumOf(sql) };
}

describe('loadMigrations', () => {
  let dir;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'djajan-migrations-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns NNN_name.sql files sorted by name and ignores other files', async () => {
    for (const name of ['010_c.sql', '002_b.sql', '001_a.sql', '.gitkeep', 'README.md', '1_bad.sql']) {
      await writeFile(path.join(dir, name), 'SELECT 1;');
    }

    const names = (await loadMigrations(dir)).map((m) => m.name);

    expect(names).toEqual(['001_a.sql', '002_b.sql', '010_c.sql']);
  });
});

describe('checksumOf', () => {
  it('ignores CRLF line endings and a UTF-8 BOM', () => {
    expect(checksumOf('﻿SELECT 1;\r\nSELECT 2;\r\n')).toBe(checksumOf('SELECT 1;\nSELECT 2;\n'));
  });

  it('changes when the content changes', () => {
    expect(checksumOf('SELECT 1;')).not.toBe(checksumOf('SELECT 2;'));
  });
});

describe('renderPlaceholders', () => {
  const sql = [
    'CREATE ROLE app_backend LOGIN;',
    'ALTER ROLE app_backend WITH LOGIN PASSWORD {{APP_BACKEND_DB_PASSWORD}};',
    'ALTER ROLE forecast_job WITH LOGIN PASSWORD {{FORECAST_JOB_DB_PASSWORD}};',
  ].join('\n');

  it('injects values as escaped SQL literals', () => {
    const { sql: rendered, skipped } = renderPlaceholders(sql, {
      APP_BACKEND_DB_PASSWORD: "it's-a-secret",
      FORECAST_JOB_DB_PASSWORD: 'other',
    });

    expect(rendered).toContain("PASSWORD 'it''s-a-secret';");
    expect(rendered).toContain("PASSWORD 'other';");
    expect(skipped).toEqual([]);
  });

  it('drops the line and reports the env name when a value is empty', () => {
    const { sql: rendered, skipped } = renderPlaceholders(sql, {
      APP_BACKEND_DB_PASSWORD: 'secret',
      FORECAST_JOB_DB_PASSWORD: '',
    });

    expect(rendered).not.toContain('forecast_job');
    expect(rendered).not.toContain('{{');
    expect(skipped).toEqual(['FORECAST_JOB_DB_PASSWORD']);
  });

  it('rejects placeholders that are not on the allowlist', () => {
    expect(() => renderPlaceholders('SELECT {{DATABASE_URL}};', { DATABASE_URL: 'x' })).toThrow(
      'Placeholder tidak dikenal',
    );
  });
});

describe('runMigrations', () => {
  const migrations = [
    migration('001_init.sql', 'CREATE TABLE a (id int);'),
    migration('002_more.sql', 'CREATE TABLE b (id int);'),
    migration('003_last.sql', 'CREATE TABLE c (id int);'),
  ];

  it('applies pending files in order, each in its own transaction', async () => {
    const client = createFakeClient();

    const applied = await runMigrations({ client, migrations, log: silentLog });

    expect(applied).toEqual(['001_init.sql', '002_more.sql', '003_last.sql']);
    const ran = client.queries.filter((q) => q.startsWith('CREATE TABLE ') && !q.includes('schema_migrations'));
    expect(ran).toEqual(migrations.map((m) => m.sql));
    expect(client.queries.filter((q) => q === 'BEGIN')).toHaveLength(3);
    expect(client.queries.filter((q) => q === 'COMMIT')).toHaveLength(3);
  });

  it('skips files that were already applied', async () => {
    const client = createFakeClient({
      applied: [{ filename: '001_init.sql', checksum: migrations[0].checksum, applied_at: new Date() }],
    });

    const applied = await runMigrations({ client, migrations, log: silentLog });

    expect(applied).toEqual(['002_more.sql', '003_last.sql']);
    expect(client.queries).not.toContain(migrations[0].sql);
  });

  it('is a no-op on a second run', async () => {
    const client = createFakeClient();
    await runMigrations({ client, migrations, log: silentLog });

    const appliedAgain = await runMigrations({ client, migrations, log: silentLog });

    expect(appliedAgain).toEqual([]);
  });

  it('stops before running anything when an applied file has changed', async () => {
    const client = createFakeClient({
      applied: [{ filename: '001_init.sql', checksum: checksumOf('old content'), applied_at: new Date() }],
    });

    await expect(runMigrations({ client, migrations, log: silentLog })).rejects.toThrow(
      'Checksum berubah untuk migrasi yang sudah dijalankan: 001_init.sql',
    );
    expect(client.queries).not.toContain('BEGIN');
    expect(client.queries.at(-1)).toContain('pg_advisory_unlock');
  });

  it('rolls back a failing file, does not record it, and stops', async () => {
    const failing = [migrations[0], migration('002_bad.sql', 'BOOM;'), migrations[2]];
    const client = createFakeClient({ failOn: 'BOOM' });

    await expect(runMigrations({ client, migrations: failing, log: silentLog })).rejects.toThrow(
      'Migrasi 002_bad.sql gagal dan dibatalkan',
    );
    expect(client.queries).toContain('ROLLBACK');
    expect(client.queries).not.toContain(migrations[2].sql);
    expect(client.queries.at(-1)).toContain('pg_advisory_unlock');
  });

  it('never puts a password into the error message', async () => {
    const roles = migration('001_roles.sql', 'ALTER ROLE x PASSWORD {{APP_BACKEND_DB_PASSWORD}};');
    const client = createFakeClient({ failOn: 'ALTER ROLE' });

    const error = await runMigrations({
      client,
      migrations: [roles],
      values: { APP_BACKEND_DB_PASSWORD: 'super-secret-pw' },
      log: silentLog,
    }).catch((err) => err);

    expect(error.message).not.toContain('super-secret-pw');
  });

  describe('empty role passwords', () => {
    const roleMigrations = [
      migration('001_init.sql', 'CREATE TABLE a (id int);'),
      migration(
        '002_roles.sql',
        [
          'CREATE ROLE app_backend LOGIN;',
          'ALTER ROLE app_backend WITH LOGIN PASSWORD {{APP_BACKEND_DB_PASSWORD}};',
          'ALTER ROLE forecast_job WITH LOGIN PASSWORD {{FORECAST_JOB_DB_PASSWORD}};',
        ].join('\n'),
      ),
    ];

    it.each([
      ['both empty', {}, 'APP_BACKEND_DB_PASSWORD, FORECAST_JOB_DB_PASSWORD wajib diisi'],
      ['one empty', { APP_BACKEND_DB_PASSWORD: 'secret' }, 'FORECAST_JOB_DB_PASSWORD wajib diisi'],
    ])('stops before running any migration on a non-local database (%s)', async (_, values, message) => {
      const client = createFakeClient();

      const error = await runMigrations({ client, migrations: roleMigrations, values, log: silentLog }).catch(
        (err) => err,
      );

      expect(error.message).toContain(message);
      expect(error.message).toContain('002_roles.sql');
      expect(client.queries).not.toContain('BEGIN');
      expect(client.queries.at(-1)).toContain('pg_advisory_unlock');
    });

    it('runs with a warning on localhost', async () => {
      const warnings = [];
      const client = createFakeClient();

      const applied = await runMigrations({
        client,
        migrations: roleMigrations,
        values: {},
        allowMissingValues: true,
        log: { info() {}, warn: (msg) => warnings.push(msg) },
      });

      expect(applied).toEqual(['001_init.sql', '002_roles.sql']);
      expect(warnings.join('\n')).toContain('APP_BACKEND_DB_PASSWORD kosong');
      expect(client.queries.join('\n')).not.toContain('PASSWORD');
    });

    it('runs normally on a non-local database when both passwords are set', async () => {
      const client = createFakeClient();

      const applied = await runMigrations({
        client,
        migrations: roleMigrations,
        values: { APP_BACKEND_DB_PASSWORD: 'a', FORECAST_JOB_DB_PASSWORD: 'b' },
        log: silentLog,
      });

      expect(applied).toEqual(['001_init.sql', '002_roles.sql']);
    });
  });
});

describe('getMigrationStatus', () => {
  it('reports applied, pending, changed, and missing migrations', async () => {
    const client = createFakeClient({
      applied: [
        { filename: '000_gone.sql', checksum: 'x', applied_at: new Date() },
        { filename: '001_a.sql', checksum: checksumOf('A'), applied_at: new Date() },
        { filename: '002_b.sql', checksum: checksumOf('old'), applied_at: new Date() },
      ],
    });

    const rows = await getMigrationStatus({
      client,
      migrations: [migration('001_a.sql', 'A'), migration('002_b.sql', 'B'), migration('003_c.sql', 'C')],
    });

    expect(rows.map((r) => [r.filename, r.status])).toEqual([
      ['000_gone.sql', 'missing'],
      ['001_a.sql', 'applied'],
      ['002_b.sql', 'changed'],
      ['003_c.sql', 'pending'],
    ]);
  });
});
