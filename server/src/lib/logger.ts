/**
 * Logger estructurado — Winston
 *
 * Proporciona logging con niveles, timestamps y formato consistente.
 * Reemplaza todos los console.log / console.warn / console.error del servidor.
 *
 * Niveles: error, warn, info, debug
 * En producción solo se muestra info y superior.
 */

import winston from 'winston';
import { env } from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
      const serviceTag = service ? `[${service}]` : '';
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level.toUpperCase().padEnd(7)} ${serviceTag} ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: isProduction ? false : true }),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const serviceTag = service ? `[${service}]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level} ${serviceTag} ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

// En producción se puede agregar transporte a archivo
if (isProduction) {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5 * 1024 * 1024,
    maxFiles: 5,
  }));
}

export default logger;
