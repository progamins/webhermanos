import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useReducedMotion } from '../../hooks';

interface SparklesTextProps {
  /**
   * Text content or React nodes to render.
   */
  children: ReactNode;
  /**
   * Additional class name.
   */
  className?: string;
  /**
   * Color of the sparkles.
   * @default ["#D4A373", "#C4847D", "#F0C9C2"]
   */
  sparkleColors?: string[];
  /**
   * Number of sparkles.
   * @default 8
   */
  sparkleCount?: number;
  /**
   * Whether the sparkles are animated.
   * @default true
   */
  animate?: boolean;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

/**
 * Text with floating sparkle particles around it.
 * Perfect for emphasized headings, special titles, and badges.
 */
export function SparklesText({
  children,
  className,
  sparkleColors = ['#D4A373', '#C4847D', '#F0C9C2', '#E4AAA0', '#D48D82'],
  sparkleCount = 8,
  animate = true,
}: SparklesTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (reducedMotion || !animate) return;

    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < sparkleCount; i++) {
      newSparkles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
        delay: Math.random() * 3,
        duration: 1.5 + Math.random() * 2,
      });
    }
    setSparkles(newSparkles);

    // Regenerate sparkles periodically for continuous effect
    const interval = setInterval(() => {
      setSparkles((prev) =>
        prev.map((s) => ({
          ...s,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 1.5 + Math.random() * 2.5,
          color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
          delay: 0,
          duration: 1.5 + Math.random() * 2,
        }))
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [sparkleCount, sparkleColors, reducedMotion, animate]);

  if (reducedMotion || !animate) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span ref={containerRef} className={cn('relative inline-flex items-center', className)}>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="absolute pointer-events-none"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: sparkle.color,
            borderRadius: '50%',
            opacity: 0,
            animation: animate
              ? `sparkle-fade ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite`
              : undefined,
            boxShadow: `0 0 ${sparkle.size * 3}px ${sparkle.color}`,
          }}
          aria-hidden="true"
        />
      ))}
      {children}
    </span>
  );
}

// Inject sparkle keyframes
const sparkleKeyframesId = 'sparkles-keyframes';

function injectSparkleKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(sparkleKeyframesId)) return;

  const style = document.createElement('style');
  style.id = sparkleKeyframesId;
  style.textContent = `
    @keyframes sparkle-fade {
      0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
      20% { opacity: 0.8; transform: scale(1) translateY(-4px); }
      40% { opacity: 0.4; transform: scale(0.6) translateY(-2px); }
      60% { opacity: 0.9; transform: scale(1.1) translateY(-6px); }
      80% { opacity: 0.3; transform: scale(0.5) translateY(-1px); }
    }
  `;
  document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
  injectSparkleKeyframes();
}
