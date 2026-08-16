import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return ipKeyGenerator(forwarded || req.ip || '127.0.0.1');
  },
});

const limiterBase = {
  windowMs: 60 * 1000,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any, _res: any) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return ipKeyGenerator(forwarded || req.ip || '127.0.0.1');
  },
};

export const apiLimiter = rateLimit({
  ...limiterBase,
  max: parseInt(process.env.API_RATE_LIMIT || '60', 10),
});

// Panel admin: hace ~8 requests al montar (products, orders, stock, kitchen,
// activity…) + polling de cocina cada 10s + actualizaciones de estado.
// 30 req/min por IP era insuficiente y provocaba 429 en uso normal.
// 300 req/min sigue acotado contra abuso y el admin ya está protegido por
// token de sesión y (en producción) filtros de IP/MAC.
export const adminLimiter = rateLimit({
  ...limiterBase,
  max: parseInt(process.env.ADMIN_RATE_LIMIT || '300', 10),
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Demasiados mensajes de contacto. Intenta de nuevo en una hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return ipKeyGenerator(forwarded || req.ip || '127.0.0.1');
  },
});

// 🔒 OTP específico — evita brute force de códigos de verificación.
//    Envío: 5 por hora por IP. Verificación: 10 intentos por 15 min.
export const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Demasiados envíos de código. Intenta de nuevo en una hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return ipKeyGenerator(forwarded || req.ip || '127.0.0.1');
  },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Demasiados intentos de verificación. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return ipKeyGenerator(forwarded || req.ip || '127.0.0.1');
  },
});

// 🔒 Image proxy — limita el uso del proxy de imágenes por IP para
//    evitar que se convierta en un open-proxy (abuso, costos de ancho de banda).
export const proxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, error: 'Demasiadas imágenes a través del proxy. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    return ipKeyGenerator(forwarded || req.ip || '127.0.0.1');
  },
});

// 🔍 Diagnóstico de rate limit (GET /api/rate-limit) — limitador propio y
//    generoso para que el endpoint siga siendo alcanzable justo cuando los
//    demás limitadores están bloqueando (que es cuando más se necesita).
export const diagLimiter = rateLimit({
  ...limiterBase,
  max: parseInt(process.env.DIAG_RATE_LIMIT || '60', 10),
});

// ═══════════════════════════════════════════════════════════════════════
// 🔎 Diagnóstico: contadores actuales del solicitante en cada limitador.
//
// Solo expone los contadores de la IP que hace la petición (nunca los de
// otros usuarios). El handler de express-rate-limit expone `getKey(ip)`,
// que devuelve { totalHits, resetTime } para esa clave.
// ═══════════════════════════════════════════════════════════════════════
interface RateLimiterDescriptor {
  name: string;
  description: string;
  limiter: import('express-rate-limit').RateLimitRequestHandler;
  max: number;
  windowMs: number;
}

export const RATE_LIMITERS: RateLimiterDescriptor[] = [
  {
    name: 'api',
    description: 'API pública (/api/*)',
    limiter: apiLimiter,
    max: parseInt(process.env.API_RATE_LIMIT || '60', 10),
    windowMs: 60 * 1000,
  },
  {
    name: 'admin',
    description: 'Panel admin (/api/admin/*)',
    limiter: adminLimiter,
    max: parseInt(process.env.ADMIN_RATE_LIMIT || '300', 10),
    windowMs: 60 * 1000,
  },
  {
    name: 'proxy',
    description: 'Proxy de imágenes (/api/image-proxy)',
    limiter: proxyLimiter,
    max: 120,
    windowMs: 60 * 1000,
  },
  {
    name: 'contact',
    description: 'Formulario de contacto',
    limiter: contactLimiter,
    max: 3,
    windowMs: 60 * 60 * 1000,
  },
  {
    name: 'otpSend',
    description: 'Envío de códigos OTP',
    limiter: otpSendLimiter,
    max: 5,
    windowMs: 60 * 60 * 1000,
  },
  {
    name: 'otpVerify',
    description: 'Verificación de códigos OTP',
    limiter: otpVerifyLimiter,
    max: 10,
    windowMs: 15 * 60 * 1000,
  },
  {
    name: 'login',
    description: 'Inicio de sesión admin',
    limiter: loginLimiter,
    max: 10,
    windowMs: 15 * 60 * 1000,
  },
  {
    name: 'diag',
    description: 'Endpoint de diagnóstico (/api/rate-limit)',
    limiter: diagLimiter,
    max: parseInt(process.env.DIAG_RATE_LIMIT || '60', 10),
    windowMs: 60 * 1000,
  },
];

/**
 * Devuelve el estado de uso de todos los limitadores para una IP.
 * (Solo consulta, no incrementa ningún contador.)
 */
export async function getRateLimitUsage(ip: string) {
  const limiters = await Promise.all(
    RATE_LIMITERS.map(async (l) => {
      let usage: { totalHits: number; resetTime: Date | undefined } | undefined;
      try {
        usage = await l.limiter.getKey(ip);
      } catch {
        /* store no disponible */
      }
      const totalHits = usage?.totalHits ?? 0;
      const resetTime = usage?.resetTime;
      return {
        name: l.name,
        description: l.description,
        windowMs: l.windowMs,
        max: l.max,
        totalHits,
        remaining: Math.max(0, l.max - totalHits),
        limited: totalHits >= l.max,
        resetTime: resetTime ? resetTime.toISOString() : null,
        resetInMs: resetTime ? Math.max(0, resetTime.getTime() - Date.now()) : 0,
      };
    })
  );
  return limiters;
}