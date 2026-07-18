import { ActivityLogRepository } from '../repositories/index.js';
import { v4 as uuidv4 } from 'uuid';

const activityLogRepo = new ActivityLogRepository();

export class ActivityLogService {
  static async log(action: string, details: string, role: string = 'admin'): Promise<void> {
    try {
      await activityLogRepo.create({
        id: `log-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        action,
        details,
        role,
      } as any);
    } catch (err) {
      console.warn('[ActivityLog] Error saving:', err);
    }
  }

  static async getRecent(limit: number = 50): Promise<any[]> {
    const logs = await activityLogRepo.findRecent(limit);
    return logs.map(log => ({
      id: log.id,
      action: log.action,
      details: log.details,
      role: log.role,
      timestamp: log.created_at,
    }));
  }
}

export const activityLogService = new ActivityLogService();
