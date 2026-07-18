import { BaseRepository } from './BaseRepository.js';
import { execute } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export interface AdminSessionRow {
  id: string;
  token: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export class AdminSessionRepository extends BaseRepository<AdminSessionRow> {
  protected tableName = 'admin_sessions';

  // Override: admin_sessions uses token as PK, not id
  // id field is kept for BaseRepository compatibility but not inserted into DB
  async create(data: Partial<AdminSessionRow>): Promise<AdminSessionRow> {
    const record = { ...data, id: data.id || uuidv4() } as AdminSessionRow;
    // Exclude 'id' from the INSERT since the table has no id column
    const { id, ...insertData } = record;
    const keys = Object.keys(insertData);
    const values = keys.map(k => (insertData as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');
    const cols = keys.join(', ');

    await execute(
      `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders})`,
      values
    );

    return record;
  }

  // Override: delete by token, not by id
  async delete(token: string): Promise<boolean> {
    const result = await execute(`DELETE FROM ${this.tableName} WHERE token = ?`, [token]);
    return result.affectedRows > 0;
  }

  async findByToken(token: string): Promise<AdminSessionRow | null> {
    const rows = await this.queryRaw<AdminSessionRow[]>(
      'SELECT * FROM admin_sessions WHERE token = ?',
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.executeRaw(
      'DELETE FROM admin_sessions WHERE expires_at < NOW()'
    );
    return result.affectedRows;
  }

  async deleteAllForRole(role: string): Promise<number> {
    const result = await this.executeRaw(
      'DELETE FROM admin_sessions WHERE role = ?',
      [role]
    );
    return result.affectedRows;
  }
}
