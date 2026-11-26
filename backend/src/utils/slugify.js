const MAX_SLUG_LENGTH = 80;

/** "Es Kopi Susu (Gula Aren)!" -> "es-kopi-susu-gula-aren". Falls back to "menu" when nothing is left. */
export function slugify(text) {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');
  return slug || 'menu';
}
