import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedShinyTextProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Whether the animation is shimmering.
   * @default true
   */
  shimmer?: boolean;
  /**
   * Children of the component.
   */
  children: ReactNode;
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Animated text with a shiny gradient that moves across the text.
 * Great for headings, badges, and highlighted words.
 */
export function AnimatedShinyText({
  children,
  shimmer = true,
  className,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <span
      className={cn(
        'inline-block text-transparent bg-clip-text',
        shimmer && 'animate-gradient-shift',
        className
      )}
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--color-brand-600, #B0756E) 0%, var(--color-brand-400, #D48D82) 25%, var(--color-brand-secondary, #D4A373) 50%, var(--color-brand-400, #D48D82) 75%, var(--color-brand-600, #B0756E) 100%)',
        backgroundSize: '200% 100%',
      }}
      {...props}
    >
      {children}
    </span>
  );
}
