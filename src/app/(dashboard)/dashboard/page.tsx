/**
 * Página de Dashboard principal
 * Muestra resumen de partidos, estadísticas, etc.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { DashboardLayout } from '@/presentation/components/layout';
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

export default function DashboardPage() {
  const { loading } = useRequireAuth();
  const [jornadasCount, setJornadasCount] = useState(0);
  const [currentFecha, setCurrentFecha] = useState<number | null>(null);
  const [currentTorneo, setCurrentTorneo] = useState<string | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [nextMatchDate, setNextMatchDate] = useState<Date | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingData(true);
        
        // IMPORTANTE: Solo obtener jornadas con mostrar = true
        // Las jornadas con mostrar = false no se consideran
        const jornadas = await jornadaRepository.fetchVisibleJornadas();
        setJornadasCount(jornadas.length);

        // Obtener todos los partidos de todas las jornadas en paralelo
        const allMatches: UpcomingMatch[] = [];
        const now = new Date();
        // Resetear horas para comparar solo fechas (día/mes/año)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Normalizar fecha de hoy
        const todayKey = normalizeDate(today);

        // Cargar partidos de todas las jornadas en paralelo (antes era secuencial)
        const matchesPerJornada = await Promise.all(
          jornadas.map(jornada =>
            matchRepository.fetchMatches(jornada.id)
              .then(matches => ({ jornadaId: jornada.id, matches }))
              .catch(() => ({ jornadaId: jornada.id, matches: [] as Match[] }))
          )
        );

        for (const { jornadaId, matches } of matchesPerJornada) {
          matches.forEach(match => {
            // Solo incluir partidos pendientes
            if (match.estado === 'pendiente') {
              allMatches.push({
                ...match,
                jornadaId,
              });
            }
          });
        }

        if (allMatches.length === 0) {
          setUpcomingMatches([]);
          setNextMatchDate(null);
          return;
        }

        // Agrupar partidos por fecha normalizada (solo fechas >= hoy)
        const matchesByDate = new Map<string, UpcomingMatch[]>();
        
        allMatches.forEach(match => {
          const dateKey = normalizeDate(match.fecha);
          // Solo incluir partidos de hoy o futuros (no días pasados)
          if (dateKey >= todayKey) {
            if (!matchesByDate.has(dateKey)) {
              matchesByDate.set(dateKey, []);
            }
            matchesByDate.get(dateKey)!.push(match);
          }
        });

        if (matchesByDate.size === 0) {
          setUpcomingMatches([]);
          setNextMatchDate(null);
          return;
        }

        // Obtener todas las fechas futuras y ordenarlas (la más próxima primero)
        const sortedDateKeys = Array.from(matchesByDate.keys()).sort();

        // IMPORTANTE: Buscar la fecha más próxima que tenga partidos
        // Puede ser hoy, mañana, o cualquier día futuro (ej: 30 de enero si hoy es 19)
        // Pero solo mostrar los partidos de ESA fecha, no de otras fechas
        const nextDateKey = sortedDateKeys[0]!;
        const matchesOnNextDate = matchesByDate.get(nextDateKey) || [];

        // Validación: asegurarse de que solo tenemos partidos de la fecha más próxima
        const filteredMatches = matchesOnNextDate.filter(match =>
          normalizeDate(match.fecha) === nextDateKey
        );

        // Convertir nextDateKey a Date para mostrar
        const [year = 0, month = 1, day = 1] = nextDateKey.split('-').map(Number);
        const nextDate = new Date(year, month - 1, day);
        setNextMatchDate(nextDate);

        // Ordenar por hora del partido (más próximo primero, de arriba hacia abajo)
        filteredMatches.sort((a, b) => {
          const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
          const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
          return fechaA.getTime() - fechaB.getTime();
        });

        // Obtener la fecha (jornada) del primer partido próximo
        // Extraemos el número y torneo directamente del jornadaId (ej: "apertura_02" → 2, "apertura")
        if (filteredMatches.length > 0) {
          const firstMatch = filteredMatches[0]!;
          const parts = firstMatch.jornadaId.split('_');
          if (parts.length >= 2 && parts[0] && parts[1]) {
            setCurrentFecha(parseInt(parts[1], 10));
            setCurrentTorneo(parts[0]);
          }
        }

        // Asegurarse de que solo se establezcan los partidos filtrados
        if (filteredMatches.length > 0) {
          setUpcomingMatches(filteredMatches);
        } else {
          setUpcomingMatches([]);
        }
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (!loading) {
      loadDashboardData();
      
      // Actualizar automáticamente cada hora para detectar cuando cambia el día
      // y mostrar la siguiente fecha próxima
      const interval = setInterval(() => {
        loadDashboardData();
      }, 60 * 60 * 1000); // Cada hora

      return () => clearInterval(interval);
    }
  }, [loading]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <DashboardLayout>
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
    </DashboardLayout>
  );
}
