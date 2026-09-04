import { memo } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import type { HeroTile } from './heroSceneData';

/**
 * Capa de elementos flotantes de la escena del HERO.
 *
 * Cada tile es un <motion.div> que lee el progreso de scroll y lo convierte en
 * transformaciones GPU (translate/scale/rotate + translateZ), opacidad y blur.
 * Motion escribe estilos directamente sobre el nodo: NO hay re-renders de
 * React por frame de scroll ni listeners propios.
 *
 * La variante estática (StaticTile) se usa cuando el usuario tiene activado
 * prefers-reduced-motion: collage elegante, sin movimiento.
 */

/** Perfil de opacidad por tile: aparece (fadeIn) y/o se desvanece (fadeOut). */
function opacityKeyframes(def: HeroTile): { input: number[]; output: number[] } {
  const input: number[] = [];
  const output: number[] = [];
  if (def.fadeIn > 0) {
    input.push(0, def.fadeIn);
    output.push(0, 1);
  } else {
    input.push(0);
    output.push(1);
  }
  if (typeof def.fadeOut === 'number') {
    input.push(def.fadeOut, Math.min(0.98, def.fadeOut + 0.16));
    output.push(1, 0);
  }
  return { input, output };
}

function TileVisual({ def }: { def: HeroTile }) {
  const base = {
    left: `${def.left}%`,
    top: `${def.top}%`,
  };

  if (def.variant === 'photo') {
    return (
      <div
        className="hero-tile-photo rounded-[20px] overflow-hidden border bg-white/70 dark:bg-zinc-900/50"
        style={{
          ...base,
          width: def.width,
          aspectRatio: '4 / 3',
          borderColor: 'rgba(255,255,255,0.55)',
          boxShadow: '0 18px 45px -18px rgba(120,60,25,0.4), 0 1px 1px rgba(255,255,255,0.6) inset',
        }}
      >
        <img
          src={def.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (def.variant === 'tag' && def.Icon) {
    const Icon = def.Icon;
    return (
      <div
        className="hero-tile-tag flex items-center justify-center rounded-full border backdrop-blur-md"
        style={{
          ...base,
          width: def.width,
          height: def.width,
          backgroundColor: 'var(--theme-surface-glass)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-brand-primary)',
          boxShadow: '0 10px 24px -12px rgba(120,60,25,0.35)',
        }}
      >
        <Icon style={{ width: def.width * 0.5, height: def.width * 0.5 }} aria-hidden="true" />
      </div>
    );
  }

  // word — chip de frase con punto de acento
  return (
    <div
      className="hero-tile-word flex items-center gap-2 rounded-full border backdrop-blur-md whitespace-nowrap px-4 py-1.5"
      style={{
        ...base,
        backgroundColor: 'var(--theme-surface-glass)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text-secondary)',
        fontSize: def.fs || 13,
        boxShadow: '0 10px 24px -14px rgba(120,60,25,0.35)',
      }}
    >
      <span
        className="inline-block rounded-full shrink-0"
        style={{
          width: 5,
          height: 5,
          background: 'linear-gradient(135deg, var(--theme-brand-primary), #E9A13B)',
        }}
        aria-hidden="true"
      />
      <span className="font-serif italic tracking-wide">{def.label}</span>
    </div>
  );
}

interface MotionTileProps {
  def: HeroTile;
  progress: MotionValue<number>;
}

const MotionTile = memo(function MotionTile({ def, progress }: MotionTileProps) {
  const x = useTransform(progress, [0, 1], [0, def.driftX]);
  const y = useTransform(progress, [0, 0.5, 1], [0, def.driftY * 0.55, def.driftY]);
  const scale = useTransform(progress, [0, 0.45, 1], [def.scaleIn, def.scaleMid, def.scaleOut]);
  const rotate = useTransform(progress, [0, 1], [0, def.rot]);
  const blurAmt = useTransform(progress, [0, 0.45], [def.blurIn, 0]);
  // Motion solo escribe strings CSS con unidad para `filter`: convertimos el
  // número a "blur(npx)" (y "none" cuando ya está enfocado).
  const blur = useTransform(blurAmt, (v) => (v > 0.05 ? `blur(${v.toFixed(1)}px)` : 'none'));
  const op = opacityKeyframes(def);
  const opacity = useTransform(progress, op.input, op.output);

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{
        x,
        y,
        scale,
        rotate,
        z: def.z,
        opacity,
        filter: blur,
        willChange: 'transform, opacity',
      }}
      aria-hidden="true"
    >
      <TileVisual def={def} />
    </motion.div>
  );
});

interface LayerProps {
  tiles: HeroTile[];
  progress: MotionValue<number>;
}

/** Capa dinámica completa (capa de profundidad o capa frontal). */
export const FloatingLayer = memo(function FloatingLayer({ tiles, progress }: LayerProps) {
  return (
    <>
      {tiles.map((def) => (
        <MotionTile key={def.id} def={def} progress={progress} />
      ))}
    </>
  );
});

/** Collage estático para prefers-reduced-motion (sin transformaciones). */
export const StaticCollage = memo(function StaticCollage({ tiles }: { tiles: HeroTile[] }) {
  return (
    <>
      {tiles.map((def, i) => (
        <div
          key={def.id}
          className="absolute pointer-events-none select-none opacity-80"
          style={{
            left: `${def.left}%`,
            top: `${def.top}%`,
            opacity: 0.75 - (i % 3) * 0.12,
            transform: 'scale(0.92)',
          }}
          aria-hidden="true"
        >
          <TileVisual def={def} />
        </div>
      ))}
    </>
  );
});
