/**
 * DTO para Team (Equipo)
 * Representa la estructura del documento en Firestore
 * Los campos en Firestore son: matchesPlayed, matchesWon, matchesDrawn, matchesLost,
 * goalsScored, goalsAgainst, goalDifference, points
 */

export interface TeamDTO {
  /** Nombre completo del equipo */
  name: string;

  /** Ciudad del equipo */
  city: string;

  /** Nombre del estadio */
  stadium: string;

  /** URL o path del logo */
  logo: string;

  /** Partidos jugados */
  matchesPlayed: number;

  /** Partidos ganados */
  matchesWon: number;

  /** Partidos empatados */
  matchesDrawn: number;

  /** Partidos perdidos */
  matchesLost: number;

  /** Goles a favor */
  goalsScored: number;

  /** Goles en contra */
  goalsAgainst: number;

  /** Diferencia de goles */
  goalDifference: number;

  /** Puntos totales */
  points: number;
}
