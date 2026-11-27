import { Router } from 'express';
import multer from 'multer';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { uploadMenuImage } from '../services/storageService.js';
import { ClientError } from '../utils/errors.js';
import { detectImageType, MAX_IMAGE_BYTES } from '../utils/imageType.js';

// Memory storage: the file is at most 2 MB and goes straight to Supabase, never to local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1 },
});

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: [413, 'Ukuran foto maksimal 2 MB'],
  LIMIT_UNEXPECTED_FILE: [400, 'Kirim satu foto di field "image"'],
  LIMIT_FILE_COUNT: [400, 'Kirim satu foto di field "image"'],
  LIMIT_PART_COUNT: [400, 'Kirim satu foto di field "image"'],
  LIMIT_FIELD_COUNT: [400, 'Kirim satu foto di field "image"'],
};

// Turns multer's English errors into ClientError so the response follows docs/API.md. Memory storage
// cannot fail on its own, so any other error here is a malformed multipart body from the client.
function singleImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    const [status, message] = (err instanceof multer.MulterError && MULTER_MESSAGES[err.code]) || [
      400,
      'Unggahan foto tidak valid',
    ];
    next(new ClientError(message, status));
  });
}

// Mounted under /api/admin/uploads behind requireAuth (see app.js).
export const adminUploadRouter = Router();

adminUploadRouter.post('/', uploadLimiter, singleImage, async (req, res) => {
  if (!req.file) {
    throw new ClientError('Foto wajib diunggah dalam field "image" (multipart/form-data)', 400);
  }
  const type = detectImageType(req.file.buffer);
  if (!type) {
    throw new ClientError('Format foto harus JPG, PNG, atau WEBP', 400);
  }

  const url = await uploadMenuImage({ buffer: req.file.buffer, ...type });
  res.status(201).json({ status: 'success', data: { url } });
});
