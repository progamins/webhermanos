import { ReviewRepository, ReviewRow } from '../repositories/index.js';

const reviewRepo = new ReviewRepository();

function parseReview(row: ReviewRow) {
  return {
    id: row.id,
    author: row.author,
    role: row.role,
    rating: row.rating,
    comment: row.comment,
    cakeModel: row.cake_model,
    date: row.date,
    approved: !!row.approved,
    response: row.response,
  };
}

export class ReviewService {
  async getAll(): Promise<any[]> {
    const rows = await reviewRepo.findAll('date DESC');
    return rows.map(parseReview);
  }

  async getApproved(): Promise<any[]> {
    const rows = await reviewRepo.findApproved();
    return rows.map(parseReview);
  }

  async getPending(): Promise<any[]> {
    const rows = await reviewRepo.findPending();
    return rows.map(parseReview);
  }

  async create(data: any): Promise<any> {
    const row = await reviewRepo.create({
      id: data.id,
      author: data.author,
      role: data.role || null,
      rating: data.rating,
      comment: data.comment,
      cake_model: data.cakeModel || null,
      date: data.date || new Date().toISOString().slice(0, 10),
      approved: data.approved ? 1 : 0,
      response: data.response || null,
    } as any);
    return parseReview(row);
  }

  async update(id: string, data: any): Promise<boolean> {
    const updateData: any = {};
    if (data.approved !== undefined) updateData.approved = data.approved ? 1 : 0;
    if (data.response !== undefined) updateData.response = data.response;
    if (data.author !== undefined) updateData.author = data.author;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.comment !== undefined) updateData.comment = data.comment;
    return reviewRepo.update(id, updateData as any);
  }

  async delete(id: string): Promise<boolean> {
    return reviewRepo.delete(id);
  }
}

export const reviewService = new ReviewService();
