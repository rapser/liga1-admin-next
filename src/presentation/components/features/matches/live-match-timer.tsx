/**
 * Componente LiveMatchTimer
 * Muestra el minutero en formato MM:SS como en TV
 */

"use client";

import { Match } from "@/domain/entities/match.entity";
import { useMatchTimer } from "@/presentation/hooks/use-match-timer";

interface LiveMatchTimerProps {
  match: Match;
  showAddedTime?: boolean;
}

/**
 * Calcula los segundos transcurridos desde que inició el partido
 */
const getMatchElapsedSeconds = (match: Match): number => {
  if (!match.horaInicio || match.estado !== "envivo") {
    return 0;
  }

  // Si está en descanso, retornar 45 minutos en segundos
  if (match.enDescanso) {
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    return (45 + tiempoAgregadoPrimera) * 60;
  }

  const now = new Date();
  const inicio =
    match.horaInicio instanceof Date
      ? match.horaInicio
      : new Date(match.horaInicio);

  // Si ya inició la segunda parte, calcular desde el inicio de la segunda parte
  if (match.horaInicioSegundaParte && !match.primeraParte) {
    const inicioSegundaParte =
      match.horaInicioSegundaParte instanceof Date
        ? match.horaInicioSegundaParte
        : new Date(match.horaInicioSegundaParte);

    const diffMs = now.getTime() - inicioSegundaParte.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    // Segunda parte: el reloj base vuelve a 45:00 (NO suma el adicional del 1T)
    return 45 * 60 + Math.max(0, diffSeconds);
  }

  // Primera parte: calcular desde el inicio
  const diffMs = now.getTime() - inicio.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  return Math.max(0, diffSeconds);
};

/**
 * Formatea segundos a formato MM:SS
 */
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export function LiveMatchTimer({
  match,
  showAddedTime = false,
}: LiveMatchTimerProps) {
  const { isActive, primeraParte, tiempoAgregado, tiempoAgregadoPrimera } =
    useMatchTimer(match.estado === "envivo" ? match : null, 1000);

  if (!isActive) {
    return null;
  }

  const totalSeconds = getMatchElapsedSeconds(match);
  const tiempoAgregadoPrimeraParte = match.tiempoAgregadoPrimeraParte || 0;
  const tiempoAgregadoSegundo = match.tiempoAgregado || 0;

  // Si está en descanso - mostrar solo [45:00] sin minutos adicionales visibles
  if (match.enDescanso) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-5xl font-bold text-[#344767]">
          {formatTime(45 * 60)}
        </div>
        <div className="text-base font-semibold text-yellow-600">Descanso</div>
      </div>
    );
  }

  // Primera parte
  if (primeraParte && !match.enDescanso) {
    const minutosTranscurridos = Math.floor(totalSeconds / 60);

    // Si hay tiempo agregado configurado pero aún no se llegó a 45, mostrar [40:00][+4]
    if (minutosTranscurridos < 45 && tiempoAgregadoPrimeraParte > 0) {
      return (
        <div className="flex items-center gap-2">
          <div className="text-5xl font-bold text-[#344767]">
            {formatTime(totalSeconds)}
          </div>
          {showAddedTime && (
            <div className="text-3xl font-semibold text-[#67748e]">
              [+{tiempoAgregadoPrimeraParte}]
            </div>
          )}
        </div>
      );
    }

    // Si ya pasaron los 45 minutos y hay tiempo agregado configurado
    if (minutosTranscurridos >= 45 && tiempoAgregadoPrimeraParte > 0) {
      const minutosAdicionalesTranscurridos = minutosTranscurridos - 45;
      const segundosTranscurridos = totalSeconds % 60;
      const segundosAdicionales =
        minutosAdicionalesTranscurridos * 60 + segundosTranscurridos;

      return (
        <div className="flex flex-col items-center gap-2">
          {/* Línea superior: 45:00 [+4] */}
          <div className="flex items-center gap-2">
            <div className="text-5xl font-bold text-[#344767]">
              {formatTime(45 * 60)}
            </div>
            {showAddedTime && (
              <div className="text-3xl font-semibold text-[#67748e]">
                [+{tiempoAgregadoPrimeraParte}]
              </div>
            )}
          </div>
          {/* Línea inferior: 1:10 (progreso de adicionales) */}
          {showAddedTime && (
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-[#344767]">
                {formatTime(segundosAdicionales)}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Antes de los 45 minutos - mostrar timer normal
    return (
      <div className="text-5xl font-bold text-[#344767]">
        {formatTime(totalSeconds)}
      </div>
    );
  }

  // Segunda parte
  // En segunda parte, totalSeconds ya incluye el offset base 45:00
  const segundosSegundaParte = totalSeconds - 45 * 60;
  const minutosSegundaParte = Math.floor(segundosSegundaParte / 60);
  const minutosTotales = 45 + tiempoAgregadoPrimera + minutosSegundaParte;

  // Si hay tiempo agregado configurado pero aún no se llegó a 90, mostrar [85:00][+5]
  if (minutosTotales < 90 && tiempoAgregadoSegundo > 0) {
    const minutosDisplay = 45 + tiempoAgregadoPrimera + minutosSegundaParte;
    const segundosDisplay = segundosSegundaParte % 60;

    return (
      <div className="flex items-center gap-2">
        <div className="text-5xl font-bold text-[#344767]">
          {formatTime(minutosDisplay * 60 + segundosDisplay)}
        </div>
        {showAddedTime && (
          <div className="text-3xl font-semibold text-[#67748e]">
            [+{tiempoAgregadoSegundo}]
          </div>
        )}
      </div>
    );
  }

  // Si ya pasaron los 90 minutos y hay tiempo agregado configurado
  if (minutosTotales >= 90 && tiempoAgregadoSegundo > 0) {
    const minutosAdicionalesTranscurridos = minutosTotales - 90;
    const segundosAdicionales =
      minutosAdicionalesTranscurridos * 60 + (segundosSegundaParte % 60);

    // LIMITAR el tiempo adicional al máximo configurado (no debe exceder tiempoAgregadoSegundo minutos)
    const segundosAdicionalesMaximos = tiempoAgregadoSegundo * 60;
    const segundosAdicionalesLimitados = Math.min(
      segundosAdicionales,
      segundosAdicionalesMaximos,
    );

    return (
      <div className="flex flex-col items-center gap-2">
        {/* Línea superior: 90:00 [+6] */}
        <div className="flex items-center gap-2">
          <div className="text-5xl font-bold text-[#344767]">
            {formatTime(90 * 60)}
          </div>
          {showAddedTime && (
            <div className="text-3xl font-semibold text-[#67748e]">
              [+{tiempoAgregadoSegundo}]
            </div>
          )}
        </div>
        {/* Línea inferior: 6:00 (progreso de adicionales, limitado al máximo) */}
        {showAddedTime && (
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-[#344767]">
              {formatTime(segundosAdicionalesLimitados)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Antes de los 90 minutos en segunda parte - mostrar timer normal
  const minutosDisplay = 45 + tiempoAgregadoPrimera + minutosSegundaParte;
  const segundosDisplay = segundosSegundaParte % 60;

  return (
    <div className="text-5xl font-bold text-[#344767]">
      {formatTime(minutosDisplay * 60 + segundosDisplay)}
    </div>
  );
}
