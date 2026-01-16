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
