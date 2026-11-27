import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/storageService.js', () => ({
  uploadMenuImage: vi.fn(),
}));

const { app } = await import('../src/app.js');
const { uploadMenuImage } = await import('../src/services/storageService.js');
const { signAccessToken } = await import('../src/services/authService.js');
const { ServiceUnavailableError } = await import('../src/utils/errors.js');

const AUTH = `Bearer ${signAccessToken({ id: '7d0f3c1e-1b2a-4c3d-8e9f-0a1b2c3d4e5f', email: 'owner@djajan.id' })}`;
const PUBLIC_URL = 'https://ref.supabase.co/storage/v1/object/public/menu-images/menus/abc.png';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64)]);

function upload() {
  return request(app).post('/api/admin/uploads').set('Authorization', AUTH);
}

beforeEach(() => {
  vi.mocked(uploadMenuImage).mockReset().mockResolvedValue(PUBLIC_URL);
});

describe('POST /api/admin/uploads', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/admin/uploads').attach('image', PNG, 'menu.png');

    expect(res.status).toBe(401);
    expect(uploadMenuImage).not.toHaveBeenCalled();
  });

  it.each([
    ['PNG', PNG, { mime: 'image/png', ext: 'png' }],
    ['JPEG', JPEG, { mime: 'image/jpeg', ext: 'jpg' }],
    ['WEBP', WEBP, { mime: 'image/webp', ext: 'webp' }],
  ])('stores a %s and returns its public URL', async (_name, bytes, type) => {
    const res = await upload().attach('image', bytes, 'foto-menu');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'success', data: { url: PUBLIC_URL } });
    expect(uploadMenuImage).toHaveBeenCalledWith({ buffer: bytes, ...type });
  });

  it('trusts the file bytes, not the client filename or content type', async () => {
    const res = await upload().attach('image', PNG, { filename: 'menu.gif', contentType: 'image/gif' });

    expect(res.status).toBe(201);
    expect(uploadMenuImage).toHaveBeenCalledWith(expect.objectContaining({ mime: 'image/png', ext: 'png' }));
  });

  it('rejects a non-image renamed to .jpg', async () => {
    const res = await upload().attach('image', Buffer.from('<?php echo 1; ?>'.padEnd(64)), {
      filename: 'foto.jpg',
      contentType: 'image/jpeg',
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Format foto harus JPG, PNG, atau WEBP' });
    expect(uploadMenuImage).not.toHaveBeenCalled();
  });

  it('accepts a file of exactly 2 MiB', async () => {
    const exact = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 - PNG.length)]);

    const res = await upload().attach('image', exact, 'pas.png');

    expect(res.status).toBe(201);
  });

  it('returns 413 for a file over 2 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);

    const res = await upload().attach('image', big, 'besar.png');

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ status: 'fail', message: 'Ukuran foto maksimal 2 MB' });
    expect(uploadMenuImage).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is sent', async () => {
    const res = await upload().send({ image: 'bukan-file' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Foto wajib diunggah/);
  });

  it.each([
    ['a file under another field name', (req) => req.attach('photo', PNG, 'menu.png')],
    ['two files', (req) => req.attach('image', PNG, 'a.png').attach('image', PNG, 'b.png')],
    ['an extra text field', (req) => req.field('note', 'x').attach('image', PNG, 'menu.png')],
  ])('returns 400 for %s', async (_case, build) => {
    const res = await build(upload());

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Kirim satu foto di field "image"' });
    expect(uploadMenuImage).not.toHaveBeenCalled();
  });

  it('returns 503 in error format when storage is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(uploadMenuImage).mockRejectedValue(
      new ServiceUnavailableError('Penyimpanan foto belum dikonfigurasi di server'),
    );

    const res = await upload().attach('image', PNG, 'menu.png');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', message: 'Penyimpanan foto belum dikonfigurasi di server' });
  });
});
