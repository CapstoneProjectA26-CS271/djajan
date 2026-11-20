import { describe, it, expect } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const valid = {
  DATABASE_URL: 'postgresql://djajan:djajan@localhost:5433/djajan',
  FRONTEND_URL: 'http://localhost:5173',
};

describe('loadEnv', () => {
  it('applies defaults for NODE_ENV and PORT', () => {
    const env = loadEnv(valid);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
  });

  it('normalizes FRONTEND_URL to its origin', () => {
    const env = loadEnv({ ...valid, FRONTEND_URL: 'https://djajan.vercel.app/' });

    expect(env.FRONTEND_URL).toBe('https://djajan.vercel.app');
  });

  it('lists every missing required variable in one error', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL wajib diisi[\s\S]*FRONTEND_URL wajib diisi/);
  });

  it('rejects an invalid PORT', () => {
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT harus bilangan bulat/);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL harus diawali/);
  });

  it('rejects an invalid FRONTEND_URL', () => {
    expect(() => loadEnv({ ...valid, FRONTEND_URL: 'localhost' })).toThrow(/FRONTEND_URL harus berupa URL/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV harus salah satu/);
  });
});
