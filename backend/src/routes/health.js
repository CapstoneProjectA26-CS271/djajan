import { Router } from 'express';
import { pingDatabase } from '../repositories/healthRepository.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/db', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ status: 'ok' });
  } catch (err) {
    // ECONNREFUSED on localhost arrives as an AggregateError with an empty message.
    console.error('Health check database gagal:', err.message || err.code);
    res.status(503).json({ status: 'error', message: 'Database tidak dapat dihubungi' });
  }
});
