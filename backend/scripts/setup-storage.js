// Usage: npm run storage:setup
// Creates (or updates) the public Supabase Storage bucket for menu photos. Idempotent.
// Needs SUPABASE_URL and SUPABASE_SERVICE_KEY; does not touch the database.
import { createClient } from '@supabase/supabase-js';
import { loadOrExit, loadStorageEnv } from '../src/config/loadEnv.js';
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from '../src/utils/imageType.js';

// Same rules as POST /api/admin/uploads, enforced again by Supabase in case a key leaks.
const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: MAX_IMAGE_BYTES,
  allowedMimeTypes: IMAGE_MIME_TYPES,
};

const storage = loadOrExit(loadStorageEnv);
const client = createClient(storage.url, storage.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  console.log(`Supabase: ${new URL(storage.url).hostname}, bucket: ${storage.bucket}`);
  const { data: existing } = await client.storage.getBucket(storage.bucket);
  const { error } = existing
    ? await client.storage.updateBucket(storage.bucket, BUCKET_OPTIONS)
    : await client.storage.createBucket(storage.bucket, BUCKET_OPTIONS);
  if (error) throw error;
  console.log(`Bucket ${storage.bucket} ${existing ? 'diperbarui' : 'dibuat'}: publik, maks ${MAX_IMAGE_BYTES} byte, JPG/PNG/WEBP.`);
} catch (err) {
  // Message only: the error object can carry request headers with the service key.
  console.error(`Gagal menyiapkan bucket: ${err.message}`);
  process.exitCode = 1;
}
