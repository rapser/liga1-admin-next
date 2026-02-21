/**
 * Página 404 - se muestra cuando la ruta no existe.
 * Usar notFound() de next/navigation para mostrarla desde cualquier página.
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
