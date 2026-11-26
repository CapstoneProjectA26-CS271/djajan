import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { ServiceUnavailableError } from '../utils/errors.js';

// File names are random, so a stored object never changes: browsers and CDN may cache it for a year.
const CACHE_SECONDS = String(365 * 24 * 60 * 60);

let client;

// Created on first use so the server starts (and tests run) without Supabase keys.
function storageBucket() {
  if (!env.STORAGE) {
    throw new ServiceUnavailableError('Penyimpanan foto belum dikonfigurasi di server');
  }
  client ??= createClient(env.STORAGE.url, env.STORAGE.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.storage.from(env.STORAGE.bucket);
}

/**
 * Uploads a validated image and returns its public URL. The object name is random, never derived
 * from the client's filename. Photos uploaded for a menu that is never saved stay in the bucket.
 */
export async function uploadMenuImage({ buffer, mime, ext }) {
  const bucket = storageBucket();
  const path = `menus/${randomUUID()}.${ext}`;

  const { error } = await bucket.upload(path, buffer, {
    contentType: mime,
    cacheControl: CACHE_SECONDS,
    upsert: false,
  });
  if (error) {
    throw new ServiceUnavailableError('Gagal menyimpan foto. Coba lagi beberapa saat.', { cause: error });
  }

  return bucket.getPublicUrl(path).data.publicUrl;
}
