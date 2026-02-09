/**
 * Navbar Component
 * Barra de navegación superior con breadcrumbs, búsqueda y usuario
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, ChevronRight, LogOut, User, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  className?: string;
}

// Mapeo de rutas a breadcrumbs
const routeMap: Record<string, string[]> = {
  '/dashboard': ['Dashboard'],
  '/dashboard/partidos': ['Dashboard', 'Partidos'],
  '/dashboard/posiciones': ['Dashboard', 'Tabla de Posiciones'],
  '/dashboard/jornadas': ['Dashboard', 'Jornadas'],
  '/dashboard/noticias': ['Dashboard', 'Noticias'],
  '/dashboard/configuracion': ['Dashboard', 'Configuración'],
};

export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, adminUser, isAdmin, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Generar breadcrumbs desde pathname
  const breadcrumbs = routeMap[pathname] || ['Dashboard'];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-20 w-full border-b border-border/50 bg-white/80 backdrop-blur-md',
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    index === breadcrumbs.length - 1
                      ? 'font-semibold text-accent-foreground'
                      : 'text-foreground'
                  )}
                >
                  {crumb}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* Right Section: Search, Notifications, User */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-background px-4 py-2 w-64">
            <Search className="h-4 w-4 text-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-transparent text-sm text-accent-foreground placeholder:text-foreground focus:outline-none"
            />
          </div>

          {/* Notifications */}
          <button className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-info"></span>
            </span>
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-accent-foreground">
                    {user?.displayName || 'Usuario'}
                  </p>
                  <p className="text-xs text-foreground">
                    {adminUser?.role === 'admin' ? 'Administrador' : 'Viewer'}
                  </p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-white shadow-soft">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-gradient-liga1 text-white font-semibold">
                    {user?.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-soft">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-accent-foreground">
                    {user?.displayName || 'Usuario'}
                  </p>
                  <p className="text-xs text-foreground font-normal">
                    {user?.email}
                  </p>
                  {adminUser && (
                    <Badge
                      variant={isAdmin ? 'default' : 'secondary'}
                      className={cn(
                        'w-fit mt-1',
                        isAdmin && 'bg-gradient-liga1 border-0'
                      )}
                    >
                      {adminUser.role === 'admin' ? 'Admin' : 'Viewer'}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Cerrando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overlay de cierre de sesión */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground font-medium">Cerrando sesión...</p>
          </div>
        </div>
      )}
    </header>
  );
}
