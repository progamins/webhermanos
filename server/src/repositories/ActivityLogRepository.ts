import { BaseRepository } from './BaseRepository.js';

export interface ActivityLogRow {
  id: string;
  action: string;
  details: string | null;
  role: string | null;
  created_at: string;
}

export class ActivityLogRepository extends BaseRepository<ActivityLogRow> {
  protected tableName = 'activity_logs';

  async findRecent(limit_num: number = 50): Promise<ActivityLogRow[]> {
    return this.queryRaw<ActivityLogRow[]>(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?',
      [limit_num]
    );
  }

  async findByAction(action: string, limit_num: number = 20): Promise<ActivityLogRow[]> {
    return this.queryRaw<ActivityLogRow[]>(
      'SELECT * FROM activity_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?',
      [action, limit_num]
    );
  }
}
