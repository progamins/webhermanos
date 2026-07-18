import { BaseRepository } from './BaseRepository.js';

export interface ReviewRow {
  id: string;
  author: string;
  role: string | null;
  rating: number;
  comment: string;
  cake_model: string | null;
  date: string;
  approved: number;
  response: string | null;
  created_at: string;
  updated_at: string;
}

export class ReviewRepository extends BaseRepository<ReviewRow> {
  protected tableName = 'reviews';

  async findApproved(): Promise<ReviewRow[]> {
    return this.queryRaw<ReviewRow[]>(
      'SELECT * FROM reviews WHERE approved = 1 ORDER BY date DESC'
    );
  }

  async findPending(): Promise<ReviewRow[]> {
    return this.queryRaw<ReviewRow[]>(
      'SELECT * FROM reviews WHERE approved = 0 ORDER BY date DESC'
    );
  }
}
