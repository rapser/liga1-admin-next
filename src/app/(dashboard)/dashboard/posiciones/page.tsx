/**
 * Página de Tabla de Posiciones
 * Muestra las tablas de Apertura, Clausura y Acumulado
 */

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { DashboardLayout } from '@/presentation/components/layout';
import { PageHeader } from '@/presentation/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team } from '@/domain/entities/team.entity';
import { TeamRepository } from '@/data/repositories/team.repository';
import { compareTeams } from '@/domain/entities/team.entity';
import { Trophy } from 'lucide-react';

const teamRepository = new TeamRepository();

export default function PosicionesPage() {
  const { loading: authLoading } = useRequireAuth();
  const [aperturaTeams, setAperturaTeams] = useState<Team[]>([]);
  const [clausuraTeams, setClausuraTeams] = useState<Team[]>([]);
  const [acumuladoTeams, setAcumuladoTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // Carga inicial
    const loadInitial = async () => {
      try {
        setLoading(true);
        const apertura = await teamRepository.fetchStandings('apertura');
        setAperturaTeams([...apertura].sort(compareTeams));
        setClausuraTeams([]);
        setAcumuladoTeams([]);
      } catch {
        // Error silencioso en carga inicial
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // Suscripción en tiempo real: actualiza la tabla automáticamente
    // cuando cambian estadísticas de equipos (ej: durante partidos en vivo)
    const unsubscribe = teamRepository.observeStandings('apertura', (teams) => {
      setAperturaTeams([...teams].sort(compareTeams));
    });

    return () => unsubscribe();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground">Cargando tablas de posiciones...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Tabla de Posiciones"
        description="Posiciones de la Liga 1 - Temporada 2026"
      />

      <Tabs defaultValue="apertura" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="apertura">Apertura</TabsTrigger>
          <TabsTrigger value="clausura">Clausura</TabsTrigger>
          <TabsTrigger value="acumulado">Acumulado</TabsTrigger>
        </TabsList>

        <TabsContent value="apertura">
          <StandingsTable teams={aperturaTeams} title="Torneo Apertura" />
        </TabsContent>

        <TabsContent value="clausura">
          <StandingsTable teams={clausuraTeams} title="Torneo Clausura" />
        </TabsContent>

        <TabsContent value="acumulado">
          <StandingsTable teams={acumuladoTeams} title="Tabla Acumulada" />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

interface StandingsTableProps {
  teams: Team[];
  title: string;
}

function StandingsTable({ teams, title }: StandingsTableProps) {
  if (teams.length === 0) {
    return (
      <Card className="shadow-soft border-0">
        <CardContent className="py-12">
          <div className="text-center text-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos disponibles para {title}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="text-accent-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-muted">
                <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  Pos
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  Equipo
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  PJ
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  PG
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  PE
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  PP
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  GF
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  GC
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  DG
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground uppercase tracking-wider">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => {
                const position = index + 1;
                const isChampion = position === 1;

                return (
                  <tr
                    key={team.id}
                    className="border-b border-muted hover:bg-background transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                            isChampion
                              ? 'bg-gradient-success text-white'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {position}
                        </span>
                        {isChampion && <Trophy className="h-4 w-4 text-trophy-gold" />}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-accent-foreground">{team.nombre}</span>
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">
                      {team.partidosJugados}
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">
                      {team.partidosGanados}
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">
                      {team.partidosEmpatados}
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">
                      {team.partidosPerdidos}
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">
                      {team.golesFavor}
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">
                      {team.golesContra}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`font-semibold ${
                          team.diferenciaGoles > 0
                            ? 'text-success'
                            : team.diferenciaGoles < 0
                            ? 'text-destructive'
                            : 'text-foreground'
                        }`}
                      >
                        {team.diferenciaGoles > 0 ? '+' : ''}
                        {team.diferenciaGoles}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-accent-foreground text-lg">
                        {team.puntos}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-success"></div>
            <span className="text-foreground">Clasificación directa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-info"></div>
            <span className="text-foreground">Playoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-error"></div>
            <span className="text-foreground">Descenso</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
