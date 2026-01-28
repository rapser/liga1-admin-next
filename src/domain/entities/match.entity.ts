/**
 * Entidad de Dominio: Match (Partido)
 * Representa un partido de fútbol de la Liga 1
 */

export type EstadoMatch =
  | "pendiente"
  | "envivo"
  | "finalizado"
  | "anulado"
  | "suspendido";

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

  /** Tiempo agregado al final del segundo tiempo (en minutos) */
  tiempoAgregado?: number;

  /** Tiempo agregado al final del primer tiempo (en minutos) */
  tiempoAgregadoPrimeraParte?: number;

  /** Indica si está en primera parte (true) o segunda parte (false) */
  primeraParte?: boolean;

  /** Indica si el partido está en descanso (entre primera y segunda parte) */
  enDescanso?: boolean;

  /** Fecha/hora cuando inició la segunda parte */
  horaInicioSegundaParte?: Date;
}

/**
 * Utilidad para crear un partido con valores por defecto
 */
export const createEmptyMatch = (
  equipoLocalId: string,
  equipoVisitanteId: string,
  fecha: Date,
): Omit<Match, "id"> => ({
  equipoLocalId,
  equipoVisitanteId,
  fecha,
  golesEquipoLocal: 0,
  golesEquipoVisitante: 0,
  estado: "pendiente",
  suspendido: false,
});

/**
 * Verifica si un partido está en vivo
 */
export const isMatchLive = (match: Match): boolean => {
  return match.estado === "envivo";
};

/**
 * Verifica si un partido ha finalizado
 */
export const isMatchFinished = (match: Match): boolean => {
  return match.estado === "finalizado";
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
  match: Match,
): "local" | "visitante" | "empate" | null => {
  if (match.estado !== "finalizado") return null;

  if (match.golesEquipoLocal > match.golesEquipoVisitante) return "local";
  if (match.golesEquipoLocal < match.golesEquipoVisitante) return "visitante";
  return "empate";
};

/**
 * Calcula los minutos transcurridos desde que inició el partido
 * Considera el descanso y la segunda parte
 * Retorna 0 si no hay horaInicio o si el partido no está en vivo
 */
export const getMatchElapsedMinutes = (match: Match): number => {
  if (!match.horaInicio || match.estado !== "envivo") {
    return 0;
  }

  // Si está en descanso, retornar 45 minutos (fin del primer tiempo)
  if (match.enDescanso) {
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    return 45 + tiempoAgregadoPrimera;
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
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Segunda parte: el reloj base vuelve a 45:00 (NO suma el adicional del 1T)
    return 45 + Math.max(0, diffMinutes);
  }

  // Primera parte: calcular desde el inicio
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
  if (match.estado !== "envivo" || match.enDescanso) {
    return false;
  }

  const minutosTranscurridos = getMatchElapsedMinutes(match);
  const tiempoAgregado = match.tiempoAgregado || 0;

  // Si ya pasaron los 90 minutos, necesita tener tiempo agregado configurado
  if (minutosTranscurridos >= 90 && tiempoAgregado === 0) {
    return false; // No puede finalizar hasta configurar minutos adicionales
  }

  // El partido puede finalizarse cuando han pasado 90 minutos + minutos adicionales configurados
  return minutosTranscurridos >= 90 + tiempoAgregado;
};

/**
 * Verifica si el partido debe entrar en descanso (llegó a 45 minutos + tiempo agregado del primer tiempo)
 */
export const shouldEnterHalftime = (match: Match): boolean => {
  if (match.estado !== "envivo" || match.enDescanso || !match.primeraParte) {
    return false;
  }

  const minutosTranscurridos = getMatchElapsedMinutes(match);
  const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;

  // Si ya pasaron los 45 minutos, necesita tener tiempo agregado configurado
  if (minutosTranscurridos >= 45 && tiempoAgregadoPrimera === 0) {
    return true; // Debe configurar minutos adicionales del primer tiempo
  }

  // Debe entrar en descanso cuando han pasado 45 minutos + minutos adicionales configurados
  return minutosTranscurridos >= 45 + tiempoAgregadoPrimera;
};

/**
 * Obtiene el minuto actual formateado con tiempo agregado
 * Ejemplo: "45' +2" o "90' +5"
 */
export const getFormattedMatchMinute = (match: Match): string => {
  if (match.enDescanso) {
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    if (tiempoAgregadoPrimera > 0) {
      return `45' +${tiempoAgregadoPrimera} (Descanso)`;
    }
    return "45' (Descanso)";
  }

  const minutosTranscurridos = getMatchElapsedMinutes(match);

  // Primera parte
  if (match.primeraParte && !match.enDescanso) {
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    const minutoActual = Math.min(minutosTranscurridos, 45);

    if (minutoActual === 0 && tiempoAgregadoPrimera === 0) {
      return "0'";
    }

    if (tiempoAgregadoPrimera > 0 && minutoActual >= 45) {
      return `${minutoActual}' +${tiempoAgregadoPrimera}`;
    }

    return `${minutoActual}'`;
  }

  // Segunda parte
  const tiempoAgregado = match.tiempoAgregado || 0;
  const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
  const minutosSegundaParte =
    minutosTranscurridos - (45 + tiempoAgregadoPrimera);
  const minutoActual = Math.min(minutosSegundaParte, 45) + 45;

  if (tiempoAgregado > 0 && minutosSegundaParte >= 45) {
    return `${minutoActual}' +${tiempoAgregado}`;
  }

  return `${minutoActual}'`;
};

/**
 * Determina si el partido está en primera o segunda parte
 */
export const isFirstHalf = (match: Match): boolean => {
  if (match.enDescanso) {
    return true; // Durante el descanso, técnicamente sigue siendo primera parte
  }
  return match.primeraParte === true;
};
