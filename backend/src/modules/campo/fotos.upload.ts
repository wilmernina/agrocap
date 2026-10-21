import multer from 'multer';
import { AppError } from '../../shared/errors.ts';

const tiposPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const cargarFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!tiposPermitidos.has(file.mimetype)) return callback(new AppError(415, 'La foto debe estar en formato JPG, PNG o WebP', 'TIPO_ARCHIVO_INVALIDO'));
    callback(null, true);
  },
}).single('foto');
