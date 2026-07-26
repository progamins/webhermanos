import logger from './lib/logger.js';
import dotenv from 'dotenv';
dotenv.config();

import { env } from './config/env.js';
import { testConnection } from './config/db.js';
import { createApp } from './app.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Read version from the root package.json (workspace) at runtime. */
function getServerVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch (err) {
    logger.warn(`Could not read version from package.json, falling back to 0.0.0`, {
      service: 'Server',
      error: (err as Error)?.message,
    });
    return '0.0.0';
  }
}

const SERVER_VERSION = getServerVersion();

async function bootstrap() {
  logger.info('══════════════════════════════════════════════', { service: 'Server' });
  logger.info(`  MAISON ROSAS — Server v${SERVER_VERSION} (MySQL)`, { service: 'Server' });
  logger.info('══════════════════════════════════════════════', { service: 'Server' });
  logger.info(`Mode: ${env.NODE_ENV}`, { service: 'Server' });
  logger.info(`Port: ${env.PORT}`, { service: 'Server' });
  logger.info(`Database: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`, { service: 'Server' });

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.error('❌ DATABASE CONNECTION FAILED', { service: 'Server' });
    logger.error('Check MySQL connection settings in .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME', { service: 'Server' });
    logger.error('Create DB: mysql -u root -p -e "CREATE DATABASE maison_rosas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"', { service: 'Server' });
    logger.error('Then run: npm run db:migrate', { service: 'Server' });
    process.exit(1);
  }


  // Create and start express app
  const app = createApp();

  app.listen(env.PORT, env.HOST, () => {
    logger.info(`🎂 Server running at http://${env.HOST}:${env.PORT}`, { service: 'Server' });
    logger.info(`📊 Health: http://localhost:${env.PORT}/api/health`, { service: 'Server' });
    logger.info(`📦 Admin: http://localhost:${env.PORT}/admin`, { service: 'Server' });
    logger.info('Press Ctrl+C to stop', { service: 'Server' });
  });
}

bootstrap().catch((err) => {
  logger.error('FATAL: Server failed to start', { service: 'Server', error: (err as Error)?.message });
  process.exit(1);
});
