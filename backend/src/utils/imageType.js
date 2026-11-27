// One limit for multer (POST /api/admin/uploads) and the Supabase bucket (scripts/setup-storage.js). In bytes:
// Supabase reads "2MB" as 2,000,000, which would reject files the backend had already accepted.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Identify uploads by their first bytes, not by the client-supplied filename or Content-Type.
const SIGNATURES = [
  { mime: 'image/jpeg', ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: 'png',
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    matches: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
  },
];

// What the bucket accepts; derived from the signatures so the two lists cannot drift apart.
export const IMAGE_MIME_TYPES = SIGNATURES.map((signature) => signature.mime);

/** Returns { mime, ext } for JPEG, PNG, or WEBP, else null. */
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  const match = SIGNATURES.find((signature) => signature.matches(buffer));
  return match ? { mime: match.mime, ext: match.ext } : null;
}
