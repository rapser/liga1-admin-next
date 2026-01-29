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
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

const teamRepository = new TeamRepository();

export default function PosicionesPage() {
  const { loading: authLoading } = useRequireAuth();
  const [aperturaTeams, setAperturaTeams] = useState<Team[]>([]);
  const [clausuraTeams, setClausuraTeams] = useState<Team[]>([]);
  const [acumuladoTeams, setAcumuladoTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true);

        // Solo cargar tabla de apertura (clausura y acumulado no se cargan todavía)
        const apertura = await teamRepository.fetchStandings('apertura');

        // Ordenar equipos por posición
        setAperturaTeams([...apertura].sort(compareTeams));
        // Clausura y acumulado se mantienen vacíos (empty view)
        setClausuraTeams([]);
        setAcumuladoTeams([]);
      } catch (error) {
        console.error('Error al cargar las tablas:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadTables();
    }
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[#67748e]">Cargando tablas de posiciones...</p>
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
          <div className="text-center text-[#67748e]">
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
        <CardTitle className="text-[#344767]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e9ecef]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  Pos
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  Equipo
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  PJ
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  PG
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  PE
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  PP
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  GF
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  GC
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
                  DG
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[#67748e] uppercase tracking-wider">
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
                    className="border-b border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                            isChampion
                              ? 'bg-gradient-success text-white'
                              : 'bg-[#e9ecef] text-[#67748e]'
                          }`}
                        >
                          {position}
                        </span>
                        {isChampion && <Trophy className="h-4 w-4 text-[#fbc400]" />}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-[#344767]">{team.nombre}</span>
                    </td>
                    <td className="py-4 px-4 text-center text-[#67748e]">
                      {team.partidosJugados}
                    </td>
                    <td className="py-4 px-4 text-center text-[#67748e]">
                      {team.partidosGanados}
                    </td>
                    <td className="py-4 px-4 text-center text-[#67748e]">
                      {team.partidosEmpatados}
                    </td>
                    <td className="py-4 px-4 text-center text-[#67748e]">
                      {team.partidosPerdidos}
                    </td>
                    <td className="py-4 px-4 text-center text-[#67748e]">
                      {team.golesFavor}
                    </td>
                    <td className="py-4 px-4 text-center text-[#67748e]">
                      {team.golesContra}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`font-semibold ${
                          team.diferenciaGoles > 0
                            ? 'text-success'
                            : team.diferenciaGoles < 0
                            ? 'text-destructive'
                            : 'text-[#67748e]'
                        }`}
                      >
                        {team.diferenciaGoles > 0 ? '+' : ''}
                        {team.diferenciaGoles}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-[#344767] text-lg">
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
            <span className="text-[#67748e]">Clasificación directa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-info"></div>
            <span className="text-[#67748e]">Playoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gradient-error"></div>
            <span className="text-[#67748e]">Descenso</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
