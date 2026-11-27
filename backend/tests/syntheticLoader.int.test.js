// Integration test against a real, fully migrated Postgres. Runs only when INTEGRATION_DATABASE_URL (owner
// connection) and SYNTHETIC_LOADER_DB_PASSWORD are set, as in the CI "backend" job; skipped otherwise.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import pg from 'pg';

const ownerUrl = process.env.INTEGRATION_DATABASE_URL;
const loaderPassword = process.env.SYNTHETIC_LOADER_DB_PASSWORD;
const SESSION = 'int-test-synthetic-loader';

describe.skipIf(!ownerUrl || !loaderPassword)('synthetic_loader role (migration 003)', () => {
  let owner;
  let loader;

  beforeAll(async () => {
    owner = new pg.Client({ connectionString: ownerUrl });
    const loaderUrl = new URL(ownerUrl);
    loaderUrl.username = 'synthetic_loader';
    loaderUrl.password = encodeURIComponent(loaderPassword);
    loader = new pg.Client({ connectionString: loaderUrl.toString() });
    await Promise.all([owner.connect(), loader.connect()]);
  });

  afterEach(async () => {
    await owner.query('DELETE FROM events WHERE session_id = $1', [SESSION]);
  });

  afterAll(async () => {
    await Promise.all([owner?.end(), loader?.end()]);
  });

  async function insertAs(client, isSynthetic) {
    const { rows } = await client.query(
      `INSERT INTO events (session_id, event_type, is_synthetic) VALUES ($1, 'page_view', $2)
       RETURNING id, is_synthetic`,
      [SESSION, isSynthetic],
    );
    return rows[0];
  }

  it('forces is_synthetic = true on every row it inserts', async () => {
    const row = await insertAs(loader, false);

    expect(row.is_synthetic).toBe(true);
  });

  it('can delete synthetic events', async () => {
    await insertAs(loader, true);

    const { rowCount } = await loader.query('DELETE FROM events WHERE session_id = $1 AND is_synthetic', [
      SESSION,
    ]);

    expect(rowCount).toBe(1);
  });

  it('cannot delete a real event, and the whole statement is rolled back', async () => {
    const real = await insertAs(owner, false);
    await insertAs(loader, true);

    await expect(loader.query('DELETE FROM events WHERE session_id = $1', [SESSION])).rejects.toMatchObject({
      code: '42501',
    });

    const { rows } = await owner.query('SELECT id, is_synthetic FROM events WHERE session_id = $1 ORDER BY id', [
      SESSION,
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: real.id, is_synthetic: false });
  });

  it('does not change inserts by other roles', async () => {
    const row = await insertAs(owner, false);

    expect(row.is_synthetic).toBe(false);
  });

  it.each([
    ['UPDATE events', "UPDATE events SET utm_source = 'x' WHERE session_id = 'none'"],
    ['TRUNCATE events', 'TRUNCATE events'],
    ['read admins', 'SELECT 1 FROM admins LIMIT 1'],
    ['write menus', "UPDATE menus SET name = name WHERE slug = 'none'"],
    ['write forecast results', "DELETE FROM forecast_runs WHERE status = 'none'"],
  ])('is denied: %s', async (_case, sql) => {
    await expect(loader.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('can read menus to pick menu ids', async () => {
    await expect(loader.query('SELECT id FROM menus LIMIT 1')).resolves.toBeDefined();
  });
});
