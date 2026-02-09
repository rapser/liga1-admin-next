/**
 * Página de Partidos
 * Muestra todos los partidos: próximos, en vivo y finalizados
 */

"use client";

import { useState, useEffect } from "react";
import { useRequireAuth } from "@/presentation/hooks/use-require-auth";
import { DashboardLayout } from "@/presentation/components/layout";
import { PageHeader, StatCard } from "@/presentation/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Match } from "@/domain/entities/match.entity";
import { Jornada } from "@/domain/entities/jornada.entity";
import { MatchRepository } from "@/data/repositories/match.repository";
import { JornadaRepository } from "@/data/repositories/jornada.repository";
import { Trophy, Clock, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getTeamFullName } from "@/core/config/firestore-constants";

const matchRepository = new MatchRepository();
const jornadaRepository = new JornadaRepository();

/**
 * Extrae los códigos de equipos del ID del partido
 * Ejemplo: "uni_ali" -> { local: "uni", visitante: "ali" }
 */
const getTeamsFromMatchId = (
  matchId: string,
): { local: string; visitante: string } => {
  const parts = matchId.split("_");
  return {
    local: parts[0] || "",
    visitante: parts[1] || "",
  };
};

export default function PartidosPage() {
  const { loading: authLoading } = useRequireAuth();
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const unsubscribes: (() => void)[] = [];

    const loadAndObserve = async () => {
      try {
        setLoading(true);
        const jornadas = await jornadaRepository.fetchVisibleJornadas();

        // Carga inicial en paralelo
        const matchesArrays = await Promise.all(
          jornadas.map((j) => matchRepository.fetchMatches(j.id)),
        );

        const matches = matchesArrays
          .flat()
          .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
        setAllMatches(matches);

        // Suscripción en tiempo real por cada jornada visible
        // Cuando un partido cambia estado/marcador, se actualiza automáticamente
        for (const jornada of jornadas) {
          const unsub = matchRepository.observeMatches(jornada.id, (updatedMatches) => {
            setAllMatches(prev => {
              // Reemplazar los partidos de esta jornada con los actualizados
              const otherJornadaMatches = prev.filter(
                m => !updatedMatches.some(um => um.id === m.id)
              );
              return [...otherJornadaMatches, ...updatedMatches]
                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
            });
          });
          unsubscribes.push(unsub);
        }
      } catch {
        // Error silencioso
      } finally {
        setLoading(false);
      }
    };

    loadAndObserve();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground">Cargando partidos...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const enVivoMatches = allMatches.filter(
    (m) => m.estado === "envivo" && !m.suspendido,
  );
  const proximosMatches = allMatches.filter(
    (m) => m.estado === "pendiente" && !m.suspendido,
  );
  const finalizadosMatches = allMatches.filter(
    (m) => m.estado === "finalizado",
  );
  const suspendidosMatches = allMatches.filter((m) => m.suspendido);

  return (
    <DashboardLayout>
      <PageHeader
        title="Partidos"
        description="Gestión de partidos de la Liga 1"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="En Vivo"
          value={enVivoMatches.length}
          icon={Play}
          subtitle="Partidos activos"
          variant="success"
        />
        <StatCard
          title="Próximos"
          value={proximosMatches.length}
          icon={Clock}
          subtitle="Por jugar"
          variant="info"
        />
        <StatCard
          title="Finalizados"
          value={finalizadosMatches.length}
          icon={CheckCircle2}
          subtitle="Completados"
          variant="liga1"
        />
        <StatCard
          title="Suspendidos"
          value={suspendidosMatches.length}
          icon={AlertCircle}
          subtitle="Pospuestos"
          variant="warning"
        />
      </div>

      {/* Tabs de Partidos */}
      <Tabs defaultValue="en-vivo" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
          <TabsTrigger value="en-vivo">
            En Vivo ({enVivoMatches.length})
          </TabsTrigger>
          <TabsTrigger value="proximos">
            Próximos ({proximosMatches.length})
          </TabsTrigger>
          <TabsTrigger value="finalizados">
            Finalizados ({finalizadosMatches.length})
          </TabsTrigger>
          <TabsTrigger value="suspendidos">
            Suspendidos ({suspendidosMatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="en-vivo">
          <MatchesList
            matches={enVivoMatches}
            emptyMessage="No hay partidos en vivo"
          />
        </TabsContent>

        <TabsContent value="proximos">
          <MatchesList
            matches={proximosMatches}
            emptyMessage="No hay partidos próximos"
          />
        </TabsContent>

        <TabsContent value="finalizados">
          <MatchesList
            matches={finalizadosMatches}
            emptyMessage="No hay partidos finalizados"
          />
        </TabsContent>

        <TabsContent value="suspendidos">
          <MatchesList
            matches={suspendidosMatches}
            emptyMessage="No hay partidos suspendidos"
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

interface MatchesListProps {
  matches: Match[];
  emptyMessage: string;
}

function MatchesList({ matches, emptyMessage }: MatchesListProps) {
  if (matches.length === 0) {
    return (
      <Card className="shadow-soft border-0">
        <CardContent className="py-12">
          <div className="text-center text-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}

interface MatchCardProps {
  match: Match;
}

function MatchCard({ match }: MatchCardProps) {
  // Extraer códigos de equipos del ID del partido si no están presentes
  const teams = getTeamsFromMatchId(match.id);
  const equipoLocalId = match.equipoLocalId || teams.local;
  const equipoVisitanteId = match.equipoVisitanteId || teams.visitante;

  const getStatusBadge = () => {
    if (match.suspendido) {
      return (
        <Badge
          variant="outline"
          className="bg-badge-warning-bg text-badge-suspended-text border-badge-warning-border"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Suspendido
        </Badge>
      );
    }

    switch (match.estado) {
      case "pendiente":
        return (
          <Badge
            variant="outline"
            className="bg-badge-warning-bg text-badge-warning-text border-badge-warning-border"
          >
            <Clock className="h-3 w-3 mr-1" />
            {format(match.fecha, "dd/MM/yyyy HH:mm", { locale: es })}
          </Badge>
        );
      case "envivo":
        return (
          <Badge className="bg-gradient-success border-0 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-white mr-2"></div>
            En Vivo
          </Badge>
        );
      case "finalizado":
        return (
          <Badge
            variant="outline"
            className="bg-badge-finalized-bg text-white border-badge-finalized-border"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Final
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-soft border-0 hover:shadow-soft-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Equipo Local */}
          <div className="flex items-center gap-4 flex-1">
            <div className="h-14 w-14 rounded-xl bg-gradient-liga1 flex items-center justify-center text-white font-bold shadow-soft">
              {equipoLocalId?.substring(0, 2).toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-bold text-accent-foreground text-lg">
                {getTeamFullName(equipoLocalId)}
              </p>
              <p className="text-xs text-foreground">Local</p>
            </div>
          </div>

          {/* Marcador o Estado */}
          <div className="flex flex-col items-center gap-2 px-8">
            {match.estado !== "pendiente" ? (
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-accent-foreground">
                  {match.golesEquipoLocal}
                </span>
                <span className="text-2xl text-foreground">-</span>
                <span className="text-4xl font-bold text-accent-foreground">
                  {match.golesEquipoVisitante}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <Trophy className="h-8 w-8 text-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground">VS</p>
              </div>
            )}
            <div>{getStatusBadge()}</div>
          </div>

          {/* Equipo Visitante */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="text-right">
              <p className="font-bold text-accent-foreground text-lg">
                {getTeamFullName(equipoVisitanteId)}
              </p>
              <p className="text-xs text-foreground">Visitante</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-gradient-error flex items-center justify-center text-white font-bold shadow-soft">
              {equipoVisitanteId?.substring(0, 2).toUpperCase() || "?"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
