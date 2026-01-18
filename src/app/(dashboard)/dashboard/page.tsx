/**
 * Página de Dashboard principal
 * Muestra resumen de partidos, estadísticas, etc.
 */

'use client';

import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { DashboardLayout } from '@/presentation/components/layout';
import { StatCard } from '@/presentation/components/shared';
import { PageHeader } from '@/presentation/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, CalendarDays, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[#67748e]">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Bienvenido al panel de administración de la Liga 1"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Partidos Hoy"
          value="3"
          icon={Trophy}
          subtitle="2 en vivo"
          variant="liga1"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Equipos"
          value="18"
          icon={Users}
          subtitle="Liga 1 2026"
          variant="info"
        />
        <StatCard
          title="Jornadas"
          value="38"
          icon={CalendarDays}
          subtitle="Apertura + Clausura"
          variant="success"
        />
        <StatCard
          title="Actividad"
          value="1.2k"
          icon={Activity}
          subtitle="Usuarios activos"
          variant="warning"
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Partidos */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-[#344767]">Próximos Partidos</CardTitle>
            <CardDescription>Partidos programados para hoy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#f8f9fa]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-liga1 flex items-center justify-center text-white font-bold text-sm">
                    AL
                  </div>
                  <span className="font-semibold text-[#344767]">Alianza Lima</span>
                </div>
                <span className="text-xs font-semibold text-[#67748e] px-3 py-1 rounded-lg bg-white">
                  15:00
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#344767]">Universitario</span>
                  <div className="h-10 w-10 rounded-full bg-gradient-error flex items-center justify-center text-white font-bold text-sm">
                    UN
                  </div>
                </div>
              </div>

              <div className="text-center py-8 text-[#67748e] text-sm">
                Más partidos disponibles en la sección Partidos
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximamente */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-[#344767]">Próximamente</CardTitle>
            <CardDescription>
              Funcionalidades en desarrollo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-[#67748e]">
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8f9fa] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-gradient-liga1 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm">Gestión de partidos en tiempo real</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8f9fa] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-gradient-info flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm">Tabla de posiciones actualizable</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8f9fa] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm">Administración de jornadas</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8f9fa] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-gradient-warning flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm">Gestión de noticias y notificaciones</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
