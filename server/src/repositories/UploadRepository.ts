import { BaseRepository } from './BaseRepository.js';

export interface UploadRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  url: string;
  uploaded_by: string | null;
  created_at: string;
}

export class UploadRepository extends BaseRepository<UploadRow> {
  protected tableName = 'uploads';
}
