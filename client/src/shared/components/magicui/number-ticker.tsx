import { useRef, useEffect, useState, type CSSProperties } from 'react';
import { useInView } from 'motion/react';
import { cn } from '../../lib/utils';

interface NumberTickerProps {
  /**
   * Optional inline styles.
   */
  style?: CSSProperties;
  /**
   * The target number to count up to.
   */
  value: number;
  /**
   * Optional suffix to append (e.g., "%", "+", "K").
   */
  suffix?: string;
  /**
   * Optional prefix to prepend (e.g., "$", "S/.").
   */
  prefix?: string;
  /**
   * Number of decimal places.
   * @default 0
   */
  decimals?: number;
  /**
   * Duration of the animation in seconds.
   * @default 2
   */
  duration?: number;
  /**
   * Delay before starting the animation in seconds.
   * @default 0
   */
  delay?: number;
  /**
   * Direction of the count (up or down).
   * @default "up"
   */
  direction?: 'up' | 'down';
  /**
   * Additional class names.
   */
  className?: string;
  /**
   * Easing function for the animation.
   */
  easing?: (t: number) => number;
}

/**
 * An animated number counter that counts up (or down) when scrolled into view.
 */
export function NumberTicker({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 2,
  delay = 0,
  direction = 'up',
  className,
  style,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' });
  const [displayValue, setDisplayValue] = useState(direction === 'up' ? 0 : value);

  useEffect(() => {
    if (!isInView) return;

    const startValue = direction === 'up' ? 0 : value;
    const endValue = direction === 'up' ? value : 0;
    const startTime = Date.now() + delay * 1000;
    const totalDiff = endValue - startValue;

    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      if (now < startTime) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + totalDiff * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, value, duration, delay, direction]);

  const formatValue = (val: number) => {
    return val.toFixed(decimals);
  };

  return (
    <span
      ref={ref}
      className={cn('tabular-nums', className)}
      style={style}
      aria-label={`${prefix}${value.toLocaleString()}${suffix}`}
    >
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}
