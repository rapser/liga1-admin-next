/**
 * Página de Configuración
 * Configuración del usuario y del sistema (solo para admins)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/core/config/firebase';
import { toast } from 'sonner';
import { TeamRepository } from '@/data/repositories/team.repository';
import { JornadaRepository } from '@/data/repositories/jornada.repository';
import { MatchRepository } from '@/data/repositories/match.repository';
import { ClausuraGeneratorService } from '@/domain/services/clausura-generator.service';
import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { useAuth } from '@/presentation/providers/auth-provider';
import { PageHeader } from '@/presentation/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/presentation/providers/theme-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  role: 'admin' | 'viewer';
  disabled: boolean;
}

const teamRepository = new TeamRepository();
const clausuraGeneratorService = new ClausuraGeneratorService(
  new JornadaRepository(),
  new MatchRepository(),
);

export default function ConfiguracionPage() {
  const { loading } = useRequireAuth();
  const { user, adminUser, isAdmin, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  // Estado del formulario de información personal
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);

  // Estado del botón de reset de contraseña
  const [sendingReset, setSendingReset] = useState(false);

  // Estado del listado de usuarios
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const closeDialog = () => setOpenDialog(null);

  const [initializingClausura, setInitializingClausura] = useState(false);
  const [generatingClausura, setGeneratingClausura] = useState(false);

  const handleInitClausura = async () => {
    setInitializingClausura(true);
    try {
      await teamRepository.initClausuraFromApertura();
      toast.success('Clausura inicializado correctamente. Los 18 equipos están listos con estadísticas en cero.');
      closeDialog();
    } catch {
      toast.error('Error al inicializar el Clausura. Revisa la consola para más detalles.');
    } finally {
      setInitializingClausura(false);
    }
  };

  const handleGenerateClausura = async () => {
    setGeneratingClausura(true);
    try {
      const { jornadasCreated, matchesCreated } =
        await clausuraGeneratorService.generateClausuraFromApertura();
      toast.success(
        `Clausura generado: ${jornadasCreated} fechas y ${matchesCreated} partidos creados. Recuerda actualizar las fechas de cada partido.`,
      );
      closeDialog();
    } catch {
      toast.error('Error al generar el Clausura. Revisa la consola para más detalles.');
    } finally {
      setGeneratingClausura(false);
    }
  };

  const fetchAdminUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json() as { users: AdminUserRecord[] };
      setAdminUsers(data.users);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (openDialog === 'usuarios' && adminUsers.length === 0 && !loadingUsers) {
      fetchAdminUsers();
    }
  }, [openDialog, adminUsers.length, loadingUsers, fetchAdminUsers]);

  const handleSaveName = async () => {
    if (!auth.currentUser || !displayName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      toast.success('Nombre actualizado correctamente');
      closeDialog();
    } catch {
      toast.error('Error al actualizar el nombre');
    } finally {
      setSavingName(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Email de restablecimiento enviado a ' + user.email);
      closeDialog();
    } catch {
      toast.error('Error al enviar el email de restablecimiento');
    } finally {
      setSendingReset(false);
    }
  };

  // Detectar si el usuario usa Google
  const isGoogleProvider = user?.providerData?.some((p) => p.providerId === 'google.com');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Gestiona tu perfil y preferencias del sistema"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil de Usuario */}
        <Card className="shadow-soft border-0 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-accent-foreground">Perfil</CardTitle>
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
                <h3 className="text-xl font-bold text-accent-foreground">
                  {user?.displayName || 'Usuario'}
                </h3>
                <p className="text-sm text-foreground">{user?.email}</p>
              </div>

              <Badge
                variant={isAdmin ? 'default' : 'secondary'}
                className={isAdmin ? 'bg-gradient-liga1 border-0' : ''}
              >
                <Shield className="h-3 w-3 mr-1" />
                {isAdmin ? 'Administrador' : 'Viewer'}
              </Badge>

              {adminUser?.lastLoginAt && (
                <div className="text-xs text-foreground pt-4 border-t border-muted w-full">
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
            <CardTitle className="text-accent-foreground">Configuración de la Cuenta</CardTitle>
            <CardDescription>Gestiona tus preferencias y seguridad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Información Personal */}
              <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-liga1 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-accent-foreground">Información Personal</p>
                      <p className="text-sm text-foreground">Nombre, email y foto de perfil</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setDisplayName(user?.displayName || '');
                    setOpenDialog('personal');
                  }}>
                    Editar
                  </Button>
                </div>
              </div>

              {/* Seguridad */}
              <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-error flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-accent-foreground">Seguridad</p>
                      <p className="text-sm text-foreground">Contraseña y autenticación</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setOpenDialog('seguridad')}>
                    Gestionar
                  </Button>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-info flex items-center justify-center">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-accent-foreground">Notificaciones</p>
                      <p className="text-sm text-foreground">Preferencias de alertas y emails</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setOpenDialog('notificaciones')}>
                    Configurar
                  </Button>
                </div>
              </div>

              {/* Apariencia */}
              <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-warning flex items-center justify-center">
                      <Palette className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-accent-foreground">Apariencia</p>
                      <p className="text-sm text-foreground flex items-center gap-1">
                        {theme === 'dark' ? (
                          <><Moon className="h-3 w-3" /> Modo oscuro activo</>
                        ) : (
                          <><Sun className="h-3 w-3" /> Modo claro activo</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setOpenDialog('apariencia')}>
                    Cambiar
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
                <Settings className="h-5 w-5 text-foreground" />
                <CardTitle className="text-accent-foreground">Configuración del Sistema</CardTitle>
              </div>
              <CardDescription>
                Configuración avanzada (solo para administradores)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gestión de Usuarios */}
                <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-liga1 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-accent-foreground">Gestión de Usuarios</p>
                        <p className="text-sm text-foreground">Administrar roles y permisos</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setOpenDialog('usuarios')}>
                      Gestionar
                    </Button>
                  </div>
                </div>

                {/* Configuración General */}
                <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-success flex items-center justify-center">
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-accent-foreground">Configuración General</p>
                        <p className="text-sm text-foreground">Ajustes del sistema</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ajustar
                    </Button>
                  </div>
                </div>

                {/* Gestión de Torneos */}
                <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors md:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-warning flex items-center justify-center shrink-0">
                        <RefreshCw className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-accent-foreground">Gestión de Torneos</p>
                        <p className="text-sm text-foreground">
                          Inicializa equipos del Clausura y genera todas las fechas con los partidos invertidos del Apertura
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setOpenDialog('initClausura')}>
                        Iniciar Clausura
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setOpenDialog('generateClausura')}>
                        Generar Fechas
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Información Personal */}
      <Dialog open={openDialog === 'personal'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground">Información Personal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-foreground">El email no se puede cambiar desde aquí.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              className="bg-gradient-liga1 border-0 text-white"
              onClick={handleSaveName}
              disabled={savingName || !displayName.trim()}
            >
              {savingName ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Seguridad */}
      <Dialog open={openDialog === 'seguridad'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground">Seguridad</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {isGoogleProvider ? (
              <div className="p-4 rounded-xl bg-background space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-foreground" />
                  <p className="font-semibold text-accent-foreground">Cuenta de Google</p>
                </div>
                <p className="text-sm text-foreground">
                  Tu cuenta está vinculada con Google. La contraseña y seguridad se gestionan desde tu cuenta de Google.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-foreground" />
                  <p className="font-semibold text-accent-foreground">Restablecer contraseña</p>
                </div>
                <p className="text-sm text-foreground">
                  Te enviaremos un email a <strong>{user?.email}</strong> con instrucciones para cambiar tu contraseña.
                </p>
                <Button
                  className="w-full bg-gradient-liga1 border-0 text-white"
                  onClick={handleSendPasswordReset}
                  disabled={sendingReset}
                >
                  {sendingReset ? 'Enviando...' : 'Enviar email de restablecimiento'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Notificaciones */}
      <Dialog open={openDialog === 'notificaciones'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground">Notificaciones</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="p-4 rounded-xl bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-foreground" />
                <p className="font-semibold text-accent-foreground">En desarrollo</p>
              </div>
              <p className="text-sm text-foreground">
                Las preferencias de notificaciones del sistema están en desarrollo y estarán disponibles próximamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Apariencia */}
      <Dialog open={openDialog === 'apariencia'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apariencia
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-foreground">Selecciona el tema de la interfaz.</p>

            {/* Opción Claro */}
            <button
              onClick={() => setTheme('light')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                theme === 'light'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-background hover:bg-muted'
              }`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                theme === 'light' ? 'bg-gradient-liga1' : 'bg-muted'
              }`}>
                <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-white' : 'text-foreground'}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-accent-foreground">Modo Claro</p>
                <p className="text-xs text-foreground">Fondo blanco, colores suaves</p>
              </div>
              {theme === 'light' && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </button>

            {/* Opción Oscuro */}
            <button
              onClick={() => setTheme('dark')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                theme === 'dark'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-background hover:bg-muted'
              }`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-gradient-liga1' : 'bg-muted'
              }`}>
                <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-foreground'}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-accent-foreground">Modo Oscuro</p>
                <p className="text-xs text-foreground">Fondo oscuro, menos fatiga visual</p>
              </div>
              {theme === 'dark' && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Iniciar Clausura */}
      <Dialog open={openDialog === 'initClausura'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Iniciar Torneo Clausura
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="p-4 rounded-xl bg-background space-y-2">
              <p className="text-sm text-foreground">Esta acción:</p>
              <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                <li>Crea los 18 documentos de equipos en la colección <strong>clausura</strong> con estadísticas en cero</li>
                <li>Sincroniza la tabla <strong>acumulado</strong> con los datos actuales del Apertura</li>
              </ul>
            </div>
            <div className="p-3 rounded-xl border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Si el Clausura ya fue inicializado antes, esta operación sobreescribirá las estadísticas existentes con cero. Usarla solo al comenzar el torneo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={initializingClausura}>Cancelar</Button>
            <Button
              className="bg-gradient-liga1 border-0 text-white"
              onClick={handleInitClausura}
              disabled={initializingClausura}
            >
              {initializingClausura ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Inicializando...</>
              ) : (
                'Confirmar e Iniciar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Generar Fechas del Clausura */}
      <Dialog open={openDialog === 'generateClausura'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Generar Fechas del Clausura
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="p-4 rounded-xl bg-background space-y-2">
              <p className="text-sm text-foreground">Esta acción:</p>
              <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                <li>Lee todas las fechas del <strong>Apertura</strong> desde Firestore</li>
                <li>Crea <strong>clausura_01, clausura_02…</strong> con los partidos invertidos (local ↔ visitante)</li>
                <li>Todos los partidos tendrán como fecha placeholder el <strong>22 Nov 2026</strong></li>
              </ul>
            </div>
            <div className="p-3 rounded-xl border border-blue-400/40 bg-blue-50 dark:bg-blue-950/20">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Las fechas reales de cada partido deberás actualizarlas manualmente desde la sección Jornadas a medida que se anuncie el calendario oficial.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Si ya existen jornadas del Clausura, serán sobreescritas. Esta operación es segura de repetir.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={generatingClausura}>Cancelar</Button>
            <Button
              className="bg-gradient-liga1 border-0 text-white"
              onClick={handleGenerateClausura}
              disabled={generatingClausura}
            >
              {generatingClausura ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
              ) : (
                'Confirmar y Generar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gestión de Usuarios */}
      <Dialog open={openDialog === 'usuarios'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="shadow-soft border-0 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-accent-foreground flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gestión de Usuarios
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {/* Cargando */}
            {loadingUsers && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                <p className="text-sm text-foreground">Cargando usuarios...</p>
              </div>
            )}

            {/* Error */}
            {!loadingUsers && usersError && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">{usersError}</p>
                <Button variant="outline" size="sm" onClick={fetchAdminUsers}>
                  Reintentar
                </Button>
              </div>
            )}

            {/* Lista de usuarios */}
            {!loadingUsers && !usersError && (
              <>
                <p className="text-xs text-foreground mb-4">
                  {adminUsers.length} {adminUsers.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
                </p>
                <div className="space-y-3 max-h-105 overflow-y-auto pr-1">
                  {adminUsers.map((u) => {
                    const initials = (u.displayName ?? u.email)
                      .charAt(0)
                      .toUpperCase();
                    const isCurrentUser = u.uid === user?.uid;

                    return (
                      <div
                        key={u.uid}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isCurrentUser
                            ? 'bg-muted border border-primary/20'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        {/* Avatar */}
                        <Avatar className="h-10 w-10 border-2 border-white shadow-soft shrink-0">
                          <AvatarImage src={u.photoURL ?? undefined} />
                          <AvatarFallback className="bg-gradient-liga1 text-white font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-accent-foreground text-sm truncate">
                              {u.displayName ?? u.email}
                            </p>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                                Tú
                              </Badge>
                            )}
                            {u.disabled && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                                Desactivado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-foreground truncate">{u.email}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {u.lastSignInAt && (
                              <span className="text-xs text-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Último acceso:{' '}
                                {format(new Date(u.lastSignInAt), "dd MMM yyyy", { locale: es })}
                              </span>
                            )}
                            {u.createdAt && (
                              <span className="text-xs text-foreground">
                                Registrado: {format(new Date(u.createdAt), "dd MMM yyyy", { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Role badge */}
                        <Badge
                          variant={u.role === 'admin' ? 'default' : 'secondary'}
                          className={`shrink-0 ${u.role === 'admin' ? 'bg-gradient-liga1 border-0' : ''}`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {u.role === 'admin' ? 'Admin' : 'Viewer'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
