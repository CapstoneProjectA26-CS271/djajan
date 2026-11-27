import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted above imports, so everything they use must be hoisted too.
// clientCalls is a plain array, not vi.fn() call history, because Vitest clears that between tests
// while the cached client lives for the whole file.
const { bucket, clientCalls, createClient, env, storageEnv } = vi.hoisted(() => {
  const bucket = { upload: vi.fn(), getPublicUrl: vi.fn() };
  const storageEnv = { url: 'https://ref.supabase.co', serviceKey: 'sb_secret_test', bucket: 'menu-images' };
  const clientCalls = [];
  return {
    bucket,
    clientCalls,
    createClient: (...args) => {
      clientCalls.push(args);
      return { storage: { from: () => bucket } };
    },
    env: { STORAGE: storageEnv },
    storageEnv,
  };
});
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('../src/config/env.js', () => ({ env }));

const { uploadMenuImage } = await import('../src/services/storageService.js');
const { ServiceUnavailableError } = await import('../src/utils/errors.js');

const image = { buffer: Buffer.from('png-bytes'), mime: 'image/png', ext: 'png' };

beforeEach(() => {
  env.STORAGE = storageEnv;
  bucket.upload.mockReset().mockResolvedValue({ data: {}, error: null });
  bucket.getPublicUrl.mockReset().mockImplementation((path) => ({
    data: { publicUrl: `https://ref.supabase.co/storage/v1/object/public/menu-images/${path}` },
  }));
});

describe('uploadMenuImage', () => {
  it('stores the file under a random name in menus/ without overwriting', async () => {
    const url = await uploadMenuImage(image);

    const [path, body, options] = bucket.upload.mock.calls[0];
    expect(path).toMatch(/^menus\/[0-9a-f-]{36}\.png$/);
    expect(body).toBe(image.buffer);
    expect(options).toEqual({ contentType: 'image/png', cacheControl: '31536000', upsert: false });
    expect(url).toBe(`https://ref.supabase.co/storage/v1/object/public/menu-images/${path}`);
  });

  it('uses a different name for every upload', async () => {
    await uploadMenuImage(image);
    await uploadMenuImage(image);

    const [first, second] = bucket.upload.mock.calls.map(([path]) => path);
    expect(first).not.toBe(second);
  });

  it('creates the Supabase client once with the service key', async () => {
    await uploadMenuImage(image);
    await uploadMenuImage(image);

    // Once for the whole file: the client is cached after the first upload in an earlier test.
    expect(clientCalls).toHaveLength(1);
    expect(clientCalls[0].slice(0, 2)).toEqual(['https://ref.supabase.co', 'sb_secret_test']);
  });

  it('wraps a Supabase error in a 503 without leaking it', async () => {
    const cause = { message: 'new row violates row-level security policy' };
    bucket.upload.mockResolvedValue({ data: null, error: cause });

    const err = await uploadMenuImage(image).catch((e) => e);

    expect(err).toBeInstanceOf(ServiceUnavailableError);
    expect(err.message).toBe('Gagal menyimpan foto. Coba lagi beberapa saat.');
    expect(err.cause).toBe(cause);
  });

  it('answers 503 when storage is not configured', async () => {
    env.STORAGE = null;

    await expect(uploadMenuImage(image)).rejects.toThrow('Penyimpanan foto belum dikonfigurasi di server');
    expect(bucket.upload).not.toHaveBeenCalled();
  });
});
