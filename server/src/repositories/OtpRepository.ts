import { BaseRepository } from './BaseRepository.js';

export interface OtpRow {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export class OtpRepository extends BaseRepository<OtpRow> {
  protected tableName = 'otp_codes';

  async findValidByEmail(email: string, code: string): Promise<OtpRow | null> {
    const rows = await this.queryRaw<OtpRow[]>(
      'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async markAsUsed(id: string): Promise<boolean> {
    const result = await this.executeRaw(
      'UPDATE otp_codes SET used = 1 WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.executeRaw(
      'DELETE FROM otp_codes WHERE expires_at < NOW()'
    );
    return result.affectedRows;
  }
}
