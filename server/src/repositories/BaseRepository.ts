import { query, execute, transaction } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract tableName: string;

  async findAll(orderBy?: string): Promise<T[]> {
    const sql = orderBy
      ? `SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`
      : `SELECT * FROM ${this.tableName}`;
    return query<T[]>(sql);
  }

  async findById(id: string): Promise<T | null> {
    const rows = await query<T[]>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data: Partial<T>): Promise<T> {
    const id = data.id || uuidv4();
    const record = { ...data, id } as any;

    // Auto-add timestamps
    if (!record.created_at) {
      record.created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    if (record.updated_at === undefined && this.tableName !== 'gallery' && this.tableName !== 'activity_logs' && this.tableName !== 'contact_messages' && this.tableName !== 'otp_codes' && this.tableName !== 'uploads' && this.tableName !== 'order_timeline') {
      record.updated_at = record.created_at;
    }

    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map(() => '?').join(', ');
    const cols = keys.join(', ');

    await execute(
      `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders})`,
      values
    );

    return record as T;
  }

  async update(id: string, data: Partial<T>): Promise<boolean> {
    const keys = Object.keys(data);
    if (keys.length === 0) return false;

    // Auto-update timestamp
    const setClauses = keys.map(k => `${k} = ?`);
    const values = keys.map(k => (data as any)[k]);

    // Add updated_at if not in keys and table supports it
    if (!keys.includes('updated_at') && this.tableName !== 'gallery' && this.tableName !== 'activity_logs' && this.tableName !== 'contact_messages' && this.tableName !== 'otp_codes' && this.tableName !== 'uploads' && this.tableName !== 'order_timeline') {
      setClauses.push('updated_at = ?');
      values.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
    }

    values.push(id);
    const result = await execute(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  async count(): Promise<number> {
    const rows = await query<any[]>(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    return rows[0].count;
  }

  protected async queryRaw<R = any>(sql: string, params?: any[]): Promise<R> {
    return query<R>(sql, params);
  }

  protected async executeRaw(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    return execute(sql, params);
  }
}
