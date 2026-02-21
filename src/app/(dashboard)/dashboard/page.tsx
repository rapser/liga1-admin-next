/**
 * Página de Dashboard principal
 * Muestra resumen de partidos, estadísticas, etc.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { StatCard } from '@/presentation/components/shared';
import { PageHeader } from '@/presentation/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, CalendarDays, Activity, CheckCircle2 } from 'lucide-react';
import { JornadaRepository } from '@/data/repositories/jornada.repository';
import { MatchRepository } from '@/data/repositories/match.repository';
import { Match } from '@/domain/entities/match.entity';
import { getTeamFullName } from '@/core/config/firestore-constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeDate } from '@/lib/date-utils';

const jornadaRepository = new JornadaRepository();
const matchRepository = new MatchRepository();

interface UpcomingMatch extends Match {
  jornadaId: string;
}

interface DashboardData {
  jornadasCount: number;
  currentFecha: number | null;
  currentTorneo: string | null;
  upcomingMatches: UpcomingMatch[];
  nextMatchDate: Date | null;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const jornadas = await jornadaRepository.fetchVisibleJornadas();
  const allMatches: UpcomingMatch[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = normalizeDate(today);

  const matchesPerJornada = await Promise.all(
    jornadas.map(jornada =>
      matchRepository.fetchMatches(jornada.id)
        .then(matches => ({ jornadaId: jornada.id, matches }))
        .catch(() => ({ jornadaId: jornada.id, matches: [] as Match[] }))
    )
  );

  for (const { jornadaId, matches } of matchesPerJornada) {
    matches.forEach(match => {
      if (match.estado === 'pendiente') {
        allMatches.push({ ...match, jornadaId });
      }
    });
  }

  if (allMatches.length === 0) {
    return {
      jornadasCount: jornadas.length,
      currentFecha: null,
      currentTorneo: null,
      upcomingMatches: [],
      nextMatchDate: null,
    };
  }

  const matchesByDate = new Map<string, UpcomingMatch[]>();
  allMatches.forEach(match => {
    const dateKey = normalizeDate(match.fecha);
    if (dateKey >= todayKey) {
      if (!matchesByDate.has(dateKey)) matchesByDate.set(dateKey, []);
      matchesByDate.get(dateKey)!.push(match);
    }
  });

  if (matchesByDate.size === 0) {
    return {
      jornadasCount: jornadas.length,
      currentFecha: null,
      currentTorneo: null,
      upcomingMatches: [],
      nextMatchDate: null,
    };
  }

  const sortedDateKeys = Array.from(matchesByDate.keys()).sort();
  const nextDateKey = sortedDateKeys[0]!;
  const matchesOnNextDate = matchesByDate.get(nextDateKey) || [];
  const filteredMatches = matchesOnNextDate.filter(match =>
    normalizeDate(match.fecha) === nextDateKey
  );

  const [year = 0, month = 1, day = 1] = nextDateKey.split('-').map(Number);
  const nextMatchDate = new Date(year, month - 1, day);

  filteredMatches.sort((a, b) => {
    const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
    const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
    return fechaA.getTime() - fechaB.getTime();
  });

  let currentFecha: number | null = null;
  let currentTorneo: string | null = null;
  if (filteredMatches.length > 0) {
    const parts = filteredMatches[0]!.jornadaId.split('_');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      currentFecha = parseInt(parts[1], 10);
      currentTorneo = parts[0];
    }
  }

  return {
    jornadasCount: jornadas.length,
    currentFecha,
    currentTorneo,
    upcomingMatches: filteredMatches,
    nextMatchDate,
  };
}

export default function DashboardPage() {
  const { loading } = useRequireAuth();
  const {
    data,
    isLoading: loadingData,
  } = useQuery({
    queryKey: ['dashboard', 'home'],
    queryFn: fetchDashboardData,
    enabled: !loading,
    refetchInterval: 60 * 60 * 1000, // 1 hora (solo cuando la pestaña está activa)
  });

  const jornadasCount = data?.jornadasCount ?? 0;
  const currentFecha = data?.currentFecha ?? null;
  const currentTorneo = data?.currentTorneo ?? null;
  const upcomingMatches = data?.upcomingMatches ?? [];
  const nextMatchDate = data?.nextMatchDate ?? null;

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // SIEMPRE usar la fecha actual del sistema como referencia
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = normalizeDate(today);

  // Formatear fecha próxima
  const nextDateFormatted = nextMatchDate
    ? format(nextMatchDate, "d 'de' MMMM", { locale: es })
    : 'No hay partidos programados';

  // Verificar si los partidos son de hoy comparando con la fecha actual del sistema
  const nextDateKey = nextMatchDate ? normalizeDate(nextMatchDate) : null;
  const isToday = nextDateKey === todayKey;

  // Título y descripción dinámicos
  const cardTitle = isToday ? 'Partidos Hoy' : 'Próximos Partidos';
  const cardDescription = isToday
    ? `Partidos programados para hoy`
    : nextMatchDate
    ? `Partidos programados para el ${nextDateFormatted}`
    : 'No hay partidos programados';

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Bienvenido al panel de administración de la Liga 1"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={isToday ? 'Partidos Hoy' : 'Partidos Próximos'}
          value={upcomingMatches.length.toString()}
          icon={Trophy}
          subtitle={nextDateFormatted}
          variant="liga1"
        />
        <StatCard
          title="Equipos"
          value="18"
          icon={Users}
          subtitle="Liga 1 2026"
          variant="info"
        />
        <StatCard
          title="Jornada"
          value={currentFecha ? currentFecha.toString() : '-'}
          icon={CalendarDays}
          subtitle={currentTorneo ? currentTorneo.charAt(0).toUpperCase() + currentTorneo.slice(1) : 'Liga 1 2026'}
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
            <CardTitle className="text-accent-foreground">{cardTitle}</CardTitle>
            <CardDescription>
              {cardDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-4">
                {upcomingMatches.map((match) => {
                  const localTeamName = getTeamFullName(match.equipoLocalId || '');
                  const visitorTeamName = getTeamFullName(match.equipoVisitanteId || '');
                  const localCode = (match.equipoLocalId || '').toUpperCase().slice(0, 2);
                  const visitorCode = (match.equipoVisitanteId || '').toUpperCase().slice(0, 2);
                  const matchTime = format(match.fecha, 'HH:mm');

                  return (
                    <div
                      key={`${match.jornadaId}-${match.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-background"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-liga1 flex items-center justify-center text-white font-bold text-sm">
                          {localCode}
                        </div>
                        <span className="font-semibold text-accent-foreground">{localTeamName}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground px-3 py-1 rounded-lg bg-white">
                        {matchTime}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-accent-foreground">{visitorTeamName}</span>
                        <div className="h-10 w-10 rounded-full bg-gradient-error flex items-center justify-center text-white font-bold text-sm">
                          {visitorCode}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-foreground text-sm">
                No hay partidos programados próximamente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funcionalidades Implementadas */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-accent-foreground">Funcionalidades Disponibles</CardTitle>
            <CardDescription>
              Características implementadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="h-8 w-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-accent-foreground">Gestión de partidos en tiempo real</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="h-8 w-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-accent-foreground">Tabla de posiciones actualizable</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="h-8 w-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-accent-foreground">Administración de jornadas</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="h-8 w-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-accent-foreground">Gestión de noticias</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl bg-background">
                <div className="h-8 w-8 rounded-lg bg-gradient-success flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-accent-foreground">Notificaciones push</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
