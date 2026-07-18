import { BaseRepository } from './BaseRepository.js';

export interface AdminAuthRow {
  id: string;
  role: string;
  password_hash: string;
  active_session_token: string | null;
  credentials_emailed: number;
  updated_at: string;
}

export class AdminAuthRepository extends BaseRepository<AdminAuthRow> {
  protected tableName = 'admin_auth';

  async findByRole(role: string): Promise<AdminAuthRow | null> {
    const rows = await this.queryRaw<AdminAuthRow[]>(
      'SELECT * FROM admin_auth WHERE role = ?',
      [role]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async upsertPassword(role: string, passwordHash: string): Promise<void> {
    const existing = await this.findByRole(role);
    if (existing) {
      await this.executeRaw(
        'UPDATE admin_auth SET password_hash = ? WHERE role = ?',
        [passwordHash, role]
      );
    } else {
      await this.executeRaw(
        'INSERT INTO admin_auth (role, password_hash) VALUES (?, ?)',
        [role, passwordHash]
      );
    }
  }

  async setActiveSession(role: string, token: string | null): Promise<void> {
    await this.executeRaw(
      'UPDATE admin_auth SET active_session_token = ? WHERE role = ?',
      [token, role]
    );
  }

  async markCredentialsEmailed(): Promise<void> {
    await this.executeRaw(
      'UPDATE admin_auth SET credentials_emailed = 1'
    );
  }
}
