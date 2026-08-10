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

export const adminLimiter = rateLimit({
  ...limiterBase,
  max: parseInt(process.env.ADMIN_RATE_LIMIT || '30', 10),
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