/**
 * Página de Dashboard principal
 * Muestra resumen de partidos, estadísticas, etc.
 */

'use client';

import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/presentation/providers/auth-provider';

export default function DashboardPage() {
  const { loading } = useRequireAuth();
  const { user, adminUser, isAdmin, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Bienvenido a Liga 1 Admin
            </h1>
            <p className="text-slate-600 mt-2">
              Panel de administración de la Liga 1 de Fútbol Peruano
            </p>
          </div>
          <Button onClick={logout} variant="outline">
            Cerrar Sesión
          </Button>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
            <CardDescription>Detalles de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Email</p>
                <p className="text-base text-slate-900">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Nombre</p>
                <p className="text-base text-slate-900">
                  {adminUser?.displayName || user?.displayName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Rol</p>
                <p className="text-base text-slate-900">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isAdmin
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {isAdmin ? 'Administrador' : 'Viewer'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">UID</p>
                <p className="text-base text-slate-900 font-mono text-sm">
                  {user?.uid}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <p className="text-sm text-slate-600 mt-1">En esta jornada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Equipos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">18</p>
              <p className="text-sm text-slate-600 mt-1">En la liga</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jornadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">38</p>
              <p className="text-sm text-slate-600 mt-1">Por temporada</p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Próximamente</CardTitle>
            <CardDescription>
              Funcionalidades que se implementarán en las siguientes fases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-center">
                <span className="mr-2">⚽</span>
                Gestión de partidos en tiempo real
              </li>
              <li className="flex items-center">
                <span className="mr-2">📊</span>
                Tabla de posiciones actualizable
              </li>
              <li className="flex items-center">
                <span className="mr-2">📅</span>
                Administración de jornadas
              </li>
              <li className="flex items-center">
                <span className="mr-2">📰</span>
                Gestión de noticias
              </li>
              <li className="flex items-center">
                <span className="mr-2">📲</span>
                Envío de notificaciones push
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
