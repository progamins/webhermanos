import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limiterBase = {
  windowMs: 60 * 1000,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const forwarded = req.headers['x-forwarded-for'];
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
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
});
