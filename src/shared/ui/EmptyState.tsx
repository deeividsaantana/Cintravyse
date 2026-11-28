import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './styles';

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  compact?: boolean;
  /** Botão com o próximo passo (ex.: "Novo lançamento"). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center px-5 text-center',
        compact ? 'py-7' : 'py-12',
        className,
      )}
    >
      <span
        className={cn(
          'mb-3.5 grid place-items-center rounded-xl bg-[#e8f5ee] text-[#176b4d] ring-1 ring-inset ring-[#cce6d8]',
          compact ? 'size-10' : 'size-12',
        )}
      >
        <Icon className={compact ? 'size-5' : 'size-5.5'} aria-hidden="true" />
      </span>
      <p className={cn('font-semibold tracking-[-0.01em] text-[#10211c]', compact ? 'text-[13.5px]' : 'text-[15px]')}>{title}</p>
      {description && <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-[#54645c]">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
