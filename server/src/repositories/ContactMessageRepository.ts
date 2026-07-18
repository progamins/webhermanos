import { BaseRepository } from './BaseRepository.js';

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string | null;
  message: string;
  read: number;
  created_at: string;
}

export class ContactMessageRepository extends BaseRepository<ContactMessageRow> {
  protected tableName = 'contact_messages';

  async findUnread(): Promise<ContactMessageRow[]> {
    return this.queryRaw<ContactMessageRow[]>(
      'SELECT * FROM contact_messages WHERE read = 0 ORDER BY created_at DESC'
    );
  }

  async markAsRead(id: string): Promise<boolean> {
    const result = await this.executeRaw(
      'UPDATE contact_messages SET read = 1 WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
