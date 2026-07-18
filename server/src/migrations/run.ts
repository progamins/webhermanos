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

  // Read and execute the schema file
  const schemaPath = path.join(__dirname, '001_init.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('  📄 Running 001_init.sql...');
  await conn.query(schema);
  console.log('  ✅ Schema applied successfully');

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
