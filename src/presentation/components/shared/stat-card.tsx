/**
 * StatCard Component
 * Tarjeta de estadísticas con diseño Soft UI
 */

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'info' | 'success' | 'warning' | 'error' | 'liga1';
  className?: string;
}

const variantStyles = {
  info: 'bg-gradient-info',
  success: 'bg-gradient-success',
  warning: 'bg-gradient-warning',
  error: 'bg-gradient-error',
  liga1: 'bg-gradient-liga1',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  variant = 'liga1',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft',
        className
      )}
    >
      {/* Icon with Gradient Background */}
      <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
        <div className={cn('h-full w-full rounded-full', variantStyles[variant])} />
      </div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-foreground mb-1">{title}</p>

          {/* Value */}
          <h3 className="text-3xl font-bold text-accent-foreground mb-2">{value}</h3>

          {/* Subtitle & Trend */}
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-foreground">{subtitle}</span>
            )}
          </div>
        </div>

        {/* Icon */}
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-xl shadow-soft-lg',
            variantStyles[variant]
          )}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  );
}
