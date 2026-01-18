/**
 * Hook useRequireAuth
 * Redirige a login si el usuario no está autenticado
 * Retorna el usuario solo si está autenticado y autorizado
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

interface UseRequireAuthOptions {
  /** Requiere que el usuario sea admin (no solo viewer) */
  requireAdmin?: boolean;
  /** Ruta de redirección si no está autenticado */
  redirectTo?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { requireAdmin = false, redirectTo = '/login' } = options;
  const { user, isAdmin, isViewer, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // No hacer nada mientras carga
    if (loading) return;

    // Si no hay usuario, redirigir al login
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Si requiere admin y el usuario no es admin, redirigir
    if (requireAdmin && !isAdmin) {
      console.warn('Acceso denegado: se requieren permisos de administrador');
      router.push('/dashboard'); // Redirigir al dashboard en lugar de login
      return;
    }

    // Si el usuario no es ni admin ni viewer, redirigir
    if (!isAdmin && !isViewer) {
      console.warn('Acceso denegado: usuario no autorizado');
      router.push(redirectTo);
    }
  }, [user, isAdmin, isViewer, loading, requireAdmin, redirectTo, router]);

  return {
    user,
    isAdmin,
    isViewer,
    loading,
  };
}
