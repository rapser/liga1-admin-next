'use client';

/**
 * Error boundary del dashboard - errores en cualquier ruta del panel.
 */

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error en dashboard:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Algo salió mal
        </h1>
        <p className="text-muted-foreground mb-6">
          No se pudo cargar esta sección. Puedes intentar de nuevo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
