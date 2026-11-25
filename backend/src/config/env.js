import { loadOrExit, loadServerEnv } from './loadEnv.js';

// Server config (app, routes, services). DB scripts import ./dbEnv.js instead so they do not need
// JWT_SECRET or FRONTEND_URL.
export const env = loadOrExit(loadServerEnv);
