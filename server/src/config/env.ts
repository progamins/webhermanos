import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: string;

  // MySQL Database
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;

  // SMTP Email
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  EMAIL_SENDER_NAME: string;

  // Resend (alternative)
  RESEND_API_KEY: string;
  RESEND_SENDER_EMAIL: string;

  // Google
  GEMINI_API_KEY: string;
  GOOGLE_MAPS_PLATFORM_KEY: string;

  // Google Analytics
  GA_MEASUREMENT_ID: string;

  // App
  APP_URL: string;
  ADMIN_DEFAULT_PASSWORD: string;
  ANALYST_DEFAULT_PASSWORD: string;
  STOCK_MANAGER_DEFAULT_PASSWORD: string;

  // Upload
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
}

function loadEnv(): EnvConfig {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`[ENV] Variables faltantes: ${missing.join(', ')}. Usando valores por defecto.`);
  }

  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    HOST: process.env.HOST || '0.0.0.0',
    NODE_ENV: process.env.NODE_ENV || 'development',

    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'maison_rosas',

    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
    SMTP_SECURE: process.env.SMTP_SECURE !== 'false',
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME || 'Maison Rosas',

    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL || '',

    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GOOGLE_MAPS_PLATFORM_KEY: process.env.GOOGLE_MAPS_PLATFORM_KEY || '',

    GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID || '',

    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || 'ADMIN_PASSWORD_PLACEHOLDER',
    ANALYST_DEFAULT_PASSWORD: process.env.ANALYST_DEFAULT_PASSWORD || 'ANALYST_PASSWORD_PLACEHOLDER',
    STOCK_MANAGER_DEFAULT_PASSWORD: process.env.STOCK_MANAGER_DEFAULT_PASSWORD || 'STOCK_PASSWORD_PLACEHOLDER',

    UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '3145728', 10), // 3MB
  };
}

export const env = loadEnv();
