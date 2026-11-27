import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

vi.mock('../src/repositories/adminRepository.js', () => ({
  findAdminByEmail: vi.fn(),
  findAdminById: vi.fn(),
  findAdminPasswordHash: vi.fn(),
  recordFailedLogin: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  updateAdminPassword: vi.fn(),
}));

// The limiters have their own tests (loginLimiter.test.js); here they would block after 5 failures.
vi.mock('../src/middleware/rateLimit.js', () => ({
  loginLimiter: (req, res, next) => next(),
  passwordChangeLimiter: (req, res, next) => next(),
  uploadLimiter: (req, res, next) => next(),
}));

const { app } = await import('../src/app.js');
const repo = await import('../src/repositories/adminRepository.js');
const { signAccessToken, MAX_FAILED_ATTEMPTS, LOCK_MINUTES } = await import('../src/services/authService.js');

const ADMIN_ID = '7d0f3c1e-1b2a-4c3d-8e9f-0a1b2c3d4e5f';
const PASSWORD = 'password-yang-benar';
let admin;

beforeAll(async () => {
  admin = {
    id: ADMIN_ID,
    email: 'owner@djajan.id',
    password_hash: await bcrypt.hash(PASSWORD, 4),
    is_locked: false,
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

function login(body) {
  return request(app).post('/api/auth/login').send(body);
}

describe('POST /api/auth/login', () => {
  it('returns a JWT valid for 8 hours on correct credentials', async () => {
    vi.mocked(repo.findAdminByEmail).mockResolvedValue(admin);

    const res = await login({ email: 'owner@djajan.id', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
    expect(payload.sub).toBe(ADMIN_ID);
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
    expect(repo.recordSuccessfulLogin).toHaveBeenCalledWith(ADMIN_ID);
  });

  it('normalizes the email before lookup', async () => {
    vi.mocked(repo.findAdminByEmail).mockResolvedValue(admin);

    await login({ email: '  Owner@Djajan.ID ', password: PASSWORD });

    expect(repo.findAdminByEmail).toHaveBeenCalledWith('owner@djajan.id');
  });

  it.each([
    [{}],
    [{ email: 'owner@djajan.id' }],
    [{ password: PASSWORD }],
    [{ email: 123, password: PASSWORD }],
  ])('returns 400 when email or password is missing: %j', async (body) => {
    const res = await login(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Email dan password wajib diisi' });
  });

  it('returns 401 with the same message for an unknown email', async () => {
    vi.mocked(repo.findAdminByEmail).mockResolvedValue(null);

    const res = await login({ email: 'bukan@djajan.id', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Email atau password salah' });
    expect(repo.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('returns 401 and counts the failure for a wrong password', async () => {
    vi.mocked(repo.findAdminByEmail).mockResolvedValue(admin);
    vi.mocked(repo.recordFailedLogin).mockResolvedValue(false);

    const res = await login({ email: 'owner@djajan.id', password: 'salah' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Email atau password salah' });
    expect(repo.recordFailedLogin).toHaveBeenCalledWith(ADMIN_ID, {
      maxAttempts: MAX_FAILED_ATTEMPTS,
      lockMinutes: LOCK_MINUTES,
    });
    expect(repo.recordSuccessfulLogin).not.toHaveBeenCalled();
  });

  it('returns 429 when the failed attempt locks the account', async () => {
    vi.mocked(repo.findAdminByEmail).mockResolvedValue(admin);
    vi.mocked(repo.recordFailedLogin).mockResolvedValue(true);

    const res = await login({ email: 'owner@djajan.id', password: 'salah' });

    expect(res.status).toBe(429);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/15 menit/);
  });

  it('returns 429 for a locked account even with the correct password', async () => {
    vi.mocked(repo.findAdminByEmail).mockResolvedValue({ ...admin, is_locked: true });

    const res = await login({ email: 'owner@djajan.id', password: PASSWORD });

    expect(res.status).toBe(429);
    expect(repo.recordSuccessfulLogin).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'fail', message: 'Silakan login terlebih dahulu' });
  });

  it('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ email: 'x' }, 'another-secret-another-secret-another', { subject: ADMIN_ID });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Sesi tidak valid, silakan login kembali');
  });

  it('rejects an unsigned token (alg none)', async () => {
    const unsigned = jwt.sign({ email: 'x' }, null, { subject: ADMIN_ID, algorithm: 'none' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${unsigned}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 with a session-ended message for an expired token', async () => {
    const expired = jwt.sign({ email: 'x', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET, {
      subject: ADMIN_ID,
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Sesi sudah berakhir, silakan login kembali');
  });

  it('returns the logged-in admin without the password hash', async () => {
    vi.mocked(repo.findAdminById).mockResolvedValue({
      id: ADMIN_ID,
      email: 'owner@djajan.id',
      created_at: '2026-11-20T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signAccessToken(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.admin).toEqual({
      id: ADMIN_ID,
      email: 'owner@djajan.id',
      created_at: '2026-11-20T00:00:00.000Z',
    });
    expect(repo.findAdminById).toHaveBeenCalledWith(ADMIN_ID);
  });

  it('returns 401 when the admin behind a valid token no longer exists', async () => {
    vi.mocked(repo.findAdminById).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signAccessToken(admin)}`);

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/password', () => {
  const NEW_PASSWORD = 'password-baru-yang-panjang';

  function changePassword(body, token = signAccessToken(admin)) {
    const req = request(app).patch('/api/auth/password');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  }

  it('returns 401 without a token', async () => {
    const res = await changePassword({ current_password: PASSWORD, new_password: NEW_PASSWORD }, null);

    expect(res.status).toBe(401);
    expect(repo.updateAdminPassword).not.toHaveBeenCalled();
  });

  it('stores a bcrypt hash of the new password and returns no sensitive data', async () => {
    vi.mocked(repo.findAdminPasswordHash).mockResolvedValue(admin.password_hash);
    vi.mocked(repo.updateAdminPassword).mockResolvedValue(true);

    const res = await changePassword({ current_password: PASSWORD, new_password: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'success', message: 'Password berhasil diubah' });
    const [id, newHash] = vi.mocked(repo.updateAdminPassword).mock.calls[0];
    expect(id).toBe(ADMIN_ID);
    expect(newHash).not.toBe(NEW_PASSWORD);
    expect(newHash).toMatch(/^\$2b\$12\$/);
    expect(await bcrypt.compare(NEW_PASSWORD, newHash)).toBe(true);
  });

  it('returns 400, not 401, for a wrong current password', async () => {
    vi.mocked(repo.findAdminPasswordHash).mockResolvedValue(admin.password_hash);

    const res = await changePassword({ current_password: 'salah', new_password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Password lama salah' });
    expect(repo.updateAdminPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['current password missing', { new_password: NEW_PASSWORD }, 'Password lama wajib diisi'],
    ['new password missing', { current_password: PASSWORD }, /Password minimal 12 karakter/],
    ['new password too short', { current_password: PASSWORD, new_password: 'pendek' }, /minimal 12/],
    ['new password over 72 bytes', { current_password: PASSWORD, new_password: 'a'.repeat(73) }, /maksimal 72/],
    [
      'new password same as current',
      { current_password: PASSWORD, new_password: PASSWORD },
      'Password baru harus berbeda dari password lama',
    ],
  ])('returns 400 when %s', async (_case, body, message) => {
    const res = await changePassword(body);

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(message);
    expect(repo.findAdminPasswordHash).not.toHaveBeenCalled();
    expect(repo.updateAdminPassword).not.toHaveBeenCalled();
  });

  it('returns 401 when the admin behind the token no longer exists', async () => {
    vi.mocked(repo.findAdminPasswordHash).mockResolvedValue(null);

    const res = await changePassword({ current_password: PASSWORD, new_password: NEW_PASSWORD });

    expect(res.status).toBe(401);
  });
});

describe('/api/admin guard', () => {
  it('returns 401 instead of 404 for unknown admin paths without a token', async () => {
    const res = await request(app).get('/api/admin/tidak-ada');

    expect(res.status).toBe(401);
  });
});
