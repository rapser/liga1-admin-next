/**
 * Componente MatchLiveController
 * Controla el estado del partido con nuevo UI mejorado
 */

"use client";

import { useState, useEffect } from "react";
import {
  Match,
  canFinishMatch,
  getMatchElapsedMinutes,
  isMatchAlreadyPlayed,
} from "@/domain/entities/match.entity";
import { MatchStateService } from "@/domain/services/match-state.service";
import { Button } from "@/components/ui/button";
import { MatchScoreEditor } from "./match-score-editor";
import { LiveMatchTimer } from "./live-match-timer";
import { AddTimeConfig } from "./add-time-config";
import { AddFirstHalfTimeConfig } from "./add-first-half-time-config";
import { PushNotificationModal } from "./push-notification-modal";
import { useMatchTimer } from "@/presentation/hooks/use-match-timer";
import { Play, Square, Loader2, Bell, PlayCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { TorneoType } from "@/core/config/firestore-constants";

interface MatchLiveControllerProps {
  match: Match;
  jornadaId: string;
  torneo: TorneoType;
  matchStateService: MatchStateService;
  onStateChange?: (updates?: Partial<Match>) => void;
}


/**
 * Calcula los segundos transcurridos en el descanso
 * El descanso comienza cuando se completa el primer tiempo (45 + tiempo agregado)
 */
const getHalftimeElapsedSeconds = (match: Match): number => {
  if (!match.enDescanso || !match.horaInicio) {
    return 0;
  }

  const now = new Date();
  const inicio =
    match.horaInicio instanceof Date
      ? match.horaInicio
      : new Date(match.horaInicio);

  // Calcular desde cuando terminó el primer tiempo (45 + tiempo agregado)
  const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
  const finPrimerTiempo = new Date(inicio);
  finPrimerTiempo.setMinutes(
    finPrimerTiempo.getMinutes() + 45 + tiempoAgregadoPrimera,
  );

  const diffMs = now.getTime() - finPrimerTiempo.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
};

/**
 * Formatea segundos a formato MM:SS
 */
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export function MatchLiveController({
  match,
  jornadaId,
  torneo,
  matchStateService,
  onStateChange,
}: MatchLiveControllerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Usar el hook useMatchTimer que actualiza cada segundo
  // El hook fuerza re-renders cada segundo porque actualiza currentTime internamente
  // No se necesita un segundo setInterval — el hook ya maneja las actualizaciones periódicas
  const { minutoActual, primeraParte, tiempoAgregado, tiempoAgregadoPrimera } =
    useMatchTimer(match.estado === "envivo" ? match : null, 1000);

  const handleStartMatch = async () => {
    if (match.estado !== "pendiente") {
      toast.error("Solo se puede iniciar un partido en estado pendiente");
      return;
    }

    const yaSeJugo = isMatchAlreadyPlayed(match);
    const ahora = new Date();
    const fechaPartido =
      match.fecha instanceof Date ? match.fecha : new Date(match.fecha);
    const elapsedMinutes = Math.max(
      0,
      Math.floor((ahora.getTime() - fechaPartido.getTime()) / 60000),
    );

    setIsProcessing(true);
    try {
      await matchStateService.startMatch(jornadaId, match.id, torneo);

      if (yaSeJugo) {
        toast.success(
          "⚡ Modo rápido: Partido ya jugado. Cronómetro en 90+. Actualiza el marcador y finaliza.",
          { duration: 6000 },
        );
      } else if (elapsedMinutes >= 60) {
        const minuto = 45 + Math.min(45, elapsedMinutes - 60);
        toast.success(`Partido iniciado en segunda parte (~${minuto}')`);
      } else if (elapsedMinutes >= 45) {
        toast.success("Partido iniciado — entrando al descanso");
      } else {
        toast.success("Partido iniciado exitosamente");
      }

      onStateChange?.({ estado: "envivo" });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message :"Error al iniciar el partido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishMatch = async () => {
    if (match.estado !== "envivo") {
      toast.error("Solo se puede finalizar un partido en vivo");
      return;
    }

    if (!canFinishMatch(match)) {
      toast.error("El partido debe tener mínimo 90 minutos transcurridos");
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.finishMatch(jornadaId, match.id);
      toast.success("Partido finalizado exitosamente");
      onStateChange?.({ estado: "finalizado" });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message :"Error al finalizar el partido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScoreChange = async (local: number, visitor: number) => {
    try {
      await matchStateService.updateMatchScore(
        jornadaId,
        match.id,
        local,
        visitor,
        torneo,
      );
      onStateChange?.({ golesEquipoLocal: local, golesEquipoVisitante: visitor });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message :"Error al actualizar el marcador");
      throw error;
    }
  };

  const handleResumeSecondHalf = async () => {
    if (!match.enDescanso) {
      toast.error("El partido no está en descanso");
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.resumeSecondHalf(jornadaId, match.id);
      toast.success("Segunda parte iniciada");
      onStateChange?.({ enDescanso: false, primeraParte: false, horaInicioSegundaParte: new Date() });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message :"Error al reanudar la segunda parte");
    } finally {
      setIsProcessing(false);
    }
  };

  // El segundo tiempo solo se inicia manualmente al presionar "Continuar con Segundo Tiempo"

  // Detectar cuando se completan los 45 + minutos adicionales y poner en descanso automáticamente
  useEffect(() => {
    if (match.estado === "envivo" && !match.enDescanso && match.primeraParte) {
      const checkFirstHalfCompletion = async () => {
        const minutosTranscurridos = getMatchElapsedMinutes(match);
        const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;

        // Si no se configuraron minutos adicionales y llegó a 45 minutos, terminar automáticamente
        if (tiempoAgregadoPrimera === 0 && minutosTranscurridos >= 45) {
          try {
            await matchStateService.finishFirstHalf(jornadaId, match.id);
            onStateChange?.({ enDescanso: true });
          } catch {
            // Error silencioso - se reintentará en el siguiente intervalo
          }
        }
        // Si ya se configuraron minutos adicionales y se completaron los 45 + minutos adicionales
        else if (
          tiempoAgregadoPrimera > 0 &&
          minutosTranscurridos >= 45 + tiempoAgregadoPrimera
        ) {
          try {
            await matchStateService.finishFirstHalf(jornadaId, match.id);
            onStateChange?.({ enDescanso: true });
          } catch {
            // Error silencioso - se reintentará en el siguiente intervalo
          }
        }
      };

      const interval = setInterval(checkFirstHalfCompletion, 5000);
      return () => clearInterval(interval);
    }
  }, [match, jornadaId, matchStateService, onStateChange]);


  // Estado: Pendiente - Mostrar botón para iniciar
  if (match.estado === "pendiente") {
    const yaSeJugo = isMatchAlreadyPlayed(match);
    const ahoraRender = new Date();
    const fechaPartidoRender =
      match.fecha instanceof Date ? match.fecha : new Date(match.fecha);
    const elapsedMinutesRender = Math.max(
      0,
      Math.floor(
        (ahoraRender.getTime() - fechaPartidoRender.getTime()) / 60000,
      ),
    );
    const estaEnDescanso =
      !yaSeJugo &&
      elapsedMinutesRender >= 45 &&
      elapsedMinutesRender < 60;
    const estaEnSegundaParte =
      !yaSeJugo && elapsedMinutesRender >= 60;
    const minutoSegundaParte = 45 + Math.min(45, elapsedMinutesRender - 60);

    return (
      <div className="flex flex-col items-start gap-2">
        <Button
          onClick={handleStartMatch}
          disabled={isProcessing}
          className="bg-gradient-liga1 hover:opacity-90"
          size="sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : yaSeJugo ? (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Cargar Resultado
            </>
          ) : estaEnSegundaParte ? (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar 2do Tiempo
            </>
          ) : estaEnDescanso ? (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar (Descanso)
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Partido
            </>
          )}
        </Button>
        {yaSeJugo && (
          <span className="text-xs text-amber-600 font-medium">
            ⚡ Partido ya jugado — irá directo al min. 90
          </span>
        )}
        {estaEnSegundaParte && (
          <span className="text-xs text-blue-500 font-medium">
            ⏱ Comenzará en 2da parte (~{minutoSegundaParte}&apos;)
          </span>
        )}
        {estaEnDescanso && (
          <span className="text-xs text-orange-500 font-medium">
            ⏸ Partido en descanso — entrará en modo descanso
          </span>
        )}
      </div>
    );
  }

  // Estado: En Vivo
  if (match.estado === "envivo") {
    // Calcular minutos transcurridos directamente usando getMatchElapsedMinutes
    // Esto se recalcula cada vez que el componente se renderiza
    const minutosTranscurridos = getMatchElapsedMinutes(match);
    const tiempoAgregado = match.tiempoAgregado || 0;
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    const canFinish = canFinishMatch(match);

    // Lógica para el primer tiempo
    const estaEnPrimeraParte = match.primeraParte && !match.enDescanso;
    const estaCercaDe45Minutos =
      minutosTranscurridos >= 40 && estaEnPrimeraParte;
    // Mostrar el componente desde el 40' en adelante, incluso si ya existe +X (para poder sumar más)
    const puedeAjustarTiempoAgregadoPrimera = estaCercaDe45Minutos;
    const tieneTiempoAgregadoPrimera = tiempoAgregadoPrimera > 0;
    const haCompletadoPrimerTiempo =
      estaEnPrimeraParte &&
      tieneTiempoAgregadoPrimera &&
      minutosTranscurridos >= 45 + tiempoAgregadoPrimera;

    // Lógica para el segundo tiempo
    const estaEnSegundaParte = !match.primeraParte && !match.enDescanso;

    // Mostrar el componente desde el 85' en adelante cuando está en segunda parte
    const estaCercaDe90Minutos =
      minutosTranscurridos >= 85 && estaEnSegundaParte;
    const puedeAjustarTiempoAgregadoSegundo = estaCercaDe90Minutos;

    // Mostrar "Finalizar" cuando se alcanzaron los 90 min + tiempo agregado configurado.
    // Si no se configuró tiempo adicional (tiempoAgregado=0), se puede finalizar a los 90 min.
    const mostrarFinalizar = canFinishMatch(match);

    // Si está en descanso
    if (match.enDescanso) {
      const segundosDescanso = getHalftimeElapsedSeconds(match);
      const minutosDescanso = Math.floor(segundosDescanso / 60);
      const descansoReglamentario = minutosDescanso >= 15;

      return (
        <div className="flex flex-col gap-4">
          {/* Timer en descanso */}
          <div className="flex flex-col items-center gap-2">
            <LiveMatchTimer match={match} showAddedTime={false} />
          </div>

          {/* Botón para iniciar segundo tiempo manualmente - siempre visible en descanso */}
          <div className="flex flex-col items-center gap-2">
            {!descansoReglamentario && (
              <p className="text-sm text-foreground">
                Descanso reglamentario: 15 min. Puedes continuar manualmente
                cuando quieras.
              </p>
            )}
            <Button
              onClick={handleResumeSecondHalf}
              disabled={isProcessing}
              className="bg-gradient-liga1 hover:opacity-90 w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reanudando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Continuar con Segundo Tiempo
                </>
              )}
            </Button>
          </div>

          {/* Editor de Marcador */}
          <div className="flex items-center justify-center pt-2 border-t border-muted">
            <MatchScoreEditor
              match={match}
              onScoreChange={handleScoreChange}
              disabled={true}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Timer principal */}
        <div className="flex flex-col items-center gap-2">
          <LiveMatchTimer match={match} showAddedTime={true} />
        </div>

        {/* Control de Minutos Adicionales del Primer Tiempo - Mostrar a los 40 minutos */}
        {puedeAjustarTiempoAgregadoPrimera && (
          <div className="flex items-center justify-center">
            <AddFirstHalfTimeConfig
              jornadaId={jornadaId}
              matchId={match.id}
              currentAddedTime={tiempoAgregadoPrimera}
              matchStateService={matchStateService}
              onTimeUpdated={() => onStateChange?.()}
            />
          </div>
        )}

        {/* Control de Minutos Adicionales del Segundo Tiempo - Mostrar a los 85 minutos */}
        {/* Ocultar cuando se completaron los minutos adicionales */}
        {puedeAjustarTiempoAgregadoSegundo && !mostrarFinalizar && (
          <div className="flex items-center justify-center">
            <AddTimeConfig
              jornadaId={jornadaId}
              matchId={match.id}
              currentAddedTime={tiempoAgregado}
              matchStateService={matchStateService}
              onTimeUpdated={() => onStateChange?.()}
            />
          </div>
        )}

        {/* Botón Finalizar Partido - Solo cuando se consumieron los minutos adicionales */}
        {mostrarFinalizar && (
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleFinishMatch}
              disabled={isProcessing}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar Partido
                </>
              )}
            </Button>
          </div>
        )}

        {/* Editor de Marcador */}
        <div className="flex items-center justify-center pt-2 border-t border-muted">
          <MatchScoreEditor
            match={match}
            onScoreChange={handleScoreChange}
            disabled={isProcessing}
          />
        </div>

        {/* Botón para Enviar Notificaciones Push */}
        <div className="flex items-center justify-center pt-2 border-t border-muted">
          <Button
            onClick={() => setIsNotificationModalOpen(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            Enviar Notificación Push
          </Button>
        </div>

        {/* Modal de Notificaciones Push */}
        <PushNotificationModal
          open={isNotificationModalOpen}
          onOpenChange={setIsNotificationModalOpen}
          match={match}
        />
      </div>
    );
  }

  // Estado: Finalizado u otros - No mostrar controles
  return null;
}
