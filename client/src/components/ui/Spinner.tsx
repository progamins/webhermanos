import { type ReactNode } from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-10 w-10 border-[2.5px]',
};

function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status">
      <div
        className={`
          ${sizeMap[size]}
          rounded-full border-brand-200 dark:border-brand-800
          border-t-brand-500 animate-spin will-change-transform
        `}
        aria-hidden="true"
      />
      {label && (
        <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
          {label}
        </span>
      )}
    </div>
  );
}

export default Spinner;
