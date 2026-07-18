import dotenv from 'dotenv';
dotenv.config();

import { env } from './config/env.js';
import { testConnection } from './config/db.js';
import { createApp } from './app.js';
import { aiService } from './services/AiService.js';

async function bootstrap() {
  console.log('══════════════════════════════════════════════');
  console.log('  MAISON ROSAS — Server v1.0 (MySQL)');
  console.log('══════════════════════════════════════════════');
  console.log(`  Mode: ${env.NODE_ENV}`);
  console.log(`  Port: ${env.PORT}`);
  console.log(`  Database: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  console.log('──────────────────────────────────────────────');

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('');
    console.error('  ❌ DATABASE CONNECTION FAILED');
    console.error('  Please check your MySQL connection settings in .env');
    console.error('  Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    console.error('');
    console.error('  To create the database, run:');
    console.error('    mysql -u root -p -e "CREATE DATABASE maison_rosas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"');
    console.error('  Then run migrations:');
    console.error('    npm run db:migrate');
    console.error('');
    process.exit(1);
  }

  // Initialize AI service
  await aiService.initialize();

  // Create and start express app
  const app = createApp();

  app.listen(env.PORT, env.HOST, () => {
    console.log('');
    console.log(`  🎂 Server running at http://${env.HOST}:${env.PORT}`);
    console.log(`  📊 Health: http://localhost:${env.PORT}/api/health`);
    console.log(`  📦 Admin: http://localhost:${env.PORT}/admin`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('══════════════════════════════════════════════');
  });
}

bootstrap().catch((err) => {
  console.error('[FATAL] Server failed to start:', err);
  process.exit(1);
});
