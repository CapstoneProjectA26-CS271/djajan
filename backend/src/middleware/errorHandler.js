import { ClientError, ServiceUnavailableError } from '../utils/errors.js';

// body-parser error types -> Indonesian messages (its own messages are English).
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'Format JSON tidak valid',
  'entity.too.large': 'Ukuran data terlalu besar',
  'encoding.unsupported': 'Encoding tidak didukung',
  'charset.unsupported': 'Charset tidak didukung',
};

export function notFoundHandler(req, res) {
  res.status(404).json({ status: 'fail', message: 'Endpoint tidak ditemukan' });
}

// Express recognizes error middleware by its 4 parameters, so `next` must stay.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ClientError) {
    res.status(err.statusCode).json({ status: 'fail', message: err.message });
    return;
  }

  if (err instanceof ServiceUnavailableError) {
    console.error(err.cause ?? err);
    res.status(503).json({ status: 'error', message: err.message });
    return;
  }

  const statusCode = err.status ?? err.statusCode;
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    const message = BODY_PARSER_MESSAGES[err.type] ?? 'Permintaan tidak valid';
    res.status(statusCode).json({ status: 'fail', message });
    return;
  }

  // Full detail goes to the server log only; the client never sees the stack or internal message.
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server' });
}
