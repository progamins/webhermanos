import logger from '../lib/logger.js';
import { reviewCreateToRow, reviewUpdateToRow } from '../lib/rowMapper.js';
import type { Review, ReviewCreateInput, ReviewUpdateInput } from '../lib/types.js';
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
    date: row.date ? new Date(row.date).toISOString().substring(0, 10) : null,
    approved: !!row.approved,
    response: row.response,
  };
}

export class ReviewService {
  async getAll(): Promise<Review[]> {
    const rows = await reviewRepo.findAll('date DESC');
    return rows.map(parseReview);
  }

  async getApproved(): Promise<Review[]> {
    const rows = await reviewRepo.findApproved();
    return rows.map(parseReview);
  }

  async getPending(): Promise<Review[]> {
    const rows = await reviewRepo.findPending();
    return rows.map(parseReview);
  }

  async create(data: ReviewCreateInput): Promise<Review> {
    const row = await reviewRepo.create(reviewCreateToRow(data));
    return parseReview(row);
  }

  async update(id: string, data: ReviewUpdateInput): Promise<boolean> {
    return reviewRepo.update(id, reviewUpdateToRow(data));
  }

  async delete(id: string): Promise<boolean> {
    return reviewRepo.delete(id);
  }
}

export const reviewService = new ReviewService();
