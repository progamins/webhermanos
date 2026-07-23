import logger from '../lib/logger.js';
import { activityLogToRow } from '../lib/rowMapper.js';
import type { ActivityLog } from '../lib/types.js';
import { ActivityLogRepository, ActivityLogRow } from '../repositories/index.js';

const activityLogRepo = new ActivityLogRepository();

export class ActivityLogService {
  static async log(action: string, details: string, role: string = 'admin'): Promise<void> {
    try {
      const id = `log-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      await activityLogRepo.create(activityLogToRow(id, action, details, role));
    } catch (err) {
      logger.warn('Error saving activity log', { service: 'ActivityLog', error: err });
    }
  }

  static async getRecent(limit: number = 50): Promise<ActivityLog[]> {
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
