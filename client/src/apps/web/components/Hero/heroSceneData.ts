import type { LucideIcon } from 'lucide-react';
import { Candy, Heart, CakeSlice } from 'lucide-react';

/**
 * Datos de la escena del HERO ("entrar en el mundo de Maison Rosas").
 *
 * Cada tile es un elemento decorativo que vive en una capa de profundidad:
 *  - empieza "lejos" (escala menor + blur + translateZ negativo),
 *  - con el scroll se acerca, gira y se desplaza siguiendo su propia
 *    dirección (drift), como si el usuario atravesara la vitrina,
 *  - algunos se desvanecen al final del recorrido (pasan de largo),
 *    otros salen del encuadre (la capa del escenario los recorta).
 *
 * Las fotos son las MISMAS del catálogo real del proyecto (Unsplash del
 * seed). Los textos son frases de marca pedidas para la experiencia, no
 * contenido comercial inventado (sin precios ni promesas).
 */

export type TileVariant = 'photo' | 'word' | 'tag';

export interface HeroTile {
  id: string;
  variant: TileVariant;
  /** Anclaje en % del escenario (izquierda / arriba). */
  left: number;
  top: number;
  /** Ancho base en px del tile (fotos e iconos). Los textos miden su contenido. */
  width: number;
  /** Profundidad inicial: translateZ negativo = lejos. 0 = plano frontal. */
  z: number;
  /** Desplazamiento (px) al recorrer el scroll. Firma propia por tile. */
  driftX: number;
  driftY: number;
  /** Escala en p = 0, p = 0.45 (acercamiento) y p = 1. */
  scaleIn: number;
  scaleMid: number;
  scaleOut: number;
  /** Desenfoque inicial (px) que se limpia al acercarse. */
  blurIn: number;
  /** Punto del progreso donde termina de aparecer (0 = ya visible). */
  fadeIn: number;
  /** Si existe: el tile se desvanece al final (0.6–0.9) en vez de salir cortado. */
  fadeOut?: number;
  /** Rotación final (grados). */
  rot: number;
  /** Fuente (px) para textos. */
  fs?: number;
  src?: string;
  label?: string;
  Icon?: LucideIcon;
}

const img = (photoId: string, w: number) =>
  `https://images.unsplash.com/${photoId}?w=${w}&auto=format&fit=crop&q=70`;

/** Fotos reales del catálogo (seed del proyecto). */
export const KEKE_PHOTOS = {
  chocolate: img('photo-1578985545062-69928b1d9587', 420),
  vainilla: img('photo-1606890737304-57a1ca8a5b62', 420),
  platano: img('photo-1596040033229-a9821ebd058d', 420),
  maracuya: img('photo-1565958011703-44f9829ba187', 420),
  lucuma: img('photo-1464349095431-e9a21285b5f3', 420),
  zanahoria: img('photo-1586788680434-30d324b2d46f', 420),
} as const;

export interface TileSet {
  depth: HeroTile[];
  front: HeroTile[];
}

const WORD = (
  id: string,
  label: string,
  left: number,
  top: number,
  p: Partial<HeroTile> = {}
): HeroTile => ({
  id,
  variant: 'word',
  label,
  left,
  top,
  width: 0,
  z: -140,
  driftX: 0,
  driftY: 0,
  scaleIn: 0.74,
  scaleMid: 1,
  scaleOut: 1.08,
  blurIn: 1.5,
  fadeIn: 0.06,
  fadeOut: 0.86,
  rot: 0,
  fs: 13,
  ...p,
});

const TAG = (
  id: string,
  Icon: LucideIcon,
  left: number,
  top: number,
  width: number,
  p: Partial<HeroTile> = {}
): HeroTile => ({
  id,
  variant: 'tag',
  Icon,
  left,
  top,
  width,
  z: -80,
  driftX: 0,
  driftY: 0,
  scaleIn: 0.6,
  scaleMid: 1,
  scaleOut: 1.15,
  blurIn: 0,
  fadeIn: 0.08,
  fadeOut: 0.9,
  rot: 0,
  ...p,
});

const PHOTO = (
  id: string,
  src: string,
  left: number,
  top: number,
  width: number,
  p: Partial<HeroTile> = {}
): HeroTile => ({
  id,
  variant: 'photo',
  src,
  left,
  top,
  width,
  z: -520,
  driftX: 0,
  driftY: 0,
  scaleIn: 0.6,
  scaleMid: 0.96,
  scaleOut: 1.28,
  blurIn: 4,
  fadeIn: 0,
  rot: 0,
  ...p,
});

/**
 * Desktop (>= 768px): vitrina amplia alrededor del contenido central.
 * 14 tiles: 5 fotos, 5 frases, 2 iconos en profundidad + 2 piezas que
 * cruzan POR DELANTE del contenido (pointer-events: none).
 */
const DESKTOP_SET: TileSet = {
  depth: [
    PHOTO('p-choco', KEKE_PHOTOS.chocolate, 5, 12, 190, { z: -560, driftX: -130, driftY: -45, scaleIn: 0.62, scaleMid: 0.97, scaleOut: 1.26, blurIn: 5, rot: 3, fadeOut: 0.9 }),
    PHOTO('p-vainilla', KEKE_PHOTOS.vainilla, 84, 10, 170, { z: -480, driftX: 150, driftY: -30, scaleIn: 0.66, scaleMid: 0.99, scaleOut: 1.24, blurIn: 4, rot: -3, fadeOut: 0.92 }),
    PHOTO('p-maracuya', KEKE_PHOTOS.maracuya, 6, 68, 175, { z: -520, driftX: -160, driftY: 55, scaleIn: 0.6, scaleMid: 0.96, scaleOut: 1.3, blurIn: 5, rot: 4, fadeIn: 0.04, fadeOut: 0.9 }),
    PHOTO('p-lucuma', KEKE_PHOTOS.lucuma, 86, 66, 185, { z: -600, driftX: 175, driftY: 70, scaleIn: 0.58, scaleMid: 0.94, scaleOut: 1.32, blurIn: 6, rot: -2, fadeIn: 0.05, fadeOut: 0.88 }),
    PHOTO('p-platano', KEKE_PHOTOS.platano, 43, 84, 150, { z: -380, driftX: -60, driftY: 130, scaleIn: 0.68, scaleMid: 1.0, scaleOut: 1.14, blurIn: 3, rot: 2, fadeOut: 0.82 }),
    WORD('w-amor', 'Hecho con amor', 75, 34, { driftX: 165, driftY: -25, scaleIn: 0.72, scaleMid: 1.0, scaleOut: 1.12, blurIn: 2, fadeIn: 0.07, fadeOut: 0.85, rot: 2 }),
    WORD('w-sabor', 'Sabor que se recuerda', 10, 40, { driftX: -150, driftY: 15, scaleIn: 0.74, scaleMid: 1.0, scaleOut: 1.1, blurIn: 2, fadeIn: 0.1, fadeOut: 0.84, rot: -2 }),
    WORD('w-momentos', 'Momentos dulces', 13, 78, { driftX: -110, driftY: 100, scaleIn: 0.7, scaleMid: 0.97, scaleOut: 1.06, blurIn: 2.5, fadeIn: 0.12, fadeOut: 0.9, rot: -3 }),
    WORD('w-pedidos', 'Pedidos especiales', 74, 84, { driftX: 90, driftY: 115, scaleIn: 0.68, scaleMid: 0.96, scaleOut: 1.05, blurIn: 2, fadeIn: 0.08, fadeOut: 0.85, rot: 2, fs: 12 }),
    TAG('t-heart', Heart, 6, 28, 44, { driftX: -85, driftY: -70, scaleIn: 0.62, scaleMid: 0.98, scaleOut: 1.18, rot: 8, fadeIn: 0.05 }),
    TAG('t-candy', Candy, 92, 48, 40, { driftX: 95, driftY: 45, scaleIn: 0.66, scaleMid: 1.0, scaleOut: 1.2, rot: -10, fadeIn: 0.09 }),
    TAG('t-cake', CakeSlice, 40, 12, 42, { driftX: -60, driftY: 140, scaleIn: 0.7, scaleMid: 1.02, scaleOut: 1.16, rot: 14, fadeIn: 0.04, fadeOut: 0.8 }),
  ],
  front: [
    // Cruza por delante: esquina superior derecha → centro izquierda, diluyéndose.
    PHOTO('f-vainilla', KEKE_PHOTOS.zanahoria, 84, 16, 150, { z: 0, driftX: -600, driftY: 120, scaleIn: 0.42, scaleMid: 1.35, scaleOut: 1.6, blurIn: 2, fadeIn: 0.16, fadeOut: 0.62, rot: -8 }),
    // Frase que atraviesa la parte baja y se evapora.
    WORD('f-amor', 'Hecho con amor', 8, 84, { z: 0, driftX: 620, driftY: -70, scaleIn: 0.6, scaleMid: 1.25, scaleOut: 1.5, blurIn: 0, fadeIn: 0.2, fadeOut: 0.58, rot: 3, fs: 12 }),
  ],
};

/**
 * Mobile (< 768px): solo 6 tiles en las esquinas/bandas, dejando el centro
 * libre para título y CTAs. Menos recorrido y profundidad moderada.
 */
const MOBILE_SET: TileSet = {
  depth: [
    PHOTO('p-choco', KEKE_PHOTOS.chocolate, 3, 6, 104, { z: -300, driftX: -70, driftY: -40, scaleIn: 0.78, scaleMid: 1.02, scaleOut: 1.2, blurIn: 3, rot: 2, fadeOut: 0.86 }),
    PHOTO('p-lucuma', KEKE_PHOTOS.lucuma, 76, 8, 96, { z: -280, driftX: 85, driftY: -35, scaleIn: 0.8, scaleMid: 1.03, scaleOut: 1.22, blurIn: 3, rot: -2, fadeIn: 0.04, fadeOut: 0.88 }),
    PHOTO('p-maracuya', KEKE_PHOTOS.maracuya, 3, 72, 92, { z: -260, driftX: -80, driftY: 90, scaleIn: 0.8, scaleMid: 1.0, scaleOut: 1.16, blurIn: 3, rot: 3, fadeIn: 0.06, fadeOut: 0.82 }),
    WORD('w-amor', 'Hecho con amor', 56, 82, { z: -120, driftX: 130, driftY: 80, scaleIn: 0.8, scaleMid: 1.02, scaleOut: 1.18, blurIn: 1, fadeIn: 0.1, fadeOut: 0.8, rot: 2, fs: 11 }),
    WORD('w-momentos', 'Momentos dulces', 62, 38, { z: -90, driftX: 160, driftY: -20, scaleIn: 0.82, scaleMid: 1.04, scaleOut: 1.2, blurIn: 1, fadeIn: 0.14, fadeOut: 0.72, rot: -2, fs: 10 }),
    TAG('t-candy', Candy, 6, 32, 34, { z: -60, driftX: -110, driftY: -60, scaleIn: 0.75, scaleMid: 1.05, scaleOut: 1.25, rot: -12, fadeIn: 0.12, fadeOut: 0.8 }),
  ],
  front: [],
};

/**
 * Escalones responsive de la escena:
 *  - mobile (< 768): 6 piezas sutiles (MOBILE_SET).
 *  - tablet (768–1100): 8 piezas (fotos + frases), sin capa frontal.
 *  - desktop (> 1100): vitrina completa (14 piezas + cruces frontales).
 */
export function getTileSet(isMobile: boolean, isCompact = false): TileSet {
  if (isMobile) return MOBILE_SET;
  if (isCompact) {
    return { depth: DESKTOP_SET.depth.slice(0, 8), front: [] };
  }
  return DESKTOP_SET;
}

// Para el collage estático (prefers-reduced-motion): menos piezas y sutiles.
export function getStaticTiles(isMobile: boolean): HeroTile[] {
  const tiles = getTileSet(isMobile).depth;
  return tiles.filter((t) => t.variant === 'photo' || t.variant === 'word').slice(0, 6);
}
