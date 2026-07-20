import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
      // Connection robustness
      connectTimeout: 10000,          // 10s timeout for initial connection
      maxIdle: 5,                     // Keep up to 5 idle connections
      idleTimeout: 60000,             // Close idle connections after 60s
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,   // Ping every 10s to keep connection alive
    });

    // Handle pool errors gracefully
    pool.on('connection', (conn) => {
      conn.on('error', (err) => {
        console.error('[DB] Connection error:', (err as Error).message);
      });
    });

    // Periodic connection health check (every 5 minutes)
    const interval = setInterval(async () => {
      const p = pool;
      if (!p) {
        clearInterval(interval);
        return;
      }
      try {
        const conn = await p.getConnection();
        await conn.ping();
        conn.release();
      } catch {
        console.warn('[DB] Health check failed — pool may need recovery');
      }
    }, 5 * 60 * 1000);

    console.log(`[DB] Connection pool created for ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query(sql, params);
    return rows as T;
  } finally {
    conn.release();
  }
}

export async function execute(sql: string, params?: any[]) {
  const conn = await getPool().getConnection();
  try {
    const [result] = await conn.execute(sql, params);
    return result as mysql.ResultSetHeader;
  } finally {
    conn.release();
  }
}

export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getPool().getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] Connection test successful!');
    return true;
  } catch (error: any) {
    console.error('[DB] Connection test failed:', error?.message || error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed.');
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
