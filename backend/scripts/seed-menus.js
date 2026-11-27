// Usage: npm run seed:menus
// Inserts the official DJAJAN menus into a development database. Idempotent: an existing slug is left unchanged.
import { pool } from '../src/db/pool.js';
import { dbEnv } from '../src/config/dbEnv.js';
import { runCli } from './lib/runCli.js';

// Data menu resmi dari owner DJAJAN (Nov 2026). Menu lain masih dalam pengembangan owner; tambahkan di sini
// atau lewat panel admin saat sudah siap. cost_price belum diberikan owner, jadi dibiarkan null.
const MENUS = [
  {
    slug: 'classic-mac',
    name: 'Classic Mac',
    category: 'mac & cheese',
    price: 15000,
    description:
      'Mac & cheese dengan saus keju creamy dan macaroni, cocok untuk pencinta keju yang ingin menikmati menu simpel dan nikmat.',
  },
  {
    slug: 'royale-mac',
    name: 'Royale Mac',
    category: 'mac & cheese',
    price: 15000,
    description: 'Mac & cheese creamy dengan tambahan chicken, memberikan rasa gurih dan lebih mengenyangkan.',
  },
  {
    slug: 'signature-mac',
    name: 'Signature Mac',
    category: 'mac & cheese',
    price: 25000,
    description:
      'Mac & cheese ukuran medium dengan chicken dan saus keju yang creamy, cocok untuk menu makan yang lebih puas.',
  },
  {
    slug: 'deluxe-mac',
    name: 'Deluxe Mac',
    category: 'mac & cheese',
    price: 30000,
    description: 'Mac & cheese dengan chicken dan lettuce, perpaduan creamy, gurih, dan segar dalam satu sajian.',
  },
];

await runCli(async () => {
  // Production menus are entered by the owner in the admin panel, so photos and availability stay theirs.
  if (dbEnv.NODE_ENV === 'production') {
    throw new Error('seed:menus hanya untuk database pengembangan. Menu produksi diisi owner lewat panel admin.');
  }

  let inserted = 0;
  for (const menu of MENUS) {
    const { rowCount } = await pool.query(
      `INSERT INTO menus (slug, name, category, price, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO NOTHING`,
      [menu.slug, menu.name, menu.category, menu.price, menu.description],
    );
    inserted += rowCount;
  }

  console.log(`${inserted} menu ditambahkan, ${MENUS.length - inserted} sudah ada.`);
});
