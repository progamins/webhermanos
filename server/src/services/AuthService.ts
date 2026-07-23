import logger from '../lib/logger.js';
import { sessionToRow } from '../lib/rowMapper.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AdminAuthRepository } from '../repositories/index.js';
import { AdminSessionRepository } from '../repositories/index.js';
import { ActivityLogService } from './ActivityService.js';

const adminAuthRepo = new AdminAuthRepository();
const adminSessionRepo = new AdminSessionRepository();

export class AuthService {
  async login(password: string, role: string = 'admin'): Promise<{
    success: boolean;
    token?: string;
    expiresAt?: string;
    role?: string;
    error?: string;
  }> {
    const validRoles = ['admin', 'analyst', 'stock_manager'];
    if (!validRoles.includes(role)) {
      return { success: false, error: 'Rol inválido.' };
    }

    try {
      let authRow = await adminAuthRepo.findByRole(role);

      // Seed default passwords if not set
      if (!authRow) {
        const salt = bcrypt.genSaltSync(10);
        const defaultPasswords: Record<string, string> = {
          admin: process.env.ADMIN_DEFAULT_PASSWORD || 'ADMIN_PASSWORD_PLACEHOLDER',
          analyst: process.env.ANALYST_DEFAULT_PASSWORD || 'ANALYST_PASSWORD_PLACEHOLDER',
          stock_manager: process.env.STOCK_MANAGER_DEFAULT_PASSWORD || 'STOCK_PASSWORD_PLACEHOLDER',
        };
        await adminAuthRepo.upsertPassword(role, bcrypt.hashSync(defaultPasswords[role], salt));
        authRow = await adminAuthRepo.findByRole(role);
        if (!authRow) {
          return { success: false, error: 'Error al inicializar credenciales.' };
        }
      }

      const isMatch = bcrypt.compareSync(password, authRow.password_hash);
      if (!isMatch) {
        await ActivityLogService.log('Intento fallido de inicio de sesión', `Rol: ${role}`, role);
        return { success: false, error: 'Contraseña incorrecta para el rol seleccionado.' };
      }

      // Invalidate existing session
      if (authRow.active_session_token) {
        try {
          await adminSessionRepo.delete(authRow.active_session_token);
        } catch { /* ignore */ }
      }

      // Create new session
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await adminSessionRepo.create(sessionToRow(token, role, expiresAt.slice(0, 19).replace('T', ' ')));

      await adminAuthRepo.setActiveSession(role, token);

      const roleLabels: Record<string, string> = {
        admin: 'Administrador', analyst: 'Analista', stock_manager: 'Gestor de Stock',
      };
      await ActivityLogService.log('Inicio de sesión', `El ${roleLabels[role] || role} inició sesión.`, role);

      return { success: true, token, expiresAt, role };
    } catch (error: any) {
      logger.error('Login error', { service: 'AuthService', error: error?.message });
      return { success: false, error: 'Error en el servidor al iniciar sesión.' };
    }
  }

  async verifySession(token: string): Promise<{ valid: boolean; role?: string; error?: string }> {
    if (!token) return { valid: false, error: 'Token no provisto.' };

    try {
      const session = await adminSessionRepo.findByToken(token);
      if (!session) return { valid: false, error: 'Sesión inválida o vencida.' };

      const expiresAt = new Date(session.expires_at);
      if (expiresAt < new Date()) {
        await adminSessionRepo.delete(token);
        return { valid: false, error: 'Sesión expirada.' };
      }

      // Single-session check
      const authRow = await adminAuthRepo.findByRole(session.role);
      if (authRow && authRow.active_session_token && authRow.active_session_token !== token) {
        await adminSessionRepo.delete(token);
        return { valid: false, error: 'Sesión reemplazada por otro inicio de sesión.' };
      }

      return { valid: true, role: session.role };
    } catch (error) {
      logger.error('Verify error', { service: 'AuthService', error: (error as Error)?.message });
      return { valid: false, error: 'Error al verificar sesión.' };
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const session = await adminSessionRepo.findByToken(token);
      if (session) {
        await adminAuthRepo.setActiveSession(session.role, null);
      }
      await adminSessionRepo.delete(token);
    } catch { /* ignore */ }
  }

  async changePassword(role: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authRow = await adminAuthRepo.findByRole(role);
      if (!authRow) return { success: false, error: 'Credenciales no encontradas.' };

      if (!bcrypt.compareSync(currentPassword, authRow.password_hash)) {
        return { success: false, error: 'Contraseña actual incorrecta.' };
      }

      const salt = bcrypt.genSaltSync(10);
      const newHash = bcrypt.hashSync(newPassword, salt);

      // Invalidate all sessions
      if (authRow.active_session_token) {
        await adminSessionRepo.delete(authRow.active_session_token);
      }
      await adminAuthRepo.upsertPassword(role, newHash);
      await adminAuthRepo.setActiveSession(role, null);

      await ActivityLogService.log('Contraseña cambiada', `Contraseña de rol ${role} actualizada.`, role);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Error al cambiar la contraseña.' };
    }
  }

  async getRolePasswordsStatus(): Promise<{
    success: boolean;
    roles?: any[];
    credentials_emailed?: boolean;
    error?: string;
  }> {
    try {
      const roles = ['admin', 'analyst', 'stock_manager'];
      const roleData: any[] = [];
      let credentialsEmailed = false;

      for (const r of roles) {
        const auth = await adminAuthRepo.findByRole(r);
        if (auth) {
          roleData.push({ role: r, hasPassword: !!auth.password_hash });
          if (auth.credentials_emailed) credentialsEmailed = true;
        }
      }

      return { success: true, roles: roleData, credentials_emailed: credentialsEmailed };
    } catch {
      return { success: false, error: 'Error al obtener estado de contraseñas.' };
    }
  }

  async saveRolePasswords(analystPassword: string, stockManagerPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const salt = bcrypt.genSaltSync(10);
      await adminAuthRepo.upsertPassword('analyst', bcrypt.hashSync(analystPassword, salt));
      await adminAuthRepo.upsertPassword('stock_manager', bcrypt.hashSync(stockManagerPassword, salt));
      await ActivityLogService.log('Contraseñas de roles actualizadas', 'Analista y Gestor de Stock.', 'admin');
      return { success: true };
    } catch {
      return { success: false, error: 'Error al guardar contraseñas.' };
    }
  }

  async sendCredentials(): Promise<{ success: boolean; alreadySent?: boolean; message?: string; error?: string }> {
    try {
      const authRows = await Promise.all(
        ['admin', 'analyst', 'stock_manager'].map(r => adminAuthRepo.findByRole(r))
      );

      const allEmailed = authRows.every(a => a?.credentials_emailed);
      if (allEmailed) {
        return { success: true, alreadySent: true, message: 'Las credenciales ya fueron enviadas anteriormente.' };
      }

      await adminAuthRepo.markCredentialsEmailed();
      return { success: true, message: 'Credenciales marcadas como enviadas.' };
    } catch {
      return { success: false, error: 'Error al marcar credenciales.' };
    }
  }
}

export const authService = new AuthService();
