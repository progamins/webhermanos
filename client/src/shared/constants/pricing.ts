/**
 * 🔒 CONSTANTES DE PRECIOS — FUENTE ÚNICA DE VERDAD
 * =================================================
 *
 * Este archivo es la ÚNICA fuente de verdad para tamaños y rellenos.
 * Tanto el cliente (Customizer.tsx) como el servidor (PricingService.ts)
 * IMPORTAN desde aquí. NUNCA duplicar estos datos en otro archivo.
 *
 * Cómo importar:
 *   - Cliente: import { SIZE_TIERS, PREMIUM_FILLINGS } from '@/constants/pricing'
 *   - Servidor: import { SIZE_TIERS, PREMIUM_FILLINGS } from '../../../client/src/shared/constants/pricing'
 *
 * REGLA DE ORO:
 *   - sizeModifier NUNCA puede ser negativo. Keke Pequeño (el más chico) SIEMPRE
 *     tiene modifier: 0 (Precio Base). El precio nunca debe bajar del base.
 *   - fillingPrice NUNCA puede ser negativo.
 */

// ─── Size Tiers ───

export interface SizeTier {
  /** Nombre visible del tamaño (ej: "Petit (12-15 Porciones)") */
  name: string;
  /** Modificador de precio que se suma al basePrice. NUNCA negativo */
  modifier: number;
  /** Etiqueta corta para mostrar en la UI (ej: "Precio Base", "S/. +25") */
  label: string;
  /** Diámetro del molde (solo cliente, no usado por PricingService) */
  diameter: string;
  /** Número de pisos (solo cliente) */
  tiers: number;
  /** Descripción de la altura (solo cliente) */
  height: string;
}

export const SIZE_TIERS: readonly SizeTier[] = [
  // ⚠️ REGLA: sizeModifier NUNCA negativo. Keke Pequeño = Precio Base (modifier: 0).
  { name: 'Keke Pequeño (8-10 porciones)', modifier: 0, label: 'Precio Base', diameter: '18 cm', tiers: 1, height: 'Extra Alto (10cm)' },
  { name: 'Keke Mediano (12-15 porciones)', modifier: 15, label: 'S/. +15', diameter: '22 cm', tiers: 1, height: 'Estándar (10cm)' },
  { name: 'Keke Familiar (20-25 porciones)', modifier: 30, label: 'S/. +30', diameter: '26 cm', tiers: 1, height: 'Alto (12cm)' },
  { name: 'Keke Grande (35+ porciones)', modifier: 50, label: 'S/. +50', diameter: '30 cm', tiers: 1, height: 'Extra Alto (12cm)' },
] as const;

// ─── Fillings ───

export interface PremiumFilling {
  /** Nombre visible del relleno */
  name: string;
  /** Precio adicional. NUNCA negativo. 0 = incluido en el precio base */
  price: number;
  /** Descripción del relleno (solo cliente) */
  desc: string;
}

export const PREMIUM_FILLINGS: readonly PremiumFilling[] = [
  // ⚠️ REGLA: fillingPrice NUNCA negativo. 0 = incluido en precio base.
  { name: 'Manjarblanco Artesanal de Olla (Tradicional)', price: 0, desc: 'Leche caramelizada por horas a fuego lento.' },
  { name: 'Fudge de Cacao Belga al 70% (Premium)', price: 10, desc: 'Ganache espeso e intenso de chocolate gourmet.' },
  { name: 'Jalea Artesanal de Frutos del Bosque (Premium)', price: 12, desc: 'Reducción de fresas, frambuesas y arándanos frescos.' },
  { name: 'Crema de Lúcuma Premium Sullana (Especial)', price: 15, desc: 'Mousse concentrado de lúcuma selecta de la región.' },
  { name: 'Crema Sabor Nutella & Avellanas (Gourmet)', price: 15, desc: 'Crema untuosa de avellanas con chocolate crujiente.' },
] as const;
