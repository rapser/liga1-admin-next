/**
 * Interfaz del Repositorio de Partidos
 * Define el contrato para operaciones CRUD de partidos
 */

import { Match, EstadoMatch } from '../entities/match.entity';

export interface IMatchRepository {
  /**
   * Obtiene todos los partidos de una jornada específica
   */
  fetchMatches(jornadaId: string): Promise<Match[]>;

  /**
   * Obtiene un partido específico por su ID
   */
  fetchMatchById(jornadaId: string, matchId: string): Promise<Match | null>;

  /**
   * Observa cambios en tiempo real de los partidos de una jornada
   * Retorna una función para cancelar la suscripción
   */
  observeMatches(
    jornadaId: string,
    callback: (matches: Match[]) => void
  ): () => void;

  /**
   * Actualiza el marcador de un partido
   */
  updateMatchScore(
    jornadaId: string,
    matchId: string,
    localScore: number,
    visitorScore: number
  ): Promise<void>;

  /**
   * Actualiza el estado de un partido
   */
  updateMatchStatus(
    jornadaId: string,
    matchId: string,
    status: EstadoMatch
  ): Promise<void>;

  /**
   * Marca un partido como suspendido
   */
  toggleMatchSuspension(
    jornadaId: string,
    matchId: string,
    suspended: boolean
  ): Promise<void>;

  /**
   * Crea un nuevo partido
   */
  createMatch(jornadaId: string, match: Omit<Match, 'id'>): Promise<string>;

  /**
   * Elimina un partido
   */
  deleteMatch(jornadaId: string, matchId: string): Promise<void>;

  /**
   * Obtiene todos los partidos en vivo en todas las jornadas
   */
  fetchLiveMatches(): Promise<Match[]>;

  /**
   * Actualiza múltiples campos de un partido
   */
  updateMatch(
    jornadaId: string,
    matchId: string,
    updates: Partial<Match>
  ): Promise<void>;
}
