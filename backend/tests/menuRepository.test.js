import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/db/pool.js', () => ({
  pool: { query: vi.fn() },
}));

const { pool } = await import('../src/db/pool.js');
const repo = await import('../src/repositories/menuRepository.js');

beforeEach(() => {
  vi.mocked(pool.query).mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
});

function lastQuery() {
  const [sql, params] = vi.mocked(pool.query).mock.lastCall;
  return { sql, params };
}

describe('public queries', () => {
  it('never select cost_price and hide deleted and unavailable menus', async () => {
    await repo.listAvailableMenus({ category: 'minuman' });
    const { sql, params } = lastQuery();

    expect(sql).not.toContain('cost_price');
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('is_available');
    expect(params).toEqual(['minuman']);
  });

  it('pass null when no category filter is given', async () => {
    await repo.listAvailableMenus();

    expect(lastQuery().params).toEqual([null]);
  });

  it('detail by slug hides cost_price and deleted menus', async () => {
    await repo.findPublicMenuBySlug('dimsum-mentai');
    const { sql, params } = lastQuery();

    expect(sql).not.toContain('cost_price');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual(['dimsum-mentai']);
  });
});

describe('updateMenu', () => {
  it('sets only allowed columns as parameters', async () => {
    await repo.updateMenu('id-1', { price: 30000, is_available: false });
    const { sql, params } = lastQuery();

    expect(sql).toMatch(/SET price = \$2, is_available = \$3, updated_at = now\(\)/);
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual(['id-1', 30000, false]);
  });

  it('drops unknown keys so they can never reach the SQL text', async () => {
    await repo.updateMenu('id-1', { price: 30000, 'slug = null; --': 'x', deleted_at: null });
    const { sql, params } = lastQuery();

    expect(sql).not.toContain('slug =');
    expect(sql).not.toContain('deleted_at =');
    expect(params).toEqual(['id-1', 30000]);
  });

  it('returns null when no row matches', async () => {
    expect(await repo.updateMenu('id-1', { price: 30000 })).toBeNull();
  });
});

describe('softDeleteMenu', () => {
  it('sets deleted_at only on rows not yet deleted', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [], rowCount: 1 });

    expect(await repo.softDeleteMenu('id-1')).toBe(true);
    const { sql } = lastQuery();
    expect(sql).toMatch(/SET deleted_at = now\(\)/);
    expect(sql).toContain('deleted_at IS NULL');
  });
});
