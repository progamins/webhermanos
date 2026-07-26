/**
 * ═══════════════════════════════════════════════════════════════════════
 * Vercel Serverless Function — Express API Entry Point
 *
 * Este archivo es el punto de entrada para las funciones serverless de
 * Vercel. Vercel detecta automáticamente los archivos en la carpeta api/
 * y los despliega como funciones serverless con el runtime @vercel/node.
 *
 * Importa la app Express desde el servidor y la exporta como default.
 * Vercel maneja el ciclo de vida request/response automáticamente.
 *
 * Variables de entorno requeridas en Vercel:
 *   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 *   - ADMIN_DEFAULT_PASSWORD, ANALYST_DEFAULT_PASSWORD, STOCK_MANAGER_DEFAULT_PASSWORD
 *   - ADMIN_SECRET_PATH
 *   - BLOB_READ_WRITE_TOKEN (Vercel Blob)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { createApp } from '../server/src/app.js';

// Señal para que el servidor sepa que corre en Vercel.
// Esto permite saltar ciertas operaciones que no funcionan en serverless
// (ej. servir archivos estáticos, usar sistema de archivos local).
process.env.VERCEL = 'true';
process.env.VERCEL_ENV = process.env.VERCEL_ENV || 'production';

// En Vercel, el host siempre debe ser 0.0.0.0 y el puerto no importa
// porque Vercel maneja el enrutamiento.
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

const app = createApp();

export default app;
