'use client';

/**
 * Error boundary global - captura errores no manejados en la app.
 * Next.js lo usa automáticamente para el segmento donde está definido.
 */

import { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error no capturado:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Algo salió mal
        </h1>
        <p className="text-muted-foreground mb-6">
          Ha ocurrido un error inesperado. Puedes intentar de nuevo.
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
