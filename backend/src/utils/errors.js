/**
 * Expected 4xx error. `message` is shown to the client, so write it in Bahasa Indonesia.
 */
export class ClientError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ClientError';
    this.statusCode = statusCode;
  }
}

/**
 * An external service we depend on (Supabase Storage, later the LLM) is missing or down: 503 in the
 * docs/API.md "error" format. `message` is shown to the client; the cause stays in the server log.
 */
export class ServiceUnavailableError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'ServiceUnavailableError';
  }
}
