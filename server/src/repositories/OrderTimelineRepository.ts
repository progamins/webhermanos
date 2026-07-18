import { BaseRepository } from './BaseRepository.js';

export interface OrderTimelineRow {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export class OrderTimelineRepository extends BaseRepository<OrderTimelineRow> {
  protected tableName = 'order_timeline';

  async findByOrderId(orderId: string): Promise<OrderTimelineRow[]> {
    return this.queryRaw<OrderTimelineRow[]>(
      'SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
  }
}
