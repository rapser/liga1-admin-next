/**
 * Página de Login - Diseño Soft UI
 * Permite a los usuarios autenticarse con Email/Password o Google
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { user, isAdmin, isViewer, loading, signInWithGoogle, signInWithEmail } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && user && (isAdmin || isViewer)) {
      setIsSigningIn(false); // Ocultar loader del botón
      setIsRedirecting(true); // Mostrar loader de redirección
      router.push('/dashboard');
    }
  }, [user, isAdmin, isViewer, loading, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Por favor ingresa tu email y contraseña');
      return;
    }

    try {
      setError(null);
      setIsSigningIn(true);
      await signInWithEmail(email, password);
      // No ocultar isSigningIn aquí, se ocultará cuando se complete la redirección
      // La redirección se maneja en el useEffect y mostrará el loader de redirección
    } catch (err) {
      console.error('Error en login:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión. Verifica tus credenciales.'
      );
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
      // No ocultar isSigningIn aquí, se ocultará cuando se complete la redirección
      // La redirección se maneja en el useEffect y mostrará el loader de redirección
    } catch (err) {
      // Si el usuario canceló el login, no mostrar error
      if (err instanceof Error && err.message === 'LOGIN_CANCELLED') {
        // Usuario canceló, solo resetear el estado sin mostrar error
        setIsSigningIn(false);
        return;
      }
      
      console.error('Error en login:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión con Google.'
      );
      setIsSigningIn(false);
    }
  };

  // Mostrar loading mientras se verifica la sesión o se está redirigiendo
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[#67748e]">
            {isRedirecting ? 'Redirigiendo al dashboard...' : 'Verificando sesión...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-6xl w-full">
            {/* Left Side - Login Form */}
            <div className="flex items-center justify-center p-8 lg:p-12">
              <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-liga1 shadow-soft-lg">
                      <Trophy className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-[#344767]">Liga 1 Admin</h1>
                      <p className="text-xs text-[#67748e]">Panel de Administración</p>
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-[#344767] mb-2 bg-gradient-to-r from-[#0047BB] to-[#17c1e8] bg-clip-text text-transparent">
                    Bienvenido
                  </h2>
                  <p className="text-sm text-[#67748e]">
                    Inicia sesión para acceder al panel de administración
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Login Form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-[#344767]">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#67748e]" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSigningIn}
                        className="pl-10 h-12 border-[#dee2e6] focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-[#344767]">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#67748e] z-10" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSigningIn}
                        className="pl-10 pr-10 h-12 border-[#dee2e6] focus:border-primary [&::placeholder]:text-base"
                        style={
                          !showPassword && password
                            ? {
                                fontFamily: 'monospace',
                                letterSpacing: '0.15em',
                                fontSize: '1.25rem',
                              }
                            : {}
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSigningIn}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#67748e] hover:text-[#344767] transition-colors focus:outline-none"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full h-12 text-base font-semibold bg-gradient-liga1 hover:opacity-90 transition-opacity shadow-soft-lg border-0"
                  >
                    {isSigningIn ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#dee2e6]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-[#67748e]">O continúa con</span>
                    </div>
                  </div>

                  {/* Google Sign In Button */}
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSigningIn}
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border-[#dee2e6] hover:bg-[#f8f9fa]"
                  >
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
                  </Button>

                  {/* Info Text */}
                  <div className="text-center space-y-2 pt-4">
                    <p className="text-xs text-[#8392ab]">
                      Solo usuarios autorizados pueden acceder
                    </p>
                    <p className="text-xs text-[#8392ab]">
                      Contacta al administrador si necesitas acceso
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Side - Image with Skew Effect (Hidden on mobile) */}
            <div className="hidden lg:flex items-center justify-end relative overflow-hidden">
              <div
                className="relative h-[600px] w-full -mr-24"
                style={{ transform: 'skewX(-10deg)' }}
              >
                <div
                  className="absolute inset-0 bg-gradient-liga1 rounded-l-3xl ml-12"
                  style={{ transform: 'skewX(10deg)' }}
                >
                  {/* Overlay con patrón */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
                    <div className="mb-8">
                      <Trophy className="h-24 w-24 text-white/90" />
                    </div>
                    <h3 className="text-4xl font-bold mb-4 text-center">
                      Liga 1
                    </h3>
                    <p className="text-lg text-center text-white/90 max-w-md">
                      Sistema de administración profesional para la gestión de partidos, equipos y estadísticas
                    </p>
                    <div className="mt-8 flex gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">18</div>
                        <div className="text-sm text-white/80">Equipos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">38</div>
                        <div className="text-sm text-white/80">Jornadas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">24/7</div>
                        <div className="text-sm text-white/80">En Vivo</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
