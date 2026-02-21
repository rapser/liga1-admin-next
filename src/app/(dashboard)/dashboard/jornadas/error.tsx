'use client';

import { useEffect } from 'react';

export default function JornadasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error en jornadas:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Error al cargar jornadas
        </h2>
        <p className="text-muted-foreground mb-6">Puedes intentar de nuevo.</p>
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
