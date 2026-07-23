import { BaseRepository } from './BaseRepository.js';

export interface UploadRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  url: string;
  content_hash: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export class UploadRepository extends BaseRepository<UploadRow> {
  protected tableName = 'uploads';

  /** Busca un archivo por su hash SHA256. Devuelve el primero encontrado o null. */
  async findByHash(hash: string): Promise<UploadRow | null> {
    const rows = await this.queryRaw<UploadRow[]>(
      'SELECT * FROM uploads WHERE content_hash = ? LIMIT 1',
      [hash]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /** Encuentra todos los archivos que comparten el mismo hash. */
  async findAllByHash(hash: string): Promise<UploadRow[]> {
    return this.queryRaw<UploadRow[]>(
      'SELECT * FROM uploads WHERE content_hash = ?',
      [hash]
    );
  }

  /** Cuenta cuántos archivos tienen el mismo hash. */
  async countByHash(hash: string): Promise<number> {
    const rows = await this.queryRaw<{ count: number }[]>(
      'SELECT COUNT(*) AS count FROM uploads WHERE content_hash = ?',
      [hash]
    );
    return rows[0]?.count ?? 0;
  }

  /** Actualiza el hash de un archivo existente */
  async updateHash(id: string, hash: string): Promise<void> {
    await this.update(id, { content_hash: hash } as Partial<UploadRow>);
  }
}
