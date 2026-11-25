import { pool } from '../db/pool.js';

// cost_price is internal (promo calculator); it never goes to the public catalog.
const PUBLIC_COLUMNS = 'id, slug, name, category, price, description, image_url, is_available, updated_at';
const ADMIN_COLUMNS =
  'id, slug, name, category, price, cost_price, description, image_url, is_available, created_at, updated_at';

// Columns an admin may change. Also the only names ever interpolated into SQL by updateMenu.
export const UPDATABLE_COLUMNS = ['name', 'category', 'price', 'cost_price', 'description', 'image_url', 'is_available'];

export async function listAvailableMenus({ category = null } = {}) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM menus
     WHERE deleted_at IS NULL AND is_available AND ($1::text IS NULL OR category = $1)
     ORDER BY category, name`,
    [category],
  );
  return rows;
}

export async function findPublicMenuBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM menus WHERE slug = $1 AND deleted_at IS NULL`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function listMenus() {
  const { rows } = await pool.query(
    `SELECT ${ADMIN_COLUMNS} FROM menus WHERE deleted_at IS NULL ORDER BY category, name`,
  );
  return rows;
}

export async function findMenuById(id) {
  const { rows } = await pool.query(
    `SELECT ${ADMIN_COLUMNS} FROM menus WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}

/** Throws pg error 23505 on constraint `menus_slug_key` when the slug is taken. */
export async function insertMenu(menu) {
  const { rows } = await pool.query(
    `INSERT INTO menus (slug, name, category, price, cost_price, description, image_url, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${ADMIN_COLUMNS}`,
    [
      menu.slug,
      menu.name,
      menu.category,
      menu.price,
      menu.cost_price,
      menu.description,
      menu.image_url,
      menu.is_available,
    ],
  );
  return rows[0];
}

/** Updates only the given columns. Returns null when the menu does not exist or was deleted. */
export async function updateMenu(id, changes) {
  const columns = Object.keys(changes).filter((column) => UPDATABLE_COLUMNS.includes(column));
  if (columns.length === 0) {
    return findMenuById(id);
  }

  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);
  const { rows } = await pool.query(
    `UPDATE menus
     SET ${assignments.join(', ')}, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${ADMIN_COLUMNS}`,
    [id, ...columns.map((column) => changes[column])],
  );
  return rows[0] ?? null;
}

/** Soft delete keeps the row so past events and captions still point to it. */
export async function softDeleteMenu(id) {
  const { rowCount } = await pool.query(
    'UPDATE menus SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL',
    [id],
  );
  return rowCount > 0;
}
