import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/repositories/healthRepository.js', () => ({
  pingDatabase: vi.fn(),
}));

const { app } = await import('../src/app.js');
const { pingDatabase } = await import('../src/repositories/healthRepository.js');

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('sets security headers from helmet', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /health/db', () => {
  beforeEach(() => {
    vi.mocked(pingDatabase).mockReset();
  });

  it('returns status ok when the database answers', async () => {
    vi.mocked(pingDatabase).mockResolvedValue();

    const res = await request(app).get('/health/db');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 in error format when the database is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(pingDatabase).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432'));

    const res = await request(app).get('/health/db');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', message: 'Database tidak dapat dihubungi' });
  });
});

describe('CORS', () => {
  it.each(['http://localhost:5173', 'https://djajan-test.vercel.app'])(
    'allows every origin listed in FRONTEND_URL: %s',
    async (origin) => {
      const res = await request(app).get('/health').set('Origin', origin);

      expect(res.headers['access-control-allow-origin']).toBe(origin);
    },
  );

  it('does not allow other origins', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
});

describe('error responses', () => {
  it('returns 404 in fail format for unknown routes', async () => {
    const res = await request(app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ status: 'fail', message: 'Endpoint tidak ditemukan' });
  });

  it('returns 400 in fail format for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/tidak-ada')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Format JSON tidak valid' });
  });

  it('returns 413 in fail format when the body exceeds the size limit', async () => {
    const res = await request(app)
      .post('/api/tidak-ada')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: 'a'.repeat(200 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ status: 'fail', message: 'Ukuran data terlalu besar' });
  });
});
