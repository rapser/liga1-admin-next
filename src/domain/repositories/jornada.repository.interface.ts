/**
 * Interfaz del Repositorio de Jornadas
 * Define el contrato para operaciones CRUD de jornadas
 */

import { Jornada } from '../entities/jornada.entity';
import { TorneoType } from '@/core/config/firestore-constants';

export interface IJornadaRepository {
  /**
   * Obtiene todas las jornadas de un torneo específico
   */
  fetchJornadas(torneo?: TorneoType): Promise<Jornada[]>;

  /**
   * Obtiene una jornada específica por su ID
   */
  fetchJornadaById(jornadaId: string): Promise<Jornada | null>;

  /**
   * Obtiene las jornadas visibles (mostrar = true)
   */
  fetchVisibleJornadas(): Promise<Jornada[]>;

  /**
   * Observa cambios en tiempo real de todas las jornadas
   * Retorna una función para cancelar la suscripción
   */
  observeJornadas(
    callback: (jornadas: Jornada[]) => void,
    torneo?: TorneoType
  ): () => void;

  /**
   * Crea una nueva jornada
   */
  createJornada(jornada: Omit<Jornada, 'id'>): Promise<string>;

  /**
   * Actualiza una jornada existente
   */
  updateJornada(jornadaId: string, updates: Partial<Jornada>): Promise<void>;

  /**
   * Alterna la visibilidad de una jornada (campo "mostrar")
   */
  toggleJornadaVisibility(jornadaId: string, visible: boolean): Promise<void>;

  /**
   * Elimina una jornada
   */
  deleteJornada(jornadaId: string): Promise<void>;

  /**
   * Obtiene la jornada activa actual
   */
  fetchActiveJornada(): Promise<Jornada | null>;

  /**
   * Marca una jornada como activa (y desmarca las demás)
   */
  setActiveJornada(jornadaId: string): Promise<void>;
}
