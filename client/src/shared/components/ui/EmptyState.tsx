import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-20',
};

function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]} px-6 flex flex-col items-center justify-center text-center
        rounded-2xl border border-dashed border-[var(--theme-border)]
      `}
      role="status"
    >
      <div className="w-12 h-12 rounded-full bg-[var(--theme-bg-alt)] flex items-center justify-center mb-4">
        {icon || <Inbox className="h-5 w-5 text-zinc-400" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-serif font-semibold text-[var(--theme-text)]">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--theme-text-secondary)] mt-1.5 max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
