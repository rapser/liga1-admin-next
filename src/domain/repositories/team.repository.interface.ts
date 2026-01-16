/**
 * Interfaz del Repositorio de Equipos
 * Define el contrato para operaciones de equipos y tabla de posiciones
 */

import { Team } from '../entities/team.entity';
import { TorneoType } from '@/core/config/firestore-constants';

export interface ITeamRepository {
  /**
   * Obtiene la tabla de posiciones de un torneo específico
   */
  fetchStandings(torneo: TorneoType | 'acumulado'): Promise<Team[]>;

  /**
   * Observa cambios en tiempo real de la tabla de posiciones
   * Retorna una función para cancelar la suscripción
   */
  observeStandings(
    torneo: TorneoType | 'acumulado',
    callback: (teams: Team[]) => void
  ): () => void;

  /**
   * Obtiene un equipo específico por su ID
   */
  fetchTeamById(
    torneo: TorneoType | 'acumulado',
    teamId: string
  ): Promise<Team | null>;

  /**
   * Actualiza las estadísticas de un equipo
   */
  updateTeamStats(
    torneo: TorneoType | 'acumulado',
    teamId: string,
    stats: Partial<Team>
  ): Promise<void>;

  /**
   * Resetea las estadísticas de todos los equipos en un torneo
   * (Útil al iniciar un nuevo torneo)
   */
  resetStandings(torneo: TorneoType): Promise<void>;

  /**
   * Obtiene todos los equipos (información básica sin estadísticas)
   */
  fetchAllTeams(): Promise<Team[]>;
}
