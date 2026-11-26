import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadDatabaseEnv, loadServerEnv, loadStorageEnv } from '../src/config/loadEnv.js';

const databaseVars = {
  DATABASE_URL: 'postgresql://djajan:djajan@localhost:5433/djajan',
};
const serverVars = {
  ...databaseVars,
  FRONTEND_URL: 'http://localhost:5173',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadServerEnv', () => {
  it('applies defaults for NODE_ENV and PORT', () => {
    const env = loadServerEnv(serverVars);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(databaseVars.DATABASE_URL);
  });

  it('normalizes FRONTEND_URL to its origin', () => {
    const env = loadServerEnv({ ...serverVars, FRONTEND_URL: 'https://djajan.vercel.app/' });

    expect(env.FRONTEND_URL).toBe('https://djajan.vercel.app');
  });

  it('lists every missing required variable in one error', () => {
    expect(() => loadServerEnv({})).toThrow(
      /DATABASE_URL wajib diisi[\s\S]*FRONTEND_URL wajib diisi[\s\S]*JWT_SECRET wajib diisi/,
    );
  });

  it('rejects an invalid PORT', () => {
    expect(() => loadServerEnv({ ...serverVars, PORT: 'abc' })).toThrow(/PORT harus bilangan bulat/);
  });

  it('rejects an invalid FRONTEND_URL', () => {
    expect(() => loadServerEnv({ ...serverVars, FRONTEND_URL: 'localhost' })).toThrow(
      /FRONTEND_URL harus berupa URL/,
    );
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => loadServerEnv({ ...serverVars, JWT_SECRET: 'x'.repeat(31) })).toThrow(
      /JWT_SECRET minimal 32 karakter/,
    );
  });
});

describe('storage settings', () => {
  const storageVars = {
    SUPABASE_URL: 'https://abcdefgh.supabase.co/',
    SUPABASE_SERVICE_KEY: 'sb_secret_x',
  };

  it('are optional outside production (upload then answers 503)', () => {
    expect(loadServerEnv(serverVars).STORAGE).toBeNull();
  });

  it('are required in production', () => {
    expect(() => loadServerEnv({ ...serverVars, NODE_ENV: 'production' })).toThrow(
      /SUPABASE_URL wajib diisi[\s\S]*SUPABASE_SERVICE_KEY wajib diisi/,
    );
  });

  it('default the bucket and drop the trailing slash', () => {
    expect(loadServerEnv({ ...serverVars, ...storageVars }).STORAGE).toEqual({
      url: 'https://abcdefgh.supabase.co',
      serviceKey: 'sb_secret_x',
      bucket: 'menu-images',
    });
  });

  it('reject half a configuration', () => {
    expect(() => loadServerEnv({ ...serverVars, SUPABASE_URL: storageVars.SUPABASE_URL })).toThrow(
      /SUPABASE_SERVICE_KEY wajib diisi/,
    );
  });

  it.each([
    ['a non-Supabase URL', { SUPABASE_URL: 'https://evil.example' }, /SUPABASE_URL harus berbentuk/],
    ['an http URL', { SUPABASE_URL: 'http://abcdefgh.supabase.co' }, /SUPABASE_URL harus berbentuk/],
    ['an invalid bucket name', { SUPABASE_STORAGE_BUCKET: 'Menu Images' }, /SUPABASE_STORAGE_BUCKET/],
  ])('reject %s', (_case, override, message) => {
    expect(() => loadStorageEnv({ ...storageVars, ...override })).toThrow(message);
  });

  it('loadStorageEnv needs no database or server variables', () => {
    expect(loadStorageEnv(storageVars).bucket).toBe('menu-images');
  });
});

describe('loadDatabaseEnv', () => {
  it('needs only DATABASE_URL: no JWT_SECRET, FRONTEND_URL, or PORT', () => {
    expect(loadDatabaseEnv(databaseVars)).toEqual({
      NODE_ENV: 'development',
      DATABASE_URL: databaseVars.DATABASE_URL,
    });
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadDatabaseEnv({})).toThrow(/DATABASE_URL wajib diisi/);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => loadDatabaseEnv({ DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL harus diawali/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadDatabaseEnv({ ...databaseVars, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV harus salah satu/,
    );
  });
});

// Real module imports in a child process, with server-only vars set empty so backend/.env cannot fill them.
describe('module boundaries', () => {
  const backendDir = fileURLToPath(new URL('..', import.meta.url));

  function importIn(child, modules) {
    const code = modules.map((m) => `await import('${m}');`).join(' ');
    return spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: backendDir,
      env: { ...process.env, ...child },
      encoding: 'utf8',
    });
  }

  const withoutServerVars = { ...databaseVars, NODE_ENV: 'test', JWT_SECRET: '', FRONTEND_URL: '' };

  it('DB script dependencies load without JWT_SECRET or FRONTEND_URL', () => {
    const result = importIn(withoutServerVars, ['./src/db/pool.js', './scripts/lib/runCli.js']);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('the server config still fails fast without them', () => {
    const result = importIn(withoutServerVars, ['./src/config/env.js']);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/FRONTEND_URL wajib diisi/);
    expect(result.stderr).toMatch(/JWT_SECRET wajib diisi/);
  });
});
