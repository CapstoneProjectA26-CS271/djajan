import { pool } from '../db/pool.js';

export async function pingDatabase() {
  await pool.query('select 1');
}
