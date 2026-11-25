import { loadDatabaseEnv, loadOrExit } from './loadEnv.js';

// NODE_ENV and DATABASE_URL only. Used by db/pool.js and scripts/ (migrate, seed).
export const dbEnv = loadOrExit(loadDatabaseEnv);
