/**
 * Entidad de Dominio: Match (Partido)
 * Representa un partido de fútbol de la Liga 1
 */

export type EstadoMatch = 'pendiente' | 'envivo' | 'finalizado' | 'anulado' | 'suspendido';

export interface Match {
  /** ID único del partido (ej: "ali_uni") */
  id: string;

  /** ID del equipo local (código de 3 letras, ej: "ali") */
  equipoLocalId: string | null;

  /** ID del equipo visitante (código de 3 letras, ej: "uni") */
  equipoVisitanteId: string | null;

  /** Fecha y hora del partido */
  fecha: Date;

  /** Goles del equipo local */
  golesEquipoLocal: number;

  /** Goles del equipo visitante */
  golesEquipoVisitante: number;

  /** Estado actual del partido */
  estado: EstadoMatch;

  /** Indica si el partido está suspendido */
  suspendido: boolean;

  /** Estadio donde se juega el partido (opcional) */
  estadio?: string;

  /** Número de jornada a la que pertenece */
  jornadaNumero?: number;

  /** Fecha/hora cuando el partido cambió a estado "envivo" */
  horaInicio?: Date;

  /** Minuto actual del partido (0-90+) calculado desde horaInicio */
  minutoActual?: number;

  /** Tiempo agregado al final de cada tiempo (en minutos) */
  tiempoAgregado?: number;

  /** Indica si está en primera parte (true) o segunda parte (false) */
  primeraParte?: boolean;
}

/**
 * Utilidad para crear un partido con valores por defecto
 */
export const createEmptyMatch = (
  equipoLocalId: string,
  equipoVisitanteId: string,
  fecha: Date
): Omit<Match, 'id'> => ({
  equipoLocalId,
  equipoVisitanteId,
  fecha,
  golesEquipoLocal: 0,
  golesEquipoVisitante: 0,
  estado: 'pendiente',
  suspendido: false,
});

/**
 * Verifica si un partido está en vivo
 */
export const isMatchLive = (match: Match): boolean => {
  return match.estado === 'envivo';
};

/**
 * Verifica si un partido ha finalizado
 */
export const isMatchFinished = (match: Match): boolean => {
  return match.estado === 'finalizado';
};

/**
 * Obtiene el resultado del partido en formato "X - Y"
 */
export const getMatchScore = (match: Match): string => {
  return `${match.golesEquipoLocal} - ${match.golesEquipoVisitante}`;
};

/**
 * Determina el ganador del partido
 */
export const getMatchWinner = (
  match: Match
): 'local' | 'visitante' | 'empate' | null => {
  if (match.estado !== 'finalizado') return null;

  if (match.golesEquipoLocal > match.golesEquipoVisitante) return 'local';
  if (match.golesEquipoLocal < match.golesEquipoVisitante) return 'visitante';
  return 'empate';
};

/**
 * Calcula los minutos transcurridos desde que inició el partido
 * Retorna 0 si no hay horaInicio o si el partido no está en vivo
 */
export const getMatchElapsedMinutes = (match: Match): number => {
  if (!match.horaInicio || match.estado !== 'envivo') {
    return 0;
  }

  const now = new Date();
  const inicio = match.horaInicio instanceof Date 
    ? match.horaInicio 
    : new Date(match.horaInicio);

  const diffMs = now.getTime() - inicio.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return Math.max(0, diffMinutes);
};

/**
 * Verifica si un partido puede ser finalizado
 * Debe estar en vivo, haber completado 90 minutos reglamentarios,
 * y si hay tiempo agregado configurado, haberlo completado también
 */
export const canFinishMatch = (match: Match): boolean => {
  if (match.estado !== 'envivo') {
    return false;
  }

  const minutosTranscurridos = getMatchElapsedMinutes(match);
  const tiempoAgregado = match.tiempoAgregado || 0;
  
  // Si ya pasaron los 90 minutos, necesita tener tiempo agregado configurado
  if (minutosTranscurridos >= 90 && tiempoAgregado === 0) {
    return false; // No puede finalizar hasta configurar minutos adicionales
  }
  
  // El partido puede finalizarse cuando han pasado 90 minutos + minutos adicionales configurados
  return minutosTranscurridos >= (90 + tiempoAgregado);
};

/**
 * Obtiene el minuto actual formateado con tiempo agregado
 * Ejemplo: "45' +2" o "90' +5"
 */
export const getFormattedMatchMinute = (match: Match): string => {
  const minutosTranscurridos = getMatchElapsedMinutes(match);
  const tiempoAgregado = match.tiempoAgregado || 0;
  const minutoActual = Math.min(minutosTranscurridos, 90);
  
  if (minutoActual === 0 && tiempoAgregado === 0) {
    return "0'";
  }

  if (tiempoAgregado > 0 && minutoActual >= 45) {
    return `${minutoActual}' +${tiempoAgregado}`;
  }

  return `${minutoActual}'`;
};

/**
 * Determina si el partido está en primera o segunda parte
 */
export const isFirstHalf = (match: Match): boolean => {
  const minutosTranscurridos = getMatchElapsedMinutes(match);
  return minutosTranscurridos < 45;
};
