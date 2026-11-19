import multer from 'multer';
import { ApiError } from '../utils/http.js';

const storage = multer.memoryStorage();

export const imageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only PNG, JPG, WEBP, GIF or AVIF images are allowed.')),
});

export const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /\.(pdf|docx?|txt|md|png|jpe?g|webp|zip)$/i.test(file.originalname) ? cb(null, true) : cb(new ApiError(400, 'Unsupported file type.')),
});
