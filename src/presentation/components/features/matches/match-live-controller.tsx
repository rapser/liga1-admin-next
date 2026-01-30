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
} from "@/domain/entities/match.entity";
import { MatchStateService } from "@/domain/services/match-state.service";
import { Button } from "@/components/ui/button";
import { MatchScoreEditor } from "./match-score-editor";
import { LiveMatchTimer } from "./live-match-timer";
import { AddTimeConfig } from "./add-time-config";
import { AddFirstHalfTimeConfig } from "./add-first-half-time-config";
import { PushNotificationModal } from "./push-notification-modal";
import { useMatchTimer } from "@/presentation/hooks/use-match-timer";
import { Play, Square, Loader2, Bell, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { TorneoType } from "@/core/config/firestore-constants";

interface MatchLiveControllerProps {
  match: Match;
  jornadaId: string;
  torneo: TorneoType;
  matchStateService: MatchStateService;
  onStateChange?: () => void;
}

/**
 * Calcula los segundos transcurridos desde que inició el partido
 */
const getMatchElapsedSeconds = (match: Match): number => {
  if (!match.horaInicio || match.estado !== "envivo") {
    return 0;
  }

  if (match.enDescanso) {
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    return (45 + tiempoAgregadoPrimera) * 60;
  }

  const now = new Date();
  const inicio =
    match.horaInicio instanceof Date
      ? match.horaInicio
      : new Date(match.horaInicio);

  if (match.horaInicioSegundaParte && !match.primeraParte) {
    const inicioSegundaParte =
      match.horaInicioSegundaParte instanceof Date
        ? match.horaInicioSegundaParte
        : new Date(match.horaInicioSegundaParte);

    const diffMs = now.getTime() - inicioSegundaParte.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    // Segunda parte: el reloj base vuelve a 45:00 (NO suma el adicional del 1T)
    const segundosSegundaParte = Math.max(0, diffSeconds);
    const segundosTotales = 45 * 60 + segundosSegundaParte;

    // LIMITAR el tiempo total: si hay tiempo agregado configurado, máximo es 90 + tiempo agregado
    // Si no hay tiempo agregado configurado, máximo es 90 minutos
    const tiempoAgregado = match.tiempoAgregado || 0;
    const segundosMaximos =
      tiempoAgregado > 0 ? (90 + tiempoAgregado) * 60 : 90 * 60;

    return Math.min(segundosTotales, segundosMaximos);
  }

  const diffMs = now.getTime() - inicio.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  return Math.max(0, diffSeconds);
};

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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Log inicial para verificar que el componente se está renderizando
  console.log(
    "[MatchLiveController] Componente renderizado, estado:",
    match.estado,
  );

  // Usar el hook useMatchTimer que actualiza cada segundo
  // El hook fuerza re-renders cada segundo porque actualiza currentTime internamente
  const { minutoActual, primeraParte, tiempoAgregado, tiempoAgregadoPrimera } =
    useMatchTimer(match.estado === "envivo" ? match : null, 1000);

  // Forzar re-render cada segundo cuando el partido está en vivo
  // Esto asegura que getMatchElapsedMinutes se recalcule y los componentes condicionales se muestren
  useEffect(() => {
    if (match.estado !== "envivo") {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [match.estado]);

  const handleStartMatch = async () => {
    if (match.estado !== "pendiente") {
      toast.error("Solo se puede iniciar un partido en estado pendiente");
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.startMatch(jornadaId, match.id, torneo);
      toast.success("Partido iniciado exitosamente");
      onStateChange?.();
    } catch (error: any) {
      console.error("Error al iniciar partido:", error);
      toast.error(error?.message || "Error al iniciar el partido");
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
      await matchStateService.finishMatch(jornadaId, match.id, torneo);
      toast.success("Partido finalizado exitosamente");
      onStateChange?.();
    } catch (error: any) {
      console.error("Error al finalizar partido:", error);
      toast.error(error?.message || "Error al finalizar el partido");
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
      onStateChange?.();
    } catch (error: any) {
      console.error("Error al actualizar marcador:", error);
      toast.error(error?.message || "Error al actualizar el marcador");
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
      onStateChange?.();
    } catch (error: any) {
      console.error("Error al reanudar segunda parte:", error);
      toast.error(error?.message || "Error al reanudar la segunda parte");
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
            onStateChange?.();
          } catch (error: any) {
            console.error("Error al poner partido en descanso:", error);
          }
        }
        // Si ya se configuraron minutos adicionales y se completaron los 45 + minutos adicionales
        else if (
          tiempoAgregadoPrimera > 0 &&
          minutosTranscurridos >= 45 + tiempoAgregadoPrimera
        ) {
          try {
            await matchStateService.finishFirstHalf(jornadaId, match.id);
            onStateChange?.();
          } catch (error: any) {
            console.error("Error al poner partido en descanso:", error);
          }
        }
      };

      const interval = setInterval(checkFirstHalfCompletion, 5000);
      return () => clearInterval(interval);
    }
  }, [match, jornadaId, matchStateService, onStateChange]);

  // Auto-finalizar partido después de 1 minuto de consumir los minutos adicionales
  useEffect(() => {
    if (match.estado === "envivo" && !match.enDescanso && !match.primeraParte) {
      const checkAutoFinish = async () => {
        const tiempoAgregado = match.tiempoAgregado || 0;

        // Solo si hay tiempo agregado configurado
        if (tiempoAgregado > 0) {
          const totalSeconds = getMatchElapsedSeconds(match);
          const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;

          // Calcular segundos desde que inició la segunda parte
          if (match.horaInicioSegundaParte) {
            const now = new Date();
            const inicioSegundaParte =
              match.horaInicioSegundaParte instanceof Date
                ? match.horaInicioSegundaParte
                : new Date(match.horaInicioSegundaParte);

            const segundosSegundaParte = Math.floor(
              (now.getTime() - inicioSegundaParte.getTime()) / 1000,
            );
            const minutosSegundaParte = Math.floor(segundosSegundaParte / 60);

            // Si ya pasaron los 45 minutos de la segunda parte (90 totales) + minutos adicionales
            if (minutosSegundaParte >= 45 + tiempoAgregado) {
              const segundosAdicionalesTranscurridos =
                segundosSegundaParte - 45 * 60;

              // Tolerancia: 5 minutos después de consumir los adicionales
              if (
                segundosAdicionalesTranscurridos >=
                tiempoAgregado * 60 + 5 * 60
              ) {
                try {
                  await matchStateService.finishMatch(
                    jornadaId,
                    match.id,
                    torneo,
                  );
                  toast.info(
                    "Partido finalizado automáticamente después de consumir los minutos adicionales",
                  );
                  onStateChange?.();
                } catch (error: any) {
                  console.error(
                    "Error al finalizar partido automáticamente:",
                    error,
                  );
                }
              }
            }
          }
        }
      };

      const interval = setInterval(checkAutoFinish, 5000);
      return () => clearInterval(interval);
    }
  }, [match, jornadaId, torneo, matchStateService, onStateChange]);

  // Estado: Pendiente - Mostrar botón para iniciar
  if (match.estado === "pendiente") {
    return (
      <div className="flex items-center gap-2">
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
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Partido
            </>
          )}
        </Button>
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

    const tieneTiempoAgregado = tiempoAgregado > 0;

    // Calcular si se completaron los minutos adicionales
    // Necesitamos calcular los segundos transcurridos desde que inició la segunda parte
    let segundosAdicionalesTranscurridos = 0;
    if (
      estaEnSegundaParte &&
      tieneTiempoAgregado &&
      match.horaInicioSegundaParte
    ) {
      const now = new Date();
      const inicioSegundaParte =
        match.horaInicioSegundaParte instanceof Date
          ? match.horaInicioSegundaParte
          : new Date(match.horaInicioSegundaParte);

      const diffMs = now.getTime() - inicioSegundaParte.getTime();
      const segundosDesdeInicioSegundaParte = Math.floor(diffMs / 1000);

      // Los 45 minutos de la segunda parte = 45 * 60 = 2700 segundos
      // Si ya pasaron más de 2700 segundos, entonces estamos en tiempo adicional
      if (segundosDesdeInicioSegundaParte > 45 * 60) {
        segundosAdicionalesTranscurridos =
          segundosDesdeInicioSegundaParte - 45 * 60;
      }
    }

    const segundosTiempoAgregadoMaximo = tiempoAgregado * 60;
    const haCompletadoTiempoAgregado =
      estaEnSegundaParte &&
      tieneTiempoAgregado &&
      segundosAdicionalesTranscurridos >= segundosTiempoAgregadoMaximo;

    // También verificar con minutos como fallback
    const haCompletadoTiempoAgregadoMinutos =
      estaEnSegundaParte &&
      tieneTiempoAgregado &&
      minutosTranscurridos >= 90 + tiempoAgregado;

    // Usar la condición más precisa para mostrar el botón de finalizar
    const mostrarFinalizar =
      haCompletadoTiempoAgregado || haCompletadoTiempoAgregadoMinutos;

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
              <p className="text-sm text-[#67748e]">
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
          <div className="flex items-center justify-center pt-2 border-t border-[#e9ecef]">
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
              onTimeUpdated={onStateChange}
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
              onTimeUpdated={onStateChange}
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
        <div className="flex items-center justify-center pt-2 border-t border-[#e9ecef]">
          <MatchScoreEditor
            match={match}
            onScoreChange={handleScoreChange}
            disabled={isProcessing}
          />
        </div>

        {/* Botón para Enviar Notificaciones Push */}
        <div className="flex items-center justify-center pt-2 border-t border-[#e9ecef]">
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
