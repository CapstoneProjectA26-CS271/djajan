import { describe, it, expect } from 'vitest';
import {
  validateCategoryQuery,
  validateCreateMenu,
  validateUpdateMenu,
} from '../src/validators/menuValidator.js';
import { slugify } from '../src/utils/slugify.js';

const valid = { name: 'Dimsum Mentai', category: 'makanan', price: 25000 };

describe('validateCreateMenu', () => {
  it('trims text and fills optional fields', () => {
    expect(
      validateCreateMenu({ ...valid, name: '  Dimsum Mentai  ', description: '   ', cost_price: 13000 }),
    ).toEqual({
      name: 'Dimsum Mentai',
      category: 'makanan',
      price: 25000,
      cost_price: 13000,
      description: null,
      image_url: null,
      is_available: true,
    });
  });

  it.each([
    ['body is not an object', null, 'Data menu wajib dikirim dalam format JSON'],
    ['body is an array', [valid], 'Data menu wajib dikirim dalam format JSON'],
    ['name missing', { ...valid, name: undefined }, 'Nama menu wajib diisi, 1–100 karakter'],
    ['name blank', { ...valid, name: '   ' }, 'Nama menu wajib diisi, 1–100 karakter'],
    ['name over 100', { ...valid, name: 'a'.repeat(101) }, 'Nama menu wajib diisi, 1–100 karakter'],
    ['category missing', { ...valid, category: '' }, 'Kategori wajib diisi, 1–50 karakter'],
    ['price as string', { ...valid, price: '25000' }, /Harga harus bilangan bulat/],
    ['price zero', { ...valid, price: 0 }, /Harga harus bilangan bulat/],
    ['price decimal', { ...valid, price: 25000.5 }, /Harga harus bilangan bulat/],
    ['price too large', { ...valid, price: 10_000_001 }, /Harga harus bilangan bulat/],
    ['negative cost price', { ...valid, cost_price: -1 }, /Harga modal/],
    ['description over 500', { ...valid, description: 'a'.repeat(501) }, 'Deskripsi maksimal 500 karakter'],
    ['javascript: image url', { ...valid, image_url: 'javascript:alert(1)' }, /URL foto harus diawali/],
    ['relative image url', { ...valid, image_url: '/foto.jpg' }, /URL foto harus diawali/],
    ['is_available as string', { ...valid, is_available: 'true' }, /Status tersedia/],
  ])('rejects %s', (_case, body, message) => {
    expect(() => validateCreateMenu(body)).toThrow(message);
  });

  it('accepts exactly 100 characters of name and 500 of description', () => {
    const menu = validateCreateMenu({ ...valid, name: 'a'.repeat(100), description: 'b'.repeat(500) });

    expect(menu.name).toHaveLength(100);
    expect(menu.description).toHaveLength(500);
  });
});

describe('validateUpdateMenu', () => {
  it('returns only the fields sent', () => {
    expect(validateUpdateMenu({ price: 30000, unknown: 'x' })).toEqual({ price: 30000 });
  });

  it('lets null clear optional fields', () => {
    expect(validateUpdateMenu({ description: null, image_url: null, cost_price: null })).toEqual({
      description: null,
      image_url: null,
      cost_price: null,
    });
  });

  it.each([['name'], ['category'], ['price'], ['is_available']])('rejects null for %s', (field) => {
    expect(() => validateUpdateMenu({ [field]: null })).toThrow();
  });

  it('rejects a body without known fields', () => {
    expect(() => validateUpdateMenu({ slug: 'baru' })).toThrow('Tidak ada data menu yang diubah');
  });
});

describe('validateCategoryQuery', () => {
  it('returns null when absent or blank', () => {
    expect(validateCategoryQuery(undefined)).toBeNull();
    expect(validateCategoryQuery('  ')).toBeNull();
  });

  it('rejects arrays and long values', () => {
    expect(() => validateCategoryQuery(['a', 'b'])).toThrow('Filter kategori tidak valid');
    expect(() => validateCategoryQuery('a'.repeat(51))).toThrow('Filter kategori tidak valid');
  });
});

describe('slugify', () => {
  it.each([
    ['Dimsum Mentai', 'dimsum-mentai'],
    ['Es Kopi Susu (Gula Aren)!', 'es-kopi-susu-gula-aren'],
    ['  Café Crème Brûlée  ', 'cafe-creme-brulee'],
    ['Rp25.000 Paket Hemat #1', 'rp25-000-paket-hemat-1'],
    ['🍜🍜', 'menu'],
  ])('%s -> %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('caps the slug at 80 characters without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(79)} b`);

    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});
