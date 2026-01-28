/**
 * Hook para calcular y actualizar el minutero de un partido en vivo
 * Calcula los minutos transcurridos desde horaInicio y actualiza cada minuto
 */

import { useState, useEffect, useCallback } from "react";
import {
  Match,
  getMatchElapsedMinutes,
  isFirstHalf,
  getFormattedMatchMinute,
} from "@/domain/entities/match.entity";

interface UseMatchTimerReturn {
  /** Minuto actual del partido (0-90+) */
  minutoActual: number;
  /** Indica si está en primera parte (true) o segunda parte (false) */
  primeraParte: boolean;
  /** Tiempo agregado del segundo tiempo (puede ser configurado manualmente) */
  tiempoAgregado: number;
  /** Tiempo agregado del primer tiempo */
  tiempoAgregadoPrimera: number;
  /** Tiempo transcurrido total en segundos */
  tiempoTranscurridoSegundos: number;
  /** Minuto formateado con tiempo agregado (ej: "45' +2") */
  minutoFormateado: string;
  /** Indica si el partido está activo (en vivo) */
  isActive: boolean;
}

/**
 * Hook para calcular el minutero de un partido en vivo
 * @param match - El partido a monitorear
 * @param updateInterval - Intervalo de actualización en milisegundos (default: 1000 = 1 segundo)
 */
export function useMatchTimer(
  match: Match | null,
  updateInterval: number = 1000,
): UseMatchTimerReturn {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Actualizar el tiempo actual periódicamente
  useEffect(() => {
    if (!match || match.estado !== "envivo") {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [match, updateInterval]);

  // Calcular valores derivados
  const minutoActual =
    match && match.estado === "envivo"
      ? getMatchElapsedMinutes(match)
      : match?.minutoActual || 0;

  const primeraParte =
    match && match.estado === "envivo"
      ? isFirstHalf(match)
      : (match?.primeraParte ?? true);

  const tiempoAgregado = match?.tiempoAgregado || 0;
  const tiempoAgregadoPrimera = match?.tiempoAgregadoPrimeraParte || 0;

  // Calcular tiempo transcurrido en segundos (más preciso que minutos)
  const tiempoTranscurridoSegundos = useCallback(() => {
    if (!match?.horaInicio || match.estado !== "envivo") {
      return 0;
    }

    const inicio =
      match.horaInicio instanceof Date
        ? match.horaInicio
        : new Date(match.horaInicio);

    const diffMs = currentTime.getTime() - inicio.getTime();
    return Math.floor(diffMs / 1000);
  }, [match, currentTime]);

  // Calcular minutos adicionales transcurridos (incrementando de 1 en 1 desde 90 hasta tiempoAgregado)
  // IMPORTANTE: Cuando llega a 90 minutos, el timer se detiene en 90 y solo incrementan los minutos adicionales
  const minutosAdicionalesTranscurridos = useCallback(() => {
    // Si no llegó a 90 minutos o no hay tiempo agregado configurado, retornar 0
    if (minutoActual < 90 || tiempoAgregado === 0) {
      return 0;
    }

    // Cuando ya pasaron los 90 minutos y hay tiempo agregado configurado,
    // calcular cuántos minutos adicionales han transcurrido desde el minuto 90
    // Ejemplo: minutoActual = 92, tiempoAgregado = 5 → minutosAdicionales = 2
    const minutosDespuesDe90 = minutoActual - 90;
    return Math.min(minutosDespuesDe90, tiempoAgregado);
  }, [minutoActual, tiempoAgregado]);

  // Formatear minuto con tiempo agregado usando la función de la entidad
  const minutoFormateado = useCallback(() => {
    if (!match || match.estado !== "envivo") {
      return "0'";
    }
    return getFormattedMatchMinute(match);
  }, [match]);

  const isActive = match?.estado === "envivo";

  return {
    minutoActual,
    primeraParte,
    tiempoAgregado,
    tiempoAgregadoPrimera,
    tiempoTranscurridoSegundos: tiempoTranscurridoSegundos(),
    minutoFormateado: minutoFormateado(),
    isActive,
  };
}
