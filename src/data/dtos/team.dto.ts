/**
 * DTO para Team (Equipo)
 * Representa la estructura del documento en Firestore
 */

export interface TeamDTO {
  /** Nombre completo del equipo */
  nombre: string;

  /** Ciudad del equipo */
  ciudad: string;

  /** Nombre del estadio */
  estadio: string;

  /** URL o path del logo */
  logo: string;

  /** Partidos jugados */
  partidosJugados: number;

  /** Partidos ganados */
  partidosGanados: number;

  /** Partidos empatados */
  partidosEmpatados: number;

  /** Partidos perdidos */
  partidosPerdidos: number;

  /** Goles a favor */
  golesFavor: number;

  /** Goles en contra */
  golesContra: number;

  /** Diferencia de goles */
  diferenciaGoles: number;

  /** Puntos totales */
  puntos: number;
}
