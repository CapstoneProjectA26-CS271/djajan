import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    // Dummy values so src/config/env.js passes; tests never open a real DB connection.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      FRONTEND_URL: 'http://localhost:5173,https://djajan-test.vercel.app',
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    },
  },
});
