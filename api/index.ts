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

import express, { type Express, type Request, type Response } from 'express';

// Señal para que el servidor sepa que corre en Vercel.
process.env.VERCEL = 'true';
process.env.VERCEL_ENV = process.env.VERCEL_ENV || 'production';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

/**
 * Inicializa la app Express con manejo de errores graceful.
 * Si faltan variables de entorno, devuelve un API que responde con
 * errores JSON claros en vez de un crash genérico 500.
 */
let app: Express;
try {
  // Import dinámico con try-catch para atrapar errores de env vars faltantes
  // Usamos await import() en vez de require() porque el server usa ESM ("type": "module")
  const { createApp } = await import('../server/src/app.js');
  app = createApp();
} catch (err: any) {
  console.error('[Vercel API] Error al iniciar la aplicación:', err?.message || err);
  if (err?.stack) console.error('[Vercel API] Stack:', err.stack);

  // Verificar si las env vars están presentes para diagnóstico
  const envStatus = {
    DB_HOST: !!process.env.DB_HOST,
    DB_PORT: !!process.env.DB_PORT,
    DB_USER: !!process.env.DB_USER,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_NAME: !!process.env.DB_NAME,
    ADMIN_SECRET_PATH: !!process.env.ADMIN_SECRET_PATH,
    ADMIN_DEFAULT_PASSWORD: !!process.env.ADMIN_DEFAULT_PASSWORD,
    ANALYST_DEFAULT_PASSWORD: !!process.env.ANALYST_DEFAULT_PASSWORD,
    STOCK_MANAGER_DEFAULT_PASSWORD: !!process.env.STOCK_MANAGER_DEFAULT_PASSWORD,
    APP_URL: !!process.env.APP_URL,
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Fallback: app mínima que informa qué falta con JSON descriptivo
  app = express();
  app.use('*', (_req: Request, res: Response) => {
    const message = err?.message || 'Error desconocido al iniciar el servidor';
    const isEnvVarMissing = message.includes('Falta variable de entorno obligatoria');

    res.status(500).json({
      error: isEnvVarMissing
        ? 'Configuración incompleta: faltan variables de entorno'
        : 'Error interno del servidor',
      detail: isEnvVarMissing ? message : 'Consulta los logs de Vercel para más detalles.',
      errorMessage: message,
      envStatus,
      hint: 'Revisa las Environment Variables en: https://vercel.com/dashboard',
    });
  });
}

export default app;
