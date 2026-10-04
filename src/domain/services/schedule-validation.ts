/**
 * Validación de horarios de una jornada.
 *
 * Sin imports a propósito: lo usan tanto el admin (Next) como los scripts de
 * Node (`scripts/*.mjs`), que cargan este archivo directamente.
 */

/**
 * Fecha placeholder con la que se genera el Clausura (11:00 hora de Lima).
 * Un partido con esta fecha todavía no tiene hora oficial.
 */
export const CLAUSURA_PLACEHOLDER_DATE = new Date('2026-07-17T11:00:00-05:00');

// Versión anterior del generador: `new Date('2026-07-17T11:00:00')` sin zona,
// que según dónde corría quedaba a las 11:00 UTC.
const LEGACY_PLACEHOLDER_TIMESTAMP = Date.UTC(2026, 6, 17, 11, 0, 0);

/** La Liga 1 tiene 18 equipos: 9 partidos por jornada. */
export const MATCHES_PER_JORNADA = 9;

export function isPlaceholderFecha(fecha: Date): boolean {
  const time = fecha.getTime();
  return (
    time === CLAUSURA_PLACEHOLDER_DATE.getTime() ||
    time === LEGACY_PLACEHOLDER_TIMESTAMP
  );
}

export type ScheduleValidation =
  | { ok: true; fechaInicio: Date; fechaFin: Date }
  | { ok: false; reason: string };

export interface ScheduleValidationOptions {
  /**
   * Trata como provisional una jornada con todos los partidos en el mismo
   * instante (así se cargan las fechas tentativas antes de que salga la
   * programación). No usar con horarios oficiales: la última fecha del torneo
   * sí puede jugarse toda a la misma hora.
   */
  rejectUniformTimes?: boolean;
}

/**
 * Una jornada tiene horarios confirmados si tiene partidos y ninguno conserva
 * la fecha placeholder. Devuelve el rango (`fechaInicio`/`fechaFin`) que usa
 * la app para decidir cuándo mostrarla.
 */
export function validateJornadaSchedule(
  fechas: Date[],
  expectedMatches?: number,
  options: ScheduleValidationOptions = {}
): ScheduleValidation {
  if (fechas.length === 0) {
    return { ok: false, reason: 'La jornada no tiene partidos' };
  }
  if (expectedMatches !== undefined && fechas.length !== expectedMatches) {
    return {
      ok: false,
      reason: `Se esperaban ${expectedMatches} partidos y hay ${fechas.length}`,
    };
  }

  const pending = fechas.filter(isPlaceholderFecha).length;
  if (pending > 0) {
    return {
      ok: false,
      reason: `${pending} partido(s) todavía con la fecha placeholder`,
    };
  }

  const times = fechas.map((fecha) => fecha.getTime());
  if (options.rejectUniformTimes && times.length > 1 && new Set(times).size === 1) {
    return {
      ok: false,
      reason: 'Todos los partidos tienen la misma fecha y hora (parece provisional)',
    };
  }

  return {
    ok: true,
    fechaInicio: new Date(Math.min(...times)),
    fechaFin: new Date(Math.max(...times)),
  };
}
