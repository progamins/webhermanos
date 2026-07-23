import { useRef, useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface MarqueeProps {
  /**
   * Children to render in the marquee. Should be an array of items.
   */
  children: ReactNode[];
  /**
   * Direction of the marquee scroll.
   * @default "left"
   */
  direction?: 'left' | 'right' | 'up' | 'down';
  /**
   * Whether to pause the marquee on hover.
   * @default true
   */
  pauseOnHover?: boolean;
  /**
   * Whether to reverse the direction.
   * @default false
   */
  reverse?: boolean;
  /**
   * Whether to fade the edges of the marquee.
   * @default false
   */
  fadeEdges?: boolean;
  /**
   * Additional class name for the outer container.
   */
  className?: string;
  /**
   * Additional class name for the inner track.
   */
  innerClassName?: string;
  /**
   * Speed multiplier. Higher = faster.
   * @default 1
   */
  speed?: number;
  /**
   * Gap between items in pixels.
   * @default 40
   */
  gap?: number;
  /**
   * Number of times to duplicate children for seamless scrolling.
   * @default 2
   */
  duplicateCount?: number;
}

/**
 * An infinite scrolling marquee component.
 * Ideal for testimonials reviews, logos, or any horizontal/vertical scrolling content.
 */
export function Marquee({
  children,
  direction = 'left',
  pauseOnHover = true,
  reverse = false,
  fadeEdges = false,
  className,
  innerClassName,
  speed = 1,
  gap = 40,
  duplicateCount = 2,
}: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(20);

  useEffect(() => {
    if (!containerRef.current || children.length === 0) return;
    const scrollWidth = containerRef.current.scrollWidth;
    const viewportWidth = containerRef.current.parentElement?.clientWidth ?? 800;
    // Calculate duration based on content width and speed
    const baseDuration = (scrollWidth / viewportWidth) * 15;
    setDuration(Math.max(10, baseDuration / speed));
  }, [children, speed]);

  if (!children || children.length === 0) return null;

  const isHorizontal = direction === 'left' || direction === 'right';
  const actualDirection = reverse
    ? direction === 'left'
      ? 'right'
      : direction === 'right'
        ? 'left'
        : direction === 'up'
          ? 'down'
          : 'up'
    : direction;

  return (
    <div
      className={cn(
        'relative flex overflow-hidden',
        fadeEdges &&
          'before:absolute before:inset-y-0 before:left-0 before:w-20 before:z-10 before:bg-gradient-to-r before:from-[var(--theme-bg)] before:to-transparent after:absolute after:inset-y-0 after:right-0 after:w-20 after:z-10 after:bg-gradient-to-l after:from-[var(--theme-bg)] after:to-transparent',
        isHorizontal ? 'flex-row' : 'flex-col',
        className
      )}
      style={{ maskImage: fadeEdges ? undefined : undefined }}
    >
      <div
        ref={containerRef}
        className={cn(
          'flex shrink-0 will-change-transform',
          isHorizontal ? 'flex-row' : 'flex-col',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
          innerClassName
        )}
        style={{
          gap: `${gap}px`,
          animation: `marquee-${actualDirection} ${duration}s linear infinite`,
        }}
      >
        {Array.from({ length: duplicateCount }).flatMap((_, idx) =>
          children.map((child, childIdx) => (
            <div key={`${idx}-${childIdx}`} className="shrink-0">
              {child}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Keyframes are injected once via a style tag
const keyframesId = 'marquee-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(keyframesId)) return;

  const style = document.createElement('style');
  style.id = keyframesId;
  style.textContent = `
    @keyframes marquee-left {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    @keyframes marquee-right {
      from { transform: translateX(-50%); }
      to { transform: translateX(0); }
    }
    @keyframes marquee-up {
      from { transform: translateY(0); }
      to { transform: translateY(-50%); }
    }
    @keyframes marquee-down {
      from { transform: translateY(-50%); }
      to { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// Inject keyframes on module load (client-side only)
if (typeof window !== 'undefined') {
  injectKeyframes();
}
