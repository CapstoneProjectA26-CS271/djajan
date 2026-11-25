import {
  findMenuById,
  findPublicMenuBySlug,
  insertMenu,
  listAvailableMenus,
  listMenus,
  softDeleteMenu,
  updateMenu as updateMenuRow,
} from '../repositories/menuRepository.js';
import { ClientError } from '../utils/errors.js';
import { slugify } from '../utils/slugify.js';

// Covers "nama", "nama-2" ... "nama-20"; past that something is wrong, so fail instead of looping.
const MAX_SLUG_ATTEMPTS = 20;

function notFound() {
  return new ClientError('Menu tidak ditemukan', 404);
}

function isSlugTaken(err) {
  return err.code === '23505' && err.constraint === 'menus_slug_key';
}

export function getPublicMenus(category) {
  return listAvailableMenus({ category });
}

export async function getPublicMenuBySlug(slug) {
  const menu = await findPublicMenuBySlug(slug);
  if (!menu) throw notFound();
  return menu;
}

export function getAdminMenus() {
  return listMenus();
}

export async function getAdminMenu(id) {
  const menu = await findMenuById(id);
  if (!menu) throw notFound();
  return menu;
}

/**
 * The slug comes from the name and never changes afterwards: it is part of shared catalog links
 * and utm_campaign. A taken slug (deleted menus included) gets a numeric suffix.
 */
export async function createMenu(input) {
  const baseSlug = slugify(input.name);
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      return await insertMenu({ ...input, slug });
    } catch (err) {
      if (!isSlugTaken(err)) throw err;
    }
  }
  throw new ClientError('Nama menu ini sudah terlalu sering dipakai. Gunakan nama lain.', 409);
}

export async function updateMenu(id, changes) {
  const menu = await updateMenuRow(id, changes);
  if (!menu) throw notFound();
  return menu;
}

export async function deleteMenu(id) {
  const deleted = await softDeleteMenu(id);
  if (!deleted) throw notFound();
}
