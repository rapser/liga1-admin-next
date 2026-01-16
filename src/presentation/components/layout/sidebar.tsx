/**
 * Sidebar Component
 * Navegación lateral del dashboard con diseño Soft UI
 */

'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Trophy,
  CalendarDays,
  Newspaper,
  Settings,
  ChevronLeft,
  LayoutDashboard,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Partidos',
    href: '/dashboard/partidos',
    icon: Trophy,
  },
  {
    label: 'Tabla de Posiciones',
    href: '/dashboard/posiciones',
    icon: LayoutDashboard,
  },
  {
    label: 'Jornadas',
    href: '/dashboard/jornadas',
    icon: CalendarDays,
  },
  {
    label: 'Noticias',
    href: '/dashboard/noticias',
    icon: Newspaper,
  },
  {
    label: 'Configuración',
    href: '/dashboard/configuracion',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white shadow-soft transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Logo & Brand */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-border/50">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-liga1">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#344767]">Liga 1</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-liga1">
            <Trophy className="h-6 w-6 text-white" />
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors',
            isCollapsed && 'mx-auto mt-2'
          )}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isCollapsed && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-liga1 text-white shadow-soft'
                  : 'text-[#67748e] hover:bg-accent hover:text-[#344767]',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0')} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 p-4">
          <div className="rounded-xl bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-4">
            <p className="text-xs font-semibold text-[#344767] mb-1">
              Soft UI Design
            </p>
            <p className="text-xs text-[#67748e]">
              v1.0 • Liga 1 Admin
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
