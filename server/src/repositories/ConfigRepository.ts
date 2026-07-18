import { BaseRepository } from './BaseRepository.js';

export interface ConfigRow {
  id: string;
  config_key: string;
  config_value: string;
  updated_at: string;
}

export class ConfigRepository extends BaseRepository<ConfigRow> {
  protected tableName = 'config';

  async findByKey(key: string): Promise<ConfigRow | null> {
    const rows = await this.queryRaw<ConfigRow[]>(
      'SELECT * FROM config WHERE config_key = ?',
      [key]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async upsert(key: string, value: any): Promise<void> {
    const existing = await this.findByKey(key);
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (existing) {
      await this.executeRaw(
        'UPDATE config SET config_value = ? WHERE config_key = ?',
        [jsonValue, key]
      );
    } else {
      await this.executeRaw(
        'INSERT INTO config (config_key, config_value) VALUES (?, ?)',
        [key, jsonValue]
      );
    }
  }

  async getAppConfig(): Promise<any | null> {
    const row = await this.findByKey('app_config');
    if (!row) return null;
    try {
      return JSON.parse(row.config_value);
    } catch {
      return row.config_value;
    }
  }

  async setAppConfig(config: any): Promise<void> {
    await this.upsert('app_config', config);
  }

  async getAdminAuth(): Promise<any | null> {
    const row = await this.findByKey('admin_auth');
    if (!row) return null;
    try {
      return JSON.parse(row.config_value);
    } catch {
      return row.config_value;
    }
  }

  async setAdminAuth(authData: any): Promise<void> {
    await this.upsert('admin_auth', authData);
  }
}
