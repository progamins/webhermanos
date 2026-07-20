import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log('══════════════════════════════════════════════');
  console.log('  MAISON ROSAS — Database Migration');
  console.log('══════════════════════════════════════════════');

  // First connect without database to ensure it exists
  const tempConn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  // Create database if not exists
  await tempConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`  ✅ Database '${env.DB_NAME}' ready`);
  await tempConn.end();

  // Now connect to the database
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  // Execute all migration files in order
  const migrationFiles = ['001_init.sql', '002_optimize.sql'];

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  ${file} not found, skipping`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`  📄 Running ${file}...`);

    // Split by semicolons to run statements one by one
    // This way, if one fails (e.g. duplicate index), others still apply
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (s.length === 0) return false;
        // Only filter out chunks that are PURELY comments (no SQL content)
        const nonCommentLines = s.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('--'));
        return nonCommentLines.length > 0;
      });

    let successCount = 0;
    let skippedCount = 0;

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        successCount++;
      } catch (err: any) {
        // ER_DUP_KEYNAME (1061) = index already exists — safe to skip
        if (err?.errno === 1061) {
          console.log(`  ⚠️  Index already exists, skipping: ${stmt.slice(0, 60)}...`);
          skippedCount++;
        } else {
          throw err;
        }
      }
    }

    console.log(`  ✅ ${file} applied (${successCount} ok, ${skippedCount} skipped)`);
  }

  await conn.end();

  console.log('');
  console.log('  🎂 Migration complete!');
  console.log('  Run "npm run db:seed" to populate initial data.');
  console.log('══════════════════════════════════════════════');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
