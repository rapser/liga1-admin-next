/**
 * Hook para calcular y actualizar el minutero de un partido en vivo
 * Calcula los minutos transcurridos desde horaInicio y actualiza cada minuto
 */

import { useState, useEffect, useCallback } from 'react';
import { Match, getMatchElapsedMinutes, isFirstHalf } from '@/domain/entities/match.entity';

interface UseMatchTimerReturn {
  /** Minuto actual del partido (0-90+) */
  minutoActual: number;
  /** Indica si está en primera parte (true) o segunda parte (false) */
  primeraParte: boolean;
  /** Tiempo agregado (puede ser configurado manualmente) */
  tiempoAgregado: number;
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
  updateInterval: number = 1000
): UseMatchTimerReturn {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Actualizar el tiempo actual periódicamente
  useEffect(() => {
    if (!match || match.estado !== 'envivo') {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [match, updateInterval]);

  // Calcular valores derivados
  const minutoActual = match && match.estado === 'envivo'
    ? getMatchElapsedMinutes(match)
    : match?.minutoActual || 0;

  const primeraParte = match && match.estado === 'envivo'
    ? isFirstHalf(match)
    : match?.primeraParte ?? true;

  const tiempoAgregado = match?.tiempoAgregado || 0;

  // Calcular tiempo transcurrido en segundos (más preciso que minutos)
  const tiempoTranscurridoSegundos = useCallback(() => {
    if (!match?.horaInicio || match.estado !== 'envivo') {
      return 0;
    }

    const inicio = match.horaInicio instanceof Date 
      ? match.horaInicio 
      : new Date(match.horaInicio);

    const diffMs = currentTime.getTime() - inicio.getTime();
    return Math.floor(diffMs / 1000);
  }, [match, currentTime]);

  // Calcular minutos adicionales transcurridos (incrementando de 1 en 1 desde 90 hasta tiempoAgregado)
  const minutosAdicionalesTranscurridos = useCallback(() => {
    if (minutoActual < 90 || tiempoAgregado === 0) {
      return 0;
    }
    
    // Los minutos adicionales se cuentan después de los 90 minutos
    // Si han pasado 92 minutos y tiempoAgregado es 5, entonces minutosAdicionalesTranscurridos = 2
    const minutosDespuesDe90 = minutoActual - 90;
    return Math.min(minutosDespuesDe90, tiempoAgregado);
  }, [minutoActual, tiempoAgregado]);

  // Formatear minuto con tiempo agregado
  const minutoFormateado = useCallback(() => {
    if (minutoActual === 0 && tiempoAgregado === 0) {
      return "0'";
    }

    const minutoMostrado = Math.min(minutoActual, 90);
    const minutosAdicionales = minutosAdicionalesTranscurridos();
    
    // Si ya pasaron los 90 minutos y hay tiempo agregado configurado
    if (minutoActual >= 90 && tiempoAgregado > 0) {
      return `90' +${minutosAdicionales}`;
    }
    
    // Si está en primera parte y hay tiempo agregado (después de 45 minutos)
    if (tiempoAgregado > 0 && minutoMostrado >= 45 && !primeraParte) {
      return `${minutoMostrado}' +${tiempoAgregado}`;
    }

    return `${minutoMostrado}'`;
  }, [minutoActual, tiempoAgregado, primeraParte, minutosAdicionalesTranscurridos]);

  const isActive = match?.estado === 'envivo';

  return {
    minutoActual,
    primeraParte,
    tiempoAgregado,
    tiempoTranscurridoSegundos: tiempoTranscurridoSegundos(),
    minutoFormateado: minutoFormateado(),
    isActive,
  };
}
