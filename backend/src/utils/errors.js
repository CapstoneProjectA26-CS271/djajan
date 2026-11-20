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
