import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Multer file size error
  if (err.message?.includes('File too large')) {
    return res.status(413).json({
      success: false,
      error: 'El archivo es demasiado grande. Máximo 3MB.',
    });
  }

  // Multer file type error
  if (err.message?.includes('formato')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor.',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  // For API routes, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: `Ruta no encontrada: ${req.method} ${req.path}`,
    });
  }
  // For SPA, let the frontend handle routing
  res.status(404).send('Not found');
}
