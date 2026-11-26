import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const NODE_ENVS = ['development', 'test', 'production'];
// HS256 key: 32 bytes is the floor; shorter secrets can be brute-forced from one leaked token.
const MIN_JWT_SECRET_LENGTH = 32;

// Each check pushes its problems into `errors` so one run reports every missing variable.
function readDatabaseVars(source, errors) {
  const nodeEnv = source.NODE_ENV || 'development';
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV harus salah satu dari: ${NODE_ENVS.join(', ')}`);
  }

  const databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL wajib diisi');
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL harus diawali postgres:// atau postgresql://');
  }

  return { NODE_ENV: nodeEnv, DATABASE_URL: databaseUrl };
}

function readServerVars(source, errors) {
  const port = source.PORT ? Number(source.PORT) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT harus bilangan bulat 1–65535');
  }

  let frontendUrl;
  if (!source.FRONTEND_URL) {
    errors.push('FRONTEND_URL wajib diisi');
  } else {
    try {
      // CORS compares against the bare origin, so drop any path or trailing slash.
      frontendUrl = new URL(source.FRONTEND_URL).origin;
    } catch {
      errors.push('FRONTEND_URL harus berupa URL yang valid, contoh http://localhost:5173');
    }
  }

  const jwtSecret = source.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET wajib diisi');
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET minimal ${MIN_JWT_SECRET_LENGTH} karakter`);
  }

  return { PORT: port, FRONTEND_URL: frontendUrl, JWT_SECRET: jwtSecret };
}

const DEFAULT_STORAGE_BUCKET = 'menu-images';

/**
 * Supabase Storage for menu photos. Returns null when not configured, which only development and
 * test allow: there the upload endpoint answers 503 so FS-2/AI/DS can run the backend without keys.
 */
function readStorageVars(source, errors, { required }) {
  const url = source.SUPABASE_URL?.trim();
  const serviceKey = source.SUPABASE_SERVICE_KEY?.trim();
  const bucket = source.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;

  if (!url && !serviceKey && !required) {
    return null;
  }
  if (!url) {
    errors.push('SUPABASE_URL wajib diisi (contoh https://<project-ref>.supabase.co)');
  } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    errors.push('SUPABASE_URL harus berbentuk https://<project-ref>.supabase.co');
  }
  if (!serviceKey) {
    errors.push('SUPABASE_SERVICE_KEY wajib diisi (secret key dari Supabase → Project Settings → API Keys)');
  }
  if (!/^[a-z0-9-]{3,63}$/.test(bucket)) {
    errors.push('SUPABASE_STORAGE_BUCKET hanya boleh huruf kecil, angka, dan tanda minus');
  }
  return { url: url?.replace(/\/$/, ''), serviceKey, bucket };
}

function throwIfInvalid(errors) {
  if (errors.length > 0) {
    throw new Error(
      `Konfigurasi environment tidak valid:\n- ${errors.join('\n- ')}\n` +
        'Salin backend/.env.example menjadi backend/.env lalu lengkapi nilainya.',
    );
  }
}

/** What the DB scripts (migrate, seed) need: no server-only secrets. */
export function loadDatabaseEnv(source) {
  const errors = [];
  const vars = readDatabaseVars(source, errors);
  throwIfInvalid(errors);
  return Object.freeze(vars);
}

/** Everything the HTTP server needs, database included. Storage is mandatory only in production. */
export function loadServerEnv(source) {
  const errors = [];
  const vars = { ...readDatabaseVars(source, errors), ...readServerVars(source, errors) };
  const storage = readStorageVars(source, errors, { required: vars.NODE_ENV === 'production' });
  throwIfInvalid(errors);
  return Object.freeze({ ...vars, STORAGE: storage && Object.freeze(storage) });
}

/** For scripts/setup-storage.js: storage settings only, always required. */
export function loadStorageEnv(source) {
  const errors = [];
  const storage = readStorageVars(source, errors, { required: true });
  throwIfInvalid(errors);
  return Object.freeze(storage);
}

/** Fails fast at boot: prints the problems without a stack trace and exits. */
export function loadOrExit(loader, source = process.env) {
  try {
    return loader(source);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
