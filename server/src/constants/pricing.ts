/**
 * 🔒 CONSTANTES DE PRECIOS — Copia local para el servidor
 * =======================================================
 *
 * NOTA: Este archivo es una copia de client/src/shared/constants/pricing.ts.
 * La importación cruzada entre workspaces (client/ → server/) no funciona
 * en Vercel serverless (nft no sigue rutas ../../../client/).
 *
 * Si modificas los precios, actualiza AMBOS archivos:
 *   - client/src/shared/constants/pricing.ts
 *   - server/src/constants/pricing.ts
 *
 * REGLA DE ORO:
 *   - sizeModifier NUNCA puede ser negativo. Keke Pequeño (el más chico) SIEMPRE
 *     tiene modifier: 0 (Precio Base). El precio nunca debe bajar del base.
 *   - fillingPrice NUNCA puede ser negativo.
 */

export interface SizeTier {
  name: string;
  modifier: number;
  label: string;
  diameter: string;
  tiers: number;
  height: string;
}

export const SIZE_TIERS: readonly SizeTier[] = [
  { name: 'Keke Pequeño (8-10 porciones)', modifier: 0, label: 'Precio Base', diameter: '18 cm', tiers: 1, height: 'Extra Alto (10cm)' },
  { name: 'Keke Mediano (12-15 porciones)', modifier: 15, label: 'S/. +15', diameter: '22 cm', tiers: 1, height: 'Estándar (10cm)' },
  { name: 'Keke Familiar (20-25 porciones)', modifier: 30, label: 'S/. +30', diameter: '26 cm', tiers: 1, height: 'Alto (12cm)' },
  { name: 'Keke Grande (35+ porciones)', modifier: 50, label: 'S/. +50', diameter: '30 cm', tiers: 1, height: 'Extra Alto (12cm)' },
] as const;

export interface PremiumFilling {
  name: string;
  price: number;
  desc: string;
}

export const PREMIUM_FILLINGS: readonly PremiumFilling[] = [
  { name: 'Manjarblanco Artesanal de Olla (Tradicional)', price: 0, desc: 'Leche caramelizada por horas a fuego lento.' },
  { name: 'Fudge de Cacao Belga al 70% (Premium)', price: 10, desc: 'Ganache espeso e intenso de chocolate gourmet.' },
  { name: 'Jalea Artesanal de Frutos del Bosque (Premium)', price: 12, desc: 'Reducción de fresas, frambuesas y arándanos frescos.' },
  { name: 'Crema de Lúcuma Premium Sullana (Especial)', price: 15, desc: 'Mousse concentrado de lúcuma selecta de la región.' },
  { name: 'Crema Sabor Nutella & Avellanas (Gourmet)', price: 15, desc: 'Crema untuosa de avellanas con chocolate crujiente.' },
] as const;
