// Usage: npm run seed:menus
// Inserts sample menus for development. Idempotent: a slug that already exists is left unchanged.
import { pool } from '../src/db/pool.js';
import { dbEnv } from '../src/config/dbEnv.js';
import { runCli } from './lib/runCli.js';

const SAMPLE_LABEL = '[Data contoh]';

// Sample data only: names and prices are placeholders until the owner sends the real menu.
const SAMPLE_MENUS = [
  {
    slug: 'dimsum-mentai',
    name: 'Dimsum Mentai',
    category: 'makanan',
    price: 25000,
    costPrice: 13000,
    description: 'Dimsum ayam isi 4 dengan saus mentai creamy yang dibakar sampai sedikit gosong.',
  },
  {
    slug: 'rice-bowl-ayam-sambal-matah',
    name: 'Rice Bowl Ayam Sambal Matah',
    category: 'makanan',
    price: 28000,
    costPrice: 15000,
    description: 'Nasi hangat, ayam crispy, dan sambal matah segar dengan aroma serai dan jeruk limau.',
  },
  {
    slug: 'seblak-ceker-pedas',
    name: 'Seblak Ceker Pedas',
    category: 'makanan',
    price: 22000,
    costPrice: 11000,
    description: 'Kerupuk basah, ceker empuk, dan kencur dalam kuah pedas. Level pedas bisa dipilih.',
  },
  {
    slug: 'croffle-cokelat-almond',
    name: 'Croffle Cokelat Almond',
    category: 'snack',
    price: 20000,
    costPrice: 9000,
    description: 'Croissant yang dipanggang di cetakan waffle, disiram cokelat leleh dan taburan almond.',
  },
  {
    slug: 'cireng-rujak',
    name: 'Cireng Rujak',
    category: 'snack',
    price: 15000,
    costPrice: 6000,
    description: 'Cireng renyah di luar, kenyal di dalam, dengan cocolan bumbu rujak manis pedas.',
  },
  {
    slug: 'es-kopi-susu-gula-aren',
    name: 'Es Kopi Susu Gula Aren',
    category: 'minuman',
    price: 18000,
    costPrice: 7000,
    description: 'Espresso, susu segar, dan gula aren asli. Manisnya pas untuk teman nongkrong.',
  },
  {
    slug: 'matcha-latte',
    name: 'Matcha Latte',
    category: 'minuman',
    price: 22000,
    costPrice: 9000,
    description: 'Matcha Jepang dikocok dengan susu, bisa dingin atau panas.',
  },
  {
    slug: 'es-thai-tea',
    name: 'Es Thai Tea',
    category: 'minuman',
    price: 15000,
    costPrice: 5000,
    description: 'Teh Thailand pekat dengan susu kental manis dan es batu.',
  },
];

await runCli(async () => {
  if (dbEnv.NODE_ENV === 'production') {
    throw new Error('seed:menus hanya untuk pengembangan. Jangan isi data contoh ke database produksi.');
  }

  let inserted = 0;
  for (const menu of SAMPLE_MENUS) {
    const { rowCount } = await pool.query(
      `INSERT INTO menus (slug, name, category, price, cost_price, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO NOTHING`,
      [
        menu.slug,
        menu.name,
        menu.category,
        menu.price,
        menu.costPrice,
        `${SAMPLE_LABEL} ${menu.description}`,
      ],
    );
    inserted += rowCount;
  }

  console.log(`${inserted} menu contoh ditambahkan, ${SAMPLE_MENUS.length - inserted} sudah ada.`);
});
