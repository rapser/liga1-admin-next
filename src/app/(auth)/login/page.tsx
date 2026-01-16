/**
 * Página de Login
 * Permite a los usuarios autenticarse con Google
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const { user, isAdmin, isViewer, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && user && (isAdmin || isViewer)) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, isViewer, loading, router]);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
      // La redirección se maneja en el useEffect
    } catch (err) {
      console.error('Error en login:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión. Intenta de nuevo.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  // Mostrar loading mientras se verifica la sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            {/* Logo de Liga 1 - puedes reemplazar con tu logo real */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              L1
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">
            Liga 1 Admin
          </CardTitle>
          <CardDescription className="text-slate-600">
            Panel de administración de la Liga 1 de Fútbol Peruano
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleLogin}
            disabled={isSigningIn}
            className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all"
            size="lg"
          >
            {isSigningIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Iniciando sesión...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Iniciar sesión con Google
              </>
            )}
          </Button>

          <div className="text-center text-sm text-slate-500 mt-6">
            <p>Solo usuarios autorizados pueden acceder</p>
            <p className="mt-1">Contacta al administrador si necesitas acceso</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
