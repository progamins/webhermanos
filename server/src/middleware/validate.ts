import type { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger.js';

/**
 * Middleware that enforces Content-Type: application/json on POST, PUT, and PATCH requests
 * to API routes. This prevents CSRF-like attacks that use form-encoded payloads
 * against JSON endpoints.
 *
 * The only exceptions are:
 * - Upload routes (/api/upload) which use multipart/form-data
 * - The admin login route when carrying a MAC-verification header
 */
export function requireJson(req: Request, res: Response, next: NextFunction) {
  // Only enforce on mutating methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Skip for upload routes (multipart/form-data)
  // When mounted on '/api', req.path strips the prefix, so check both.
  if (req.path === '/upload' || req.path.startsWith('/upload/') ||
      req.path === '/api/upload' || req.path.startsWith('/api/upload/')) {
    return next();
  }

  const contentType = req.headers['content-type'] || '';

  // Accept requests with no body (e.g., empty POST)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength === 0) {
    return next();
  }

  // Allow application/json, application/csp-report, and multipart/form-data (for uploads)
  if (
    contentType.includes('application/json') ||
    contentType.includes('application/csp-report') ||
    contentType.includes('multipart/form-data')
  ) {
    return next();
  }

  logger.warn('Blocked non-JSON request', {
    service: 'Validation',
    path: req.path,
    method: req.method,
    contentType,
    ip: req.ip,
  });

  return res.status(415).json({
    success: false,
    error: 'Content-Type debe ser application/json.',
  });
}

/**
 * Password strength validator.
 * Enforces minimum security requirements for passwords.
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'La contraseña no puede estar vacía.' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.' };
  }

  // Common password patterns to reject
  const commonPatterns = ['12345678', 'password', 'contraseña', 'admin123', 'qwertyui'];
  const lowerPass = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPass.includes(pattern)) {
      return { valid: false, error: 'La contraseña contiene un patrón demasiado común.' };
    }
  }

  return { valid: true };
}
