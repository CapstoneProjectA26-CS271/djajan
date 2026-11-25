import { ClientError } from '../utils/errors.js';

// int4 allows ~2.1 billion; this cap only rejects obvious typos (an extra zero or three).
const MAX_PRICE = 10_000_000;
const MAX_CATEGORY_LENGTH = 50;
const MAX_IMAGE_URL_LENGTH = 2048;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  throw new ClientError(message, 400);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Optional text: empty or whitespace-only becomes null.
function optionalText(value, maxLength, message) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') fail(message);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) fail(message);
  return trimmed || null;
}

function isHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

const FIELD_RULES = {
  name(value) {
    const name = typeof value === 'string' ? value.trim() : '';
    if (name.length < 1 || name.length > 100) fail('Nama menu wajib diisi, 1–100 karakter');
    return name;
  },
  category(value) {
    const category = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (category.length < 1 || category.length > MAX_CATEGORY_LENGTH) {
      fail(`Kategori wajib diisi, 1–${MAX_CATEGORY_LENGTH} karakter`);
    }
    return category;
  },
  price(value) {
    if (!Number.isInteger(value) || value <= 0 || value > MAX_PRICE) {
      fail('Harga harus bilangan bulat rupiah lebih dari 0, contoh 25000');
    }
    return value;
  },
  cost_price(value) {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < 0 || value > MAX_PRICE) {
      fail('Harga modal harus bilangan bulat rupiah, minimal 0');
    }
    return value;
  },
  description(value) {
    return optionalText(value, 500, 'Deskripsi maksimal 500 karakter');
  },
  image_url(value) {
    const url = optionalText(value, MAX_IMAGE_URL_LENGTH, 'URL foto tidak valid');
    if (url !== null && !isHttpUrl(url)) fail('URL foto harus diawali http:// atau https://');
    return url;
  },
  // Only reached with undefined on create, where a new menu defaults to available.
  is_available(value = true) {
    if (typeof value !== 'boolean') fail('Status tersedia harus true atau false');
    return value;
  },
};

/** POST body. Unknown fields (including `slug`) are ignored. */
export function validateCreateMenu(body) {
  if (!isPlainObject(body)) fail('Data menu wajib dikirim dalam format JSON');

  const menu = {};
  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    menu[field] = rule(body[field]);
  }
  return menu;
}

/**
 * PUT body: only the fields sent are changed. `null` clears an optional field;
 * name, category, price, and is_available reject null through their rules.
 */
export function validateUpdateMenu(body) {
  if (!isPlainObject(body)) fail('Data menu wajib dikirim dalam format JSON');

  const changes = {};
  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    if (body[field] !== undefined) changes[field] = rule(body[field]);
  }
  if (Object.keys(changes).length === 0) fail('Tidak ada data menu yang diubah');
  return changes;
}

/** ?category= filter. Returns null when absent. */
export function validateCategoryQuery(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.trim().length > MAX_CATEGORY_LENGTH) {
    fail('Filter kategori tidak valid');
  }
  return value.trim().toLowerCase() || null;
}

// Malformed ids and slugs can never match a row, so they get the same 404 as a missing menu.
export function assertMenuId(id) {
  if (!UUID_PATTERN.test(id)) throw new ClientError('Menu tidak ditemukan', 404);
}

export function assertMenuSlug(slug) {
  if (slug.length > 100 || !SLUG_PATTERN.test(slug)) throw new ClientError('Menu tidak ditemukan', 404);
}
