/**
 * Página de Configuración
 * Configuración del usuario y del sistema (solo para admins)
 */

'use client';

import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { useAuth } from '@/presentation/providers/auth-provider';
import { DashboardLayout } from '@/presentation/components/layout';
import { PageHeader } from '@/presentation/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Settings,
  Bell,
  Lock,
  Palette,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ConfiguracionPage() {
  const { loading } = useRequireAuth();
  const { user, adminUser, isAdmin, logout } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[#67748e]">Cargando configuración...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Configuración"
        description="Gestiona tu perfil y preferencias del sistema"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil de Usuario */}
        <Card className="shadow-soft border-0 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[#344767]">Perfil</CardTitle>
            <CardDescription>Información de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24 border-4 border-white shadow-soft-lg">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="bg-gradient-liga1 text-white text-2xl font-bold">
                  {user?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="text-xl font-bold text-[#344767]">
                  {user?.displayName || 'Usuario'}
                </h3>
                <p className="text-sm text-[#67748e]">{user?.email}</p>
              </div>

              <Badge
                variant={isAdmin ? 'default' : 'secondary'}
                className={isAdmin ? 'bg-gradient-liga1 border-0' : ''}
              >
                <Shield className="h-3 w-3 mr-1" />
                {isAdmin ? 'Administrador' : 'Viewer'}
              </Badge>

              {adminUser?.lastLoginAt && (
                <div className="text-xs text-[#67748e] pt-4 border-t border-[#e9ecef] w-full">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Último acceso:{' '}
                      {format(adminUser.lastLoginAt, "dd MMM yyyy 'a las' HH:mm", {
                        locale: es,
                      })}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={logout}
                variant="outline"
                className="w-full mt-4"
              >
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de la Cuenta */}
        <Card className="shadow-soft border-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#344767]">Configuración de la Cuenta</CardTitle>
            <CardDescription>Gestiona tus preferencias y seguridad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Información Personal */}
              <div className="p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-liga1 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#344767]">Información Personal</p>
                      <p className="text-sm text-[#67748e]">Nombre, email y foto de perfil</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                </div>
              </div>

              {/* Seguridad */}
              <div className="p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-error flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#344767]">Seguridad</p>
                      <p className="text-sm text-[#67748e]">Contraseña y autenticación</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Gestionar
                  </Button>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-info flex items-center justify-center">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#344767]">Notificaciones</p>
                      <p className="text-sm text-[#67748e]">Preferencias de alertas y emails</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Configurar
                  </Button>
                </div>
              </div>

              {/* Apariencia */}
              <div className="p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-warning flex items-center justify-center">
                      <Palette className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#344767]">Apariencia</p>
                      <p className="text-sm text-[#67748e]">Tema y preferencias visuales</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Personalizar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración del Sistema (Solo Admin) */}
        {isAdmin && (
          <Card className="shadow-soft border-0 lg:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#67748e]" />
                <CardTitle className="text-[#344767]">Configuración del Sistema</CardTitle>
              </div>
              <CardDescription>
                Configuración avanzada (solo para administradores)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gestión de Usuarios */}
                <div className="p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-liga1 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#344767]">Gestión de Usuarios</p>
                        <p className="text-sm text-[#67748e]">Administrar roles y permisos</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Gestionar
                    </Button>
                  </div>
                </div>

                {/* Configuración General */}
                <div className="p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-success flex items-center justify-center">
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#344767]">Configuración General</p>
                        <p className="text-sm text-[#67748e]">Ajustes del sistema</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ajustar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
