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

  /** Fecha/hora cuando el partido cambió a estado "envivo" (Timestamp de Firestore) */
  horaInicio?: Timestamp;

  /** Minuto actual del partido (0-90+) */
  minutoActual?: number;

  /** Tiempo agregado al final del segundo tiempo (en minutos) */
  tiempoAgregado?: number;

  /** Tiempo agregado al final del primer tiempo (en minutos) */
  tiempoAgregadoPrimeraParte?: number;

  /** Indica si está en primera parte (true) o segunda parte (false) */
  primeraParte?: boolean;

  /** Indica si el partido está en descanso (entre primera y segunda parte) */
  enDescanso?: boolean;

  /** Fecha/hora cuando inició la segunda parte (Timestamp de Firestore) */
  horaInicioSegundaParte?: Timestamp;
}

/**
 * Tipo para crear un nuevo partido (sin Timestamp)
 */
export type CreateMatchDTO = Omit<MatchDTO, 'fecha'> & {
  fecha: Date;
};
