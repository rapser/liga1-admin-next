/**
 * Loading UI para la zona de autenticación (login).
 */

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          aria-hidden
        />
        <p className="text-foreground">Cargando...</p>
      </div>
    </div>
  );
}
