import logger from '../lib/logger.js';
import { productService } from './ProductService.js';

// 🔒 SIZE_TIERS y PREMIUM_FILLINGS importados desde la fuente única de verdad
//    en client/src/shared/constants/pricing.ts.
//    NUNCA duplicar estos datos aquí — cualquier cambio debe hacerse en el
//    archivo compartido para mantener cliente y servidor sincronizados.
import { SIZE_TIERS, PREMIUM_FILLINGS } from '../../../client/src/shared/constants/pricing.ts';

// 🔒 Validación de integridad en tiempo de carga: garantiza que ningún
//    modifier de tamaño sea negativo. Si alguien edita SIZE_TIERS en el
//    futuro y pone un modifier negativo por error, el servidor fallará
//    al arrancar con un mensaje claro, evitando que el error llegue a
//    producción.
for (const tier of SIZE_TIERS) {
  if (tier.modifier < 0) {
    throw new Error(
      `[PricingService] ERROR FATAL: SIZE_TIER "${tier.name}" tiene modifier negativo (${tier.modifier}). ` +
      `El tamaño más pequeño (Petit) debe tener modifier 0 (Precio Base). ` +
      `Ningún tamaño puede reducir el precio base.`
    );
  }
}

// 🔒 Validación de integridad en tiempo de carga: ningún relleno puede
//    tener precio negativo.
for (const filling of PREMIUM_FILLINGS) {
  if (filling.price < 0) {
    throw new Error(
      `[PricingService] ERROR FATAL: FILLING "${filling.name}" tiene price negativo (${filling.price}). ` +
      `Los precios de relleno no pueden ser negativos.`
    );
  }
}


// ─── Helpers ───

/**
 * Busca un tier de tamaño por nombre (coincidencia por nombre completo).
 * El cliente envía size = `${size.name} (${size.diameter})`,
 * así que buscamos si sizeName incluye el nombre completo del tier.
 */
function findSizeModifier(sizeName: string): number | null {
  for (const tier of SIZE_TIERS) {
    if (sizeName.includes(tier.name)) {
      return tier.modifier;
    }
  }
  return null;
}

/**
 * Busca el precio de un relleno por nombre (coincidencia por nombre completo).
 * El cliente envía flavor = `${flavor} con relleno de ${filling.name}`,
 * así que buscamos si flavor incluye el nombre completo del relleno.
 */
function findFillingPrice(flavorText: string): number | null {
  for (const filling of PREMIUM_FILLINGS) {
    if (flavorText.includes(filling.name)) {
      return filling.price;
    }
  }
  return null;
}

// ─── API pública ───

export interface PriceCalculationInput {
  /** ID del producto en BD */
  productId?: string;
  /** Precio base del producto (si no se pasa, se busca por productId) */
  basePrice?: number;
  /** Nombre del tamaño seleccionado */
  size: string;
  /** Texto del sabor + relleno (ej: "Chocolate con relleno de Manjarblanco...") */
  flavor: string;
  /** Modificador de precio enviado explícitamente por el cliente */
  sizeModifier?: number;
  /** Precio del relleno enviado explícitamente por el cliente */
  fillingPrice?: number;
}

export interface PriceCalculationResult {
  /** Precio final calculado */
  totalPrice: number;
  /** Precio base usado */
  basePrice: number;
  /** Modificador de tamaño aplicado */
  sizeModifier: number;
  /** Precio de relleno aplicado */
  fillingPrice: number;
  /** Cómo se obtuvo el precio */
  source: 'client' | 'server_calculated' | 'server_fallback';
}

/**
 * Calcula el precio final autoritario de un pedido.
 * Siempre devuelve el precio calculado por el servidor.
 *
 * Orden de precedencia:
 * 1. Si el cliente envió sizeModifier y fillingPrice explícitos, se usan.
 * 2. Si no, se intenta buscar por nombre del tamaño/relleno.
 * 3. Si no se encuentra, se usa 0 (sin recargo).
 *
 * 🔒 REGLA DE ORO PARA PRECIOS:
 *    - sizeModifier NUNCA puede ser negativo. El tamaño más chico (Petit)
 *      es el Precio Base (modifier: 0). El precio nunca debe bajar del base.
 *    - fillingPrice NUNCA puede ser negativo.
 *    - El servidor SIEMPRE tiene la última palabra sobre el precio final.
 */
export async function calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
  let basePrice = input.basePrice ?? 0;

  // Si no tenemos basePrice, intentar obtenerlo del producto en BD
  if (basePrice <= 0 && input.productId) {
    try {
      const product = await productService.getById(input.productId);
      if (product && product.basePrice > 0) {
        basePrice = product.basePrice;
      }
    } catch (err) {
      logger.warn('PricingService: error al obtener producto', {
        service: 'Pricing',
        productId: input.productId,
        error: (err as Error)?.message,
      });
    }
  }

  let sizeModifier = 0;
  let fillingPrice = 0;
  let source: PriceCalculationResult['source'] = 'server_fallback';

  // 1. Usar valores explícitos del cliente si están presentes
  if (input.sizeModifier !== undefined && input.fillingPrice !== undefined) {
    sizeModifier = input.sizeModifier;
    fillingPrice = input.fillingPrice;
    source = 'client';

    // 🔒 VALIDACIÓN ESTRICTA: Ningún modifier de tamaño puede ser negativo.
    //    Históricamente hubo un error donde Petit tenía modifier: -15, lo que
    //    hacía que el precio base se redujera. El tamaño más pequeño SIEMPRE
    //    debe ser el Precio Base (modifier: 0). Cualquier valor negativo es
    //    automáticamente inválido y se recalcula desde el servidor.
    if (sizeModifier < 0 || sizeModifier > 200) {
      logger.warn('PricingService: sizeModifier inválido o sospechoso, recalculando', {
        service: 'Pricing',
        sent: sizeModifier,
        reason: sizeModifier < 0 ? 'negativo' : 'excede_límite',
      });
      sizeModifier = findSizeModifier(input.size) ?? 0;
      source = 'server_calculated';
    }
    if (fillingPrice < 0 || fillingPrice > 50) {
      logger.warn('PricingService: fillingPrice sospechoso, recalculando', {
        service: 'Pricing',
        sent: fillingPrice,
      });
      fillingPrice = findFillingPrice(input.flavor) ?? 0;
      source = 'server_calculated';
    }
  } else {
    // 2. Intentar buscar por nombre
    sizeModifier = findSizeModifier(input.size) ?? 0;
    fillingPrice = findFillingPrice(input.flavor) ?? 0;
    source = 'server_calculated';
  }

  // 🔒 El precio NUNCA puede ser menor al precio base del producto.
  //    Ningún tamaño o relleno debería reducir el precio; solo lo incrementan.
  const totalPrice = Math.max(basePrice, basePrice + sizeModifier + fillingPrice);

  return {
    totalPrice,
    basePrice,
    sizeModifier,
    fillingPrice,
    source,
  };
}
