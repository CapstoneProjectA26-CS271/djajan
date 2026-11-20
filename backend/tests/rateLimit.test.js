import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from '../src/middleware/rateLimit.js';

describe('createRateLimiter', () => {
  it('returns 429 in fail format once the limit is exceeded', async () => {
    const app = express();
    app.get(
      '/limited',
      createRateLimiter({ windowMs: 60 * 1000, limit: 2, message: 'Terlalu banyak permintaan' }),
      (req, res) => res.json({ status: 'success' }),
    );

    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);
    const res = await request(app).get('/limited');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ status: 'fail', message: 'Terlalu banyak permintaan' });
    expect(res.headers['retry-after']).toBeDefined();
  });
});
