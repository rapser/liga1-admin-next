/**
 * Entidad de Dominio: Jornada
 * Representa una jornada (fecha) del torneo de la Liga 1
 */

import { TorneoType } from '@/core/config/firestore-constants';

export interface Jornada {
  /** ID único de la jornada (ej: "apertura_01", "clausura_15") */
  id: string;

  /** Tipo de torneo: apertura o clausura */
  torneo: TorneoType;

  /** Número de la jornada (1-38) */
  numero: number;

  /** Indica si la jornada debe mostrarse en la app */
  mostrar: boolean;

  /** Fecha de inicio de la jornada */
  fechaInicio: Date;

  /** Fecha de fin de la jornada (opcional) */
  fechaFin?: Date;

  /** Indica si es la jornada activa actual */
  esActiva?: boolean;
}

/**
 * Crea una nueva jornada
 */
export const createJornada = (
  torneo: TorneoType,
  numero: number,
  fechaInicio: Date,
  mostrar: boolean = true
): Omit<Jornada, 'id'> => ({
  torneo,
  numero,
  mostrar,
  fechaInicio,
  esActiva: false,
});

/**
 * Genera el ID de una jornada basándose en el torneo y número
 * Formato: "apertura_01", "clausura_15"
 */
export const generateJornadaId = (torneo: TorneoType, numero: number): string => {
  const numeroFormateado = numero.toString().padStart(2, '0');
  return `${torneo}_${numeroFormateado}`;
};

/**
 * Obtiene el nombre completo de la jornada para mostrar
 * Ejemplo: "Jornada 1 - Apertura"
 */
export const getJornadaDisplayName = (jornada: Jornada): string => {
  const torneoCapitalized = jornada.torneo.charAt(0).toUpperCase() + jornada.torneo.slice(1);
  return `Jornada ${jornada.numero} - ${torneoCapitalized}`;
};

/**
 * Verifica si una jornada está en curso (basándose en las fechas)
 */
export const isJornadaInProgress = (jornada: Jornada): boolean => {
  const now = new Date();
  const hasStarted = jornada.fechaInicio <= now;
  const hasEnded = jornada.fechaFin ? jornada.fechaFin <= now : false;

  return hasStarted && !hasEnded;
};

/**
 * Verifica si una jornada ha finalizado
 */
export const isJornadaFinished = (jornada: Jornada): boolean => {
  if (!jornada.fechaFin) return false;
  return jornada.fechaFin <= new Date();
};

/**
 * Compara dos jornadas para ordenarlas
 * Primero por torneo (apertura antes que clausura), luego por número
 */
export const compareJornadas = (a: Jornada, b: Jornada): number => {
  // Primero comparar por torneo
  if (a.torneo !== b.torneo) {
    return a.torneo === 'apertura' ? -1 : 1;
  }

  // Si son del mismo torneo, comparar por número
  return a.numero - b.numero;
};
