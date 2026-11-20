import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const NODE_ENVS = ['development', 'test', 'production'];

/**
 * Reads and validates environment variables. Throws one error listing every problem
 * so a misconfigured deploy fails at boot instead of on the first request.
 */
export function loadEnv(source) {
  const errors = [];

  const nodeEnv = source.NODE_ENV || 'development';
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV harus salah satu dari: ${NODE_ENVS.join(', ')}`);
  }

  const port = source.PORT ? Number(source.PORT) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT harus bilangan bulat 1–65535');
  }

  const databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL wajib diisi');
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL harus diawali postgres:// atau postgresql://');
  }

  let frontendUrl;
  if (!source.FRONTEND_URL) {
    errors.push('FRONTEND_URL wajib diisi');
  } else {
    try {
      // CORS compares against the bare origin, so drop any path or trailing slash.
      frontendUrl = new URL(source.FRONTEND_URL).origin;
    } catch {
      errors.push('FRONTEND_URL harus berupa URL yang valid, contoh http://localhost:5173');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Konfigurasi environment tidak valid:\n- ${errors.join('\n- ')}\n` +
        'Salin backend/.env.example menjadi backend/.env lalu lengkapi nilainya.',
    );
  }

  return Object.freeze({
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_URL: frontendUrl,
  });
}

let env;
try {
  env = loadEnv(process.env);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

export { env };
