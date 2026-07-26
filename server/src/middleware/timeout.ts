import type { Request, Response, NextFunction } from 'express';

/**
 * Request timeout middleware.
 * Prevents slow loris / slow request attacks by aborting requests
 * that take longer than the specified time limit.
 *
 * The default timeout is 30 seconds for API routes.
 * For upload routes, the timeout is extended to 5 minutes.
 */
const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
const UPLOAD_TIMEOUT_MS = 300_000; // 5 minutes

export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  // Upload routes need more time for file processing.
  // In Express, req.path does NOT include a trailing slash for POST /api/upload,
  // so we must check both with and without the trailing slash.
  const isUpload = req.path === '/api/upload' || req.path.startsWith('/api/upload/');
  const timeoutMs = isUpload ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'La solicitud excedió el tiempo de espera. Intenta de nuevo.',
      });
    }
  }, timeoutMs);

  // Cleanup on response finish
  res.on('finish', () => {
    clearTimeout(timer);
  });

  // Cleanup on response close (e.g., client disconnected)
  res.on('close', () => {
    clearTimeout(timer);
  });

  next();
}
