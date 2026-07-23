import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The variant of the shimmer effect.
   * @default "default"
   */
  variant?: 'default' | 'white' | 'brand';
  /**
   * Size of the button.
   * @default "default"
   */
  size?: 'sm' | 'default' | 'lg' | 'xl';
  /**
   * Whether the button is in a loading state.
   */
  loading?: boolean;
}

/**
 * A button with an animated shimmer/shine effect that moves across the surface.
 * Perfect for primary CTAs and call-to-action elements.
 */
export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          'group relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',

          // Sizes
          {
            'px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest': size === 'sm',
            'px-6 py-3 text-[11px] font-mono font-bold uppercase tracking-widest': size === 'default',
            'px-8 py-4 text-[12px] font-mono font-bold uppercase tracking-widest': size === 'lg',
            'px-10 py-5 text-[13px] font-mono font-bold uppercase tracking-widest': size === 'xl',
          },

          // Variants
          {
            'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':
              variant === 'default',
            'bg-white/80 text-zinc-900 border border-zinc-200/50 backdrop-blur-sm':
              variant === 'white',
            'bg-brand-500 text-white shadow-md hover:shadow-lg':
              variant === 'brand',
          },

          className
        )}
        {...props}
      >
        {/* Shimmer overlay */}
        <span
          className={cn(
            'pointer-events-none absolute inset-0 -z-10',
            'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]',
            'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
            {
              'before:via-white/10': variant === 'default',
              'before:via-zinc-300/30': variant === 'white',
              'before:via-white/25': variant === 'brand',
            }
          )}
          aria-hidden="true"
        />

        {/* Loading spinner */}
        {loading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}

        {children}

        {/* Hover scale effect */}
        <span className="absolute inset-0 scale-0 rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-100" aria-hidden="true" />
      </button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';
