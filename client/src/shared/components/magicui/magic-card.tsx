import { useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react';
import { cn } from '../../lib/utils';

interface MagicCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /**
   * Children to render inside the card.
   */
  children: ReactNode;
  /**
   * Size of the glowing gradient spot.
   * @default 300
   */
  gradientSize?: number;
  /**
   * Color of the glowing gradient spot.
   * @default "var(--color-brand-500)"
   */
  gradientColor?: string;
  /**
   * Opacity of the gradient.
   * @default 0.08
   */
  gradientOpacity?: number;
}

/**
 * A card with a 3D hover tilt effect and a glowing gradient that follows the cursor.
 * Ideal for product cards, testimonial cards, and feature showcases.
 */
export function MagicCard({
  children,
  gradientSize = 300,
  gradientColor = 'var(--color-brand-500)',
  gradientOpacity = 0.08,
  className,
  ...props
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    mouseX.set(x);
    mouseY.set(y);

    // Tilt effect: max ±6 degrees
    const tiltX = ((y - centerY) / centerY) * -6;
    const tiltY = ((x - centerX) / centerX) * 6;
    rotateX.set(tiltX);
    rotateY.set(tiltY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    rotateX.set(0);
    rotateY.set(0);
  };

  const background = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 80%)`;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={cn(
        'group relative overflow-hidden rounded-[24px] border transition-shadow duration-300',
        'hover:shadow-lg hover:shadow-brand-500/10',
        className
      )}
      {...props}
    >
      {/* Glow gradient that follows cursor */}
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background,
          opacity: gradientOpacity,
        }}
        aria-hidden="true"
      />

      {/* Subtle highlight on top */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      {children}
    </motion.div>
  );
}
