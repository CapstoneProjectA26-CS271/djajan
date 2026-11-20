import { describe, it, expect } from 'vitest';
import { sslConfigFor } from '../src/db/pool.js';

describe('sslConfigFor', () => {
  it.each([
    'postgresql://djajan:djajan@localhost:5433/djajan',
    'postgresql://djajan:djajan@127.0.0.1:5433/djajan',
    'postgresql://djajan:djajan@[::1]:5433/djajan',
  ])('disables TLS for local database %s', (url) => {
    expect(sslConfigFor(url)).toBe(false);
  });

  it('requires verified TLS with the Supabase CA for remote databases', () => {
    const ssl = sslConfigFor(
      'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
    );

    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toContain('-----BEGIN CERTIFICATE-----');
  });
});
