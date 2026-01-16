/**
 * PageHeader Component
 * Encabezado de página con título y acciones
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-3xl font-bold text-[#344767] mb-1">{title}</h1>
        {description && (
          <p className="text-sm text-[#67748e]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
