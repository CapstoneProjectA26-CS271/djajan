import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

vi.mock('../src/repositories/adminRepository.js', () => ({
  findAdminByEmail: vi.fn().mockResolvedValue(null),
  findAdminById: vi.fn(),
  findAdminPasswordHash: vi.fn(),
  recordFailedLogin: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  updateAdminPassword: vi.fn(),
}));

const { app } = await import('../src/app.js');
const repo = await import('../src/repositories/adminRepository.js');
const { signAccessToken } = await import('../src/services/authService.js');

describe('POST /api/auth/login rate limit per IP', () => {
  it('returns 429 after 5 failed attempts, across different emails', async () => {
    for (let i = 1; i <= 5; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `tebak${i}@djajan.id`, password: 'salah' });
      expect(res.status).toBe(401);
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tebak6@djajan.id', password: 'salah' });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    });
  });
});

describe('PATCH /api/auth/password rate limit per admin', () => {
  const tokenA = signAccessToken({ id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'a@djajan.id' });
  const tokenB = signAccessToken({ id: 'bbbbbbbb-0000-4000-8000-000000000002', email: 'b@djajan.id' });

  beforeAll(async () => {
    vi.mocked(repo.findAdminPasswordHash).mockResolvedValue(await bcrypt.hash('password-yang-benar', 4));
  });

  function wrongAttempt(token) {
    return request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'tebakan-salah', new_password: 'password-baru-yang-panjang' });
  }

  it('returns 429 after 5 wrong current passwords for the same admin only', async () => {
    for (let i = 1; i <= 5; i += 1) {
      expect((await wrongAttempt(tokenA)).status).toBe(400);
    }

    const blocked = await wrongAttempt(tokenA);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      status: 'fail',
      message: 'Terlalu banyak percobaan ganti password. Coba lagi dalam 15 menit.',
    });

    // Same IP, different admin: not blocked.
    expect((await wrongAttempt(tokenB)).status).toBe(400);
  });
});
