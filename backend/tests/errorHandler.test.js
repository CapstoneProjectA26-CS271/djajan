import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { ClientError } from '../src/utils/errors.js';

function appThatThrows(error) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.get('/async-boom', async () => {
    throw error;
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('returns ClientError status and message in fail format', async () => {
    const app = appThatThrows(new ClientError('Harga harus lebih dari 0', 400));

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Harga harus lebih dari 0' });
  });

  it('hides internal details of unexpected errors behind a 500 error response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = appThatThrows(new Error('relation "menus" does not exist'));

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'Terjadi kesalahan pada server' });
    expect(JSON.stringify(res.body)).not.toContain('menus');
    expect(res.body.stack).toBeUndefined();
  });

  it('catches errors thrown from async handlers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = appThatThrows(new Error('boom'));

    const res = await request(app).get('/async-boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'Terjadi kesalahan pada server' });
  });

  it('maps other 4xx errors to a generic fail message', async () => {
    const err = Object.assign(new Error('Unsupported Media Type'), { status: 415 });
    const app = appThatThrows(err);

    const res = await request(app).get('/boom');

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ status: 'fail', message: 'Permintaan tidak valid' });
  });
});
