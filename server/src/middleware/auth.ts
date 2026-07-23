import logger from '../lib/logger.js';
import type { Request, Response, NextFunction } from 'express';
import { AdminSessionRepository, AdminAuthRepository } from '../repositories/index.js';

const sessionRepo = new AdminSessionRepository();
const authRepo = new AdminAuthRepository();

export async function verifyAdminSession(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string;
  if (!token) {
    return res.status(401).json({ success: false, error: 'No autorizado: Token no provisto.' });
  }

  try {
    const session = await sessionRepo.findByToken(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'No autorizado: Sesión inválida.' });
    }

    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      await sessionRepo.delete(token);
      return res.status(401).json({ success: false, error: 'No autorizado: Sesión expirada.' });
    }

    // Single-session check
    const authRow = await authRepo.findByRole(session.role);
    if (authRow && authRow.active_session_token && authRow.active_session_token !== token) {
      await sessionRepo.delete(token);
      return res.status(401).json({ success: false, error: 'Sesión reemplazada por otro inicio de sesión.' });
    }

    // Attach session info to request
    (req as any).adminRole = session.role;
    (req as any).adminToken = token;

    next();
  } catch (error) {
    logger.error('Admin auth middleware error', { service: 'Auth', error: (error as Error)?.message });
    return res.status(500).json({ success: false, error: 'Error al verificar sesión.' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).adminRole;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'No autorizado para esta operación.' });
    }
    next();
  };
}
