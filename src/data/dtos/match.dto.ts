/**
 * DTO para Match (Partido)
 * Representa la estructura exacta del documento en Firestore
 */

import { Timestamp } from 'firebase/firestore';

export interface MatchDTO {
  /** ID del equipo local (código de 3 letras) */
  equipoLocalId: string | null;

  /** ID del equipo visitante (código de 3 letras) */
  equipoVisitanteId: string | null;

  /** Fecha del partido como Timestamp de Firestore */
  fecha: Timestamp;

  /** Goles del equipo local */
  golesEquipoLocal: number;

  /** Goles del equipo visitante */
  golesEquipoVisitante: number;

  /** Estado del partido */
  estado: 'pendiente' | 'envivo' | 'finalizado' | 'anulado' | 'suspendido';

  /** Indica si el partido está suspendido */
  suspendido: boolean;

  /** Estadio (opcional) */
  estadio?: string;

  /** Número de jornada (opcional) */
  jornadaNumero?: number;
}

/**
 * Tipo para crear un nuevo partido (sin Timestamp)
 */
export type CreateMatchDTO = Omit<MatchDTO, 'fecha'> & {
  fecha: Date;
};
