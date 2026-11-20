import { rateLimit } from 'express-rate-limit';

/**
 * Builds a rate limiter that answers 429 in the docs/API.md "fail" format.
 * Keyed by client IP (IPv6 grouped per /56); relies on `trust proxy` in production.
 * Uses the in-memory store, which is fine for a single Render instance.
 */
export function createRateLimiter({ windowMs, limit, message, ...options }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { status: 'fail', message },
    ...options,
  });
}

// POST /api/auth/login: 5 failed attempts -> 429 for 15 minutes (docs/API.md).
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
});

// POST /api/events: a catalog visit sends a handful of events per minute.
export const eventsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
});

// /api/admin/ai/*: protects the Gemini/Groq quota.
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  message: 'Batas pemakaian AI tercapai. Coba lagi dalam 1 menit.',
});
