import { type ReactNode, type HTMLAttributes } from 'react';

type CardVariant = 'default' | 'glass' | 'liquid' | 'premium';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm',
  glass: 'bg-[var(--theme-glass-bg)] backdrop-blur-md border border-[var(--theme-glass-border)]',
  liquid: 'liquid-glass shadow-sm',
  premium: 'premium-glass-card',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl transition-all duration-300
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

function CardBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-4 pt-4 border-t border-[var(--theme-border)] ${className}`} {...props}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
