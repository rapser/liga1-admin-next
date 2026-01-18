/**
 * Entidad de Dominio: Team (Equipo)
 * Representa un equipo de fútbol con sus estadísticas en la tabla de posiciones
 */

import { TeamCode } from '@/core/config/firestore-constants';

export interface Team {
  /** ID único del equipo (código de 3 letras, ej: "ali", "uni") */
  id: TeamCode;

  /** Nombre completo del equipo */
  nombre: string;

  /** Ciudad del equipo */
  ciudad: string;

  /** Nombre del estadio */
  estadio: string;

  /** URL o path del logo del equipo */
  logo: string;

  /** Número de partidos jugados */
  partidosJugados: number;

  /** Número de partidos ganados */
  partidosGanados: number;

  /** Número de partidos empatados */
  partidosEmpatados: number;

  /** Número de partidos perdidos */
  partidosPerdidos: number;

  /** Goles a favor */
  golesFavor: number;

  /** Goles en contra */
  golesContra: number;

  /** Diferencia de goles (golesFavor - golesContra) */
  diferenciaGoles: number;

  /** Puntos totales */
  puntos: number;

  /** Posición en la tabla (opcional, se calcula al ordenar) */
  posicion?: number;
}

/**
 * Crea un equipo con estadísticas iniciales en cero
 */
export const createEmptyTeam = (
  id: TeamCode,
  nombre: string,
  ciudad: string,
  estadio: string
): Team => ({
  id,
  nombre,
  ciudad,
  estadio,
  logo: `/teams/${id}.png`,
  partidosJugados: 0,
  partidosGanados: 0,
  partidosEmpatados: 0,
  partidosPerdidos: 0,
  golesFavor: 0,
  golesContra: 0,
  diferenciaGoles: 0,
  puntos: 0,
});

/**
 * Calcula los puntos de un equipo
 * Victoria = 3 puntos, Empate = 1 punto, Derrota = 0 puntos
 */
export const calculatePoints = (team: Team): number => {
  return team.partidosGanados * 3 + team.partidosEmpatados * 1;
};

/**
 * Calcula la diferencia de goles
 */
export const calculateGoalDifference = (team: Team): number => {
  return team.golesFavor - team.golesContra;
};

/**
 * Actualiza las estadísticas del equipo basándose en un resultado de partido
 */
export const updateTeamStats = (
  team: Team,
  golesAFavor: number,
  golesEnContra: number
): Team => {
  const resultado = golesAFavor > golesEnContra ? 'victoria' : golesAFavor < golesEnContra ? 'derrota' : 'empate';

  return {
    ...team,
    partidosJugados: team.partidosJugados + 1,
    partidosGanados: team.partidosGanados + (resultado === 'victoria' ? 1 : 0),
    partidosEmpatados: team.partidosEmpatados + (resultado === 'empate' ? 1 : 0),
    partidosPerdidos: team.partidosPerdidos + (resultado === 'derrota' ? 1 : 0),
    golesFavor: team.golesFavor + golesAFavor,
    golesContra: team.golesContra + golesEnContra,
    diferenciaGoles: team.golesFavor + golesAFavor - (team.golesContra + golesEnContra),
    puntos: calculatePoints({
      ...team,
      partidosGanados: team.partidosGanados + (resultado === 'victoria' ? 1 : 0),
      partidosEmpatados: team.partidosEmpatados + (resultado === 'empate' ? 1 : 0),
    }),
  };
};

/**
 * Compara dos equipos para ordenar la tabla de posiciones
 * Criterios: 1) Partidos jugados, 2) Puntos, 3) Diferencia de goles, 4) Goles a favor
 */
export const compareTeams = (a: Team, b: Team): number => {
  // 1. Ordenar por partidos jugados (descendente) - PRIMER CRITERIO
  // Equipos que ya jugaron partidos van antes que equipos con 0 partidos
  if (a.partidosJugados !== b.partidosJugados) {
    return b.partidosJugados - a.partidosJugados;
  }

  // 2. Si tienen los mismos partidos jugados, ordenar por puntos (descendente)
  if (a.puntos !== b.puntos) {
    return b.puntos - a.puntos;
  }

  // 3. Si tienen los mismos puntos, ordenar por diferencia de goles (descendente)
  if (a.diferenciaGoles !== b.diferenciaGoles) {
    return b.diferenciaGoles - a.diferenciaGoles;
  }

  // 4. Si tienen la misma diferencia, ordenar por goles a favor (descendente)
  if (a.golesFavor !== b.golesFavor) {
    return b.golesFavor - a.golesFavor;
  }

  // 5. Si todo es igual, mantener orden alfabético
  const nombreA = a.nombre || '';
  const nombreB = b.nombre || '';
  return nombreA.localeCompare(nombreB);
};

/**
 * Ordena un array de equipos según los criterios de la tabla de posiciones
 * y asigna la posición a cada equipo
 */
export const sortTeamsByStanding = (teams: Team[]): Team[] => {
  const sorted = [...teams].sort(compareTeams);
  return sorted.map((team, index) => ({
    ...team,
    posicion: index + 1,
  }));
};
