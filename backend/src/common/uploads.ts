/**
 * Shared multer configs for document and image uploads.
 */

import multer from 'multer';
import { isSupportedMimeType } from '../shared/documentParser.service.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
    const ext = (file.originalname || '').toLowerCase().replace(/^.*\./, '') || '';
    const allowedExts = ['pdf', 'docx', 'doc', 'txt', 'md'];
    const ok = isSupportedMimeType(mime) || (ext && allowedExts.includes(ext));
    if (ok) cb(null, true);
    else cb(new Error('Unsupported file type. Use PDF, DOCX, TXT, or MD.'));
  },
});

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB for header image
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/.test(mime);
    if (ok) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  },
});
