/**
 * DTO para Jornada
 * Representa la estructura del documento en Firestore
 */

import { Timestamp } from 'firebase/firestore';

export interface JornadaDTO {
  /** Tipo de torneo */
  torneo: 'apertura' | 'clausura';

  /** Número de jornada */
  numero: number;

  /** Indica si debe mostrarse */
  mostrar: boolean;

  /** Fecha de inicio como Timestamp */
  fechaInicio: Timestamp;

  /** Fecha de fin (opcional) */
  fechaFin?: Timestamp;

  /** Indica si es la jornada activa */
  esActiva?: boolean;

  /**
   * La jornada ya tiene fecha y hora oficial en todos sus partidos.
   * La app solo la muestra cuando es true.
   */
  horariosConfirmados?: boolean;
}

/**
 * Tipo para crear una nueva jornada
 */
export type CreateJornadaDTO = Omit<JornadaDTO, 'fechaInicio' | 'fechaFin'> & {
  fechaInicio: Date;
  fechaFin?: Date;
};
