/**
 * Página de Jornadas
 * Lista todas las jornadas y permite ver los partidos de cada una
 */

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/presentation/hooks/use-require-auth";
import { PageHeader } from "@/presentation/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Match } from "@/domain/entities/match.entity";
import { JornadaRepository } from "@/data/repositories/jornada.repository";
import { MatchRepository } from "@/data/repositories/match.repository";
import { TeamRepository } from "@/data/repositories/team.repository";
import { MatchStateService } from "@/domain/services/match-state.service";
import { PushNotificationService } from "@/domain/services/push-notification.service";
import {
  MatchLiveController,
  WeatherRefreshButton,
} from "@/presentation/components/features/matches";
import {
  CalendarDays,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  Hand,
  Youtube,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { getTeamFullName, TorneoType } from "@/core/config/firestore-constants";

const jornadaRepository = new JornadaRepository();
const matchRepository = new MatchRepository();
const teamRepository = new TeamRepository();
const pushNotificationService = new PushNotificationService();
const matchStateService = new MatchStateService(
  matchRepository,
  teamRepository,
  pushNotificationService,
);

/**
 * Extrae el torneo del ID de la jornada
 * Ejemplo: "apertura_01" -> "apertura" (TorneoType)
 */
const getTorneoTypeFromJornadaId = (jornadaId: string): TorneoType => {
  const parts = jornadaId.split("_");
  const torneo = parts[0]?.toLowerCase();
  return torneo === "apertura" || torneo === "clausura" ? torneo : "apertura";
};

/**
 * Extrae el nombre del torneo del ID de la jornada
 * Ejemplo: "apertura_01" -> "Apertura"
 */
const getTorneoFromJornadaId = (jornadaId: string): string => {
  const parts = jornadaId.split("_");
  if (parts[0]) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return "Torneo";
};

/**
 * Extrae el número de fecha del ID de la jornada
 * Ejemplo: "apertura_01" -> "Fecha 01"
 */
const getFechaFromJornadaId = (jornadaId: string): string => {
  const parts = jornadaId.split("_");
  if (parts[1]) {
    return `Fecha ${parts[1]}`;
  }
  return "Fecha";
};

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

export default function JornadasPage() {
  const { loading: authLoading } = useRequireAuth();
  const { data: jornadasData = [], isLoading: loading } = useQuery({
    queryKey: ["jornadas", "list"],
    queryFn: async () => {
      const data = await jornadaRepository.fetchVisibleJornadas();
      // Extraer el número del ID ("apertura_16" → 16) para ordenar de forma confiable
      // independientemente de si el campo `numero` está poblado en Firestore.
      const parseNum = (id: string) =>
        parseInt(id.split('_').pop() ?? '0', 10) || 0;
      return [...data].sort((a, b) => parseNum(b.id) - parseNum(a.id));
    },
    enabled: !authLoading,
  });
  const jornadas = jornadasData;
  const [selectedJornadaOverride, setSelectedJornadaOverride] = useState<string | null>(null);
  const selectedJornada = selectedJornadaOverride ?? jornadas[0]?.id ?? null;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (!selectedJornada) return;

    const unsubscribe = matchRepository.observeMatches(
      selectedJornada,
      (updatedMatches) => {
        const sorted = [...updatedMatches].sort(
          (a, b) => a.fecha.getTime() - b.fecha.getTime(),
        );
        setMatches(sorted);
        setLoadingMatches(false);
      },
    );

    return () => unsubscribe();
  }, [selectedJornada]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Cargando jornadas...</p>
        </div>
      </div>
    );
  }

  const selectedJornadaData = jornadas.find((j) => j.id === selectedJornada);

  return (
    <>
      <PageHeader
        title={
          selectedJornadaData
            ? getTorneoFromJornadaId(selectedJornadaData.id)
            : "Jornadas"
        }
        description="Temporada 2026"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Jornadas */}
        <Card className="shadow-soft border-0 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-accent-foreground text-lg">
              Jornadas
            </CardTitle>
            <CardDescription>Temporada 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {jornadas.map((jornada) => (
                <button
                  key={jornada.id}
                  onClick={() => {
                    setLoadingMatches(true);
                    setSelectedJornadaOverride(jornada.id);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedJornada === jornada.id
                      ? "bg-gradient-liga1 text-white shadow-soft"
                      : "bg-background hover:bg-muted text-accent-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {getFechaFromJornadaId(jornada.id)}
                      </p>
                      <p
                        className={`text-xs ${
                          selectedJornada === jornada.id
                            ? "text-white/80"
                            : "text-foreground"
                        }`}
                      >
                        {getTorneoFromJornadaId(jornada.id)}
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
                      <CardTitle className="text-accent-foreground text-2xl">
                        {getFechaFromJornadaId(selectedJornadaData.id)}
                      </CardTitle>
                      <CardDescription>
                        {getTorneoFromJornadaId(selectedJornadaData.id)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <WeatherRefreshButton />
                      <Badge
                        variant={
                          selectedJornadaData.mostrar ? "default" : "secondary"
                        }
                        className={
                          selectedJornadaData.mostrar
                            ? "bg-gradient-success border-0"
                            : ""
                        }
                      >
                        {selectedJornadaData.mostrar ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Lista de Partidos */}
              <Card className="shadow-soft border-0">
                <CardHeader>
                  <CardTitle className="text-accent-foreground">
                    Partidos
                  </CardTitle>
                  <CardDescription>
                    {matches.length}{" "}
                    {matches.length === 1 ? "partido" : "partidos"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingMatches ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-foreground text-sm">
                        Cargando partidos...
                      </p>
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-foreground opacity-50" />
                      <p className="text-foreground">
                        No hay partidos en esta jornada
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          jornadaId={selectedJornadaData.id}
                          torneo={getTorneoTypeFromJornadaId(
                            selectedJornadaData.id,
                          )}
                          onMatchChange={(matchId, updates) => {
                            if (updates) {
                              setMatches((prev) =>
                                prev.map((m) =>
                                  m.id === matchId ? { ...m, ...updates } : m,
                                ),
                              );
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}

interface MatchCardProps {
  match: Match;
  jornadaId: string;
  torneo: TorneoType;
  onMatchChange: (matchId: string, updates?: Partial<Match>) => void;
}

function MatchCard({
  match,
  jornadaId,
  torneo,
  onMatchChange,
}: MatchCardProps) {
  const [changingSyncMode, setChangingSyncMode] = useState(false);
  const [resumenYoutubeUrl, setResumenYoutubeUrl] = useState(
    match.resumenYoutubeUrl ?? "",
  );
  const [savingResumen, setSavingResumen] = useState(false);
  // Extraer códigos de equipos del ID del partido si no están presentes
  const teams = getTeamsFromMatchId(match.id);
  const equipoLocalId = match.equipoLocalId || teams.local;
  const equipoVisitanteId = match.equipoVisitanteId || teams.visitante;
  // La automatización es el comportamiento predeterminado de cualquier partido
  // perteneciente a una jornada visible. Solo se muestra control manual cuando
  // fue elegido explícitamente y persistido en Firestore.
  const syncMode = match.syncMode || "auto";
  const canManageManualSync = match.estado === "pendiente";

  useEffect(() => {
    setResumenYoutubeUrl(match.resumenYoutubeUrl ?? "");
  }, [match.resumenYoutubeUrl]);

  const saveResumenYoutube = async () => {
    const normalizedUrl = resumenYoutubeUrl.trim();
    if (normalizedUrl) {
      try {
        const host = new URL(normalizedUrl).hostname.toLowerCase();
        const isYoutubeHost =
          host === "youtu.be" ||
          host === "youtube.com" ||
          host.endsWith(".youtube.com");
        if (!isYoutubeHost) {
          throw new Error("El enlace debe pertenecer a YouTube");
        }
      } catch (error) {
        toast.error("Ingresa un enlace válido de YouTube", {
          description: error instanceof Error ? error.message : undefined,
        });
        return;
      }
    }

    setSavingResumen(true);
    try {
      await matchRepository.updateMatch(jornadaId, match.id, {
        resumenYoutubeUrl: normalizedUrl,
      });
      onMatchChange(match.id, { resumenYoutubeUrl: normalizedUrl });
      toast.success(
        normalizedUrl ? "Resumen oficial guardado" : "Enlace de resumen eliminado",
      );
    } catch (error) {
      toast.error("No se pudo guardar el resumen", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSavingResumen(false);
    }
  };

  const toggleSyncMode = async () => {
    const nextMode = syncMode === "auto" ? "manual" : "auto";
    setChangingSyncMode(true);
    try {
      await matchRepository.updateMatch(jornadaId, match.id, {
        syncMode: nextMode,
      });
      onMatchChange(match.id, { syncMode: nextMode });
      toast.success(
        nextMode === "manual"
          ? "Control manual activado"
          : "Sincronización automática activada",
      );
    } catch (error) {
      toast.error("No se pudo cambiar el modo del partido", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setChangingSyncMode(false);
    }
  };

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
            Pendiente
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
            Finalizado
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 rounded-xl bg-background hover:bg-muted transition-colors space-y-3">
      {/* Información del Partido */}
      <div className="space-y-2">
        {/* Estado Badge (arriba a la derecha) */}
        <div className="flex justify-end">{getStatusBadge()}</div>

        {/* Equipos y marcador (centrado en segunda línea) */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4 flex-1">
            {/* Equipo Local */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="font-semibold text-accent-foreground text-right">
                {getTeamFullName(equipoLocalId)}
              </span>
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-accent-foreground font-bold text-sm shadow-soft">
                {equipoLocalId?.substring(0, 2).toUpperCase() || "?"}
              </div>
            </div>

            {/* Marcador o Hora */}
            <div className="flex flex-col items-center gap-1 min-w-[100px]">
              {match.estado === "pendiente" ? (
                (() => {
                  const fechaPartido =
                    match.fecha instanceof Date
                      ? match.fecha
                      : new Date(match.fecha);
                  const hora = format(fechaPartido, "h:mm a", { locale: es })
                    .replace("AM", "a.m.")
                    .replace("PM", "p.m.");

                  let etiquetaDia: string;
                  if (isToday(fechaPartido)) {
                    etiquetaDia = "Hoy";
                  } else if (isTomorrow(fechaPartido)) {
                    etiquetaDia = "Mañana";
                  } else if (isYesterday(fechaPartido)) {
                    etiquetaDia = "Ayer";
                  } else {
                    // "Sab, 7/2" — día abreviado + día/mes
                    const diaSemana = format(fechaPartido, "EEE", {
                      locale: es,
                    });
                    const diaSemanaCapitalizado =
                      diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
                    etiquetaDia = `${diaSemanaCapitalizado}, ${fechaPartido.getDate()}/${fechaPartido.getMonth() + 1}`;
                  }

                  return (
                    <>
                      <span className="text-xs font-semibold text-accent-foreground">
                        {etiquetaDia}
                      </span>
                      <span className="text-xs text-foreground">{hora}</span>
                    </>
                  );
                })()
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-accent-foreground">
                    {match.golesEquipoLocal}
                  </span>
                  <span className="text-foreground">-</span>
                  <span className="text-2xl font-bold text-accent-foreground">
                    {match.golesEquipoVisitante}
                  </span>
                </div>
              )}
            </div>

            {/* Equipo Visitante */}
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-accent-foreground font-bold text-sm shadow-soft">
                {equipoVisitanteId?.substring(0, 2).toUpperCase() || "?"}
              </div>
              <span className="font-semibold text-accent-foreground">
                {getTeamFullName(equipoVisitanteId)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {canManageManualSync && (
        <div className="space-y-3 pt-2 border-t border-muted">
          <div className="flex items-center justify-center gap-3">
            <Badge variant={syncMode === "auto" ? "default" : "secondary"}>
              {syncMode === "auto" ? (
                <Bot className="h-3 w-3 mr-1" />
              ) : (
                <Hand className="h-3 w-3 mr-1" />
              )}
              {syncMode === "auto" ? "Automático" : "Manual"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={changingSyncMode}
              onClick={toggleSyncMode}
            >
              {syncMode === "auto" ? "Tomar control manual" : "Volver a automático"}
            </Button>
          </div>
          {syncMode === "manual" ? (
            <div className="flex items-center justify-center">
              <MatchLiveController
                match={match}
                jornadaId={jornadaId}
                torneo={torneo}
                matchStateService={matchStateService}
                onStateChange={(updates) => onMatchChange(match.id, updates)}
              />
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              El marcador, estado y horario los controla el proveedor en vivo.
            </p>
          )}
        </div>
      )}

      {match.estado === "finalizado" && (
        <div className="space-y-2 pt-3 border-t border-muted">
          <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
            <Youtube className="h-4 w-4 text-red-600" />
            Resumen oficial de YouTube
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              value={resumenYoutubeUrl}
              onChange={(event) => setResumenYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              aria-label="Enlace al resumen oficial de YouTube"
            />
            <Button
              type="button"
              variant="outline"
              disabled={savingResumen}
              onClick={saveResumenYoutube}
            >
              {savingResumen ? "Guardando..." : "Guardar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Pega únicamente el enlace publicado por el canal oficial.
          </p>
        </div>
      )}
    </div>
  );
}
