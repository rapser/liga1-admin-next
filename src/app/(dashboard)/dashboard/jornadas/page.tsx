/**
 * Página de Jornadas
 * Lista todas las jornadas y permite ver los partidos de cada una
 */

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { DashboardLayout } from '@/presentation/components/layout';
import { PageHeader } from '@/presentation/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Jornada, getJornadaDisplayName } from '@/domain/entities/jornada.entity';
import { Match } from '@/domain/entities/match.entity';
import { JornadaRepository } from '@/data/repositories/jornada.repository';
import { MatchRepository } from '@/data/repositories/match.repository';
import { CalendarDays, Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTeamFullName } from '@/core/config/firestore-constants';

const jornadaRepository = new JornadaRepository();
const matchRepository = new MatchRepository();

export default function JornadasPage() {
  const { loading: authLoading } = useRequireAuth();
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [selectedJornada, setSelectedJornada] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    const loadJornadas = async () => {
      try {
        setLoading(true);
        const data = await jornadaRepository.fetchJornadas();
        // Ordenar por número de jornada
        const sorted = [...data].sort((a, b) => a.numero - b.numero);
        setJornadas(sorted);

        // Seleccionar la jornada 1 por defecto
        if (sorted.length > 0 && sorted[0]) {
          setSelectedJornada(sorted[0].id);
        }
      } catch (error) {
        console.error('Error al cargar jornadas:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadJornadas();
    }
  }, [authLoading]);

  useEffect(() => {
    const loadMatches = async () => {
      if (!selectedJornada) return;

      try {
        setLoadingMatches(true);
        const data = await matchRepository.fetchMatches(selectedJornada);
        // Ordenar por fecha
        const sorted = [...data].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
        setMatches(sorted);
      } catch (error) {
        console.error('Error al cargar partidos:', error);
      } finally {
        setLoadingMatches(false);
      }
    };

    loadMatches();
  }, [selectedJornada]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[#67748e]">Cargando jornadas...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const selectedJornadaData = jornadas.find((j) => j.id === selectedJornada);

  return (
    <DashboardLayout>
      <PageHeader
        title="Jornadas"
        description="Gestión de jornadas y partidos de la Liga 1"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Jornadas */}
        <Card className="shadow-soft border-0 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[#344767] text-lg">Jornadas</CardTitle>
            <CardDescription>Temporada 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {jornadas.map((jornada) => (
                <button
                  key={jornada.id}
                  onClick={() => setSelectedJornada(jornada.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedJornada === jornada.id
                      ? 'bg-gradient-liga1 text-white shadow-soft'
                      : 'bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#344767]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Jornada {jornada.numero}</p>
                      <p className={`text-xs ${
                        selectedJornada === jornada.id ? 'text-white/80' : 'text-[#67748e]'
                      }`}>
                        {jornada.torneo.charAt(0).toUpperCase() + jornada.torneo.slice(1)}
                      </p>
                    </div>
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detalle de Jornada */}
        <div className="lg:col-span-3 space-y-6">
          {selectedJornadaData && (
            <>
              {/* Header de Jornada */}
              <Card className="shadow-soft border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-[#344767] text-2xl">
                        Jornada {selectedJornadaData.numero}
                      </CardTitle>
                      <CardDescription>{getJornadaDisplayName(selectedJornadaData)}</CardDescription>
                    </div>
                    <Badge
                      variant={selectedJornadaData.esActiva ? 'default' : 'secondary'}
                      className={selectedJornadaData.esActiva ? 'bg-gradient-success border-0' : ''}
                    >
                      {selectedJornadaData.esActiva ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Lista de Partidos */}
              <Card className="shadow-soft border-0">
                <CardHeader>
                  <CardTitle className="text-[#344767]">Partidos</CardTitle>
                  <CardDescription>
                    {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingMatches ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-[#67748e] text-sm">Cargando partidos...</p>
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-[#67748e] opacity-50" />
                      <p className="text-[#67748e]">No hay partidos en esta jornada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

interface MatchCardProps {
  match: Match;
}

function MatchCard({ match }: MatchCardProps) {
  const getStatusBadge = () => {
    if (match.suspendido) {
      return (
        <Badge variant="outline" className="bg-[#fef5d3] text-[#fbc400] border-[#fbc400]">
          <AlertCircle className="h-3 w-3 mr-1" />
          Suspendido
        </Badge>
      );
    }

    switch (match.estado) {
      case 'pendiente':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'envivo':
        return (
          <Badge className="bg-gradient-success border-0 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-white mr-2"></div>
            En Vivo
          </Badge>
        );
      case 'finalizado':
        return (
          <Badge variant="outline" className="bg-[#8097bf] text-white border-[#8097bf]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Finalizado
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors">
      <div className="flex items-center gap-4 flex-1">
        {/* Equipo Local */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="font-semibold text-[#344767] text-right">
            {getTeamFullName(match.equipoLocalId)}
          </span>
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#344767] font-bold text-sm shadow-soft">
            {match.equipoLocalId?.substring(0, 2).toUpperCase() || '?'}
          </div>
        </div>

        {/* Marcador o Hora */}
        <div className="flex flex-col items-center gap-1 min-w-[100px]">
          {match.estado === 'pendiente' ? (
            <>
              <span className="text-xs text-[#67748e]">
                {format(match.fecha, 'HH:mm', { locale: es })}
              </span>
              <span className="text-xs text-[#67748e]">
                {format(match.fecha, 'dd MMM', { locale: es })}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#344767]">
                {match.golesEquipoLocal}
              </span>
              <span className="text-[#67748e]">-</span>
              <span className="text-2xl font-bold text-[#344767]">
                {match.golesEquipoVisitante}
              </span>
            </div>
          )}
        </div>

        {/* Equipo Visitante */}
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#344767] font-bold text-sm shadow-soft">
            {match.equipoVisitanteId?.substring(0, 2).toUpperCase() || '?'}
          </div>
          <span className="font-semibold text-[#344767]">
            {getTeamFullName(match.equipoVisitanteId)}
          </span>
        </div>
      </div>

      {/* Estado */}
      <div>{getStatusBadge()}</div>
    </div>
  );
}
