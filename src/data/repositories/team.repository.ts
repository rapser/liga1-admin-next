/**
 * Implementación del Repositorio de Equipos
 * Usa Firestore para persistir y obtener datos de equipos y tabla de posiciones
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { FIRESTORE_COLLECTIONS, TorneoType } from '@/core/config/firestore-constants';
import { ITeamRepository } from '@/domain/repositories/team.repository.interface';
import { Team } from '@/domain/entities/team.entity';
import { TeamDTO } from '../dtos/team.dto';
import { TeamMapper } from '../mappers/team.mapper';

export class TeamRepository implements ITeamRepository {
  /**
   * Obtiene la tabla de posiciones de un torneo específico
   */
  async fetchStandings(torneo: TorneoType | 'acumulado'): Promise<Team[]> {
    const collectionName =
      torneo === 'apertura'
        ? FIRESTORE_COLLECTIONS.APERTURA
        : torneo === 'clausura'
        ? FIRESTORE_COLLECTIONS.CLAUSURA
        : FIRESTORE_COLLECTIONS.ACUMULADO;

    const teamsRef = collection(db, collectionName);
    const snapshot = await getDocs(teamsRef);

    const teams = snapshot.docs.map((doc) =>
      TeamMapper.toDomain(doc.id, doc.data() as Partial<TeamDTO>)
    );

    return teams;
  }

  /**
   * Observa cambios en tiempo real de la tabla de posiciones
   */
  observeStandings(
    torneo: TorneoType | 'acumulado',
    callback: (teams: Team[]) => void
  ): Unsubscribe {
    const collectionName =
      torneo === 'apertura'
        ? FIRESTORE_COLLECTIONS.APERTURA
        : torneo === 'clausura'
        ? FIRESTORE_COLLECTIONS.CLAUSURA
        : FIRESTORE_COLLECTIONS.ACUMULADO;

    const teamsRef = collection(db, collectionName);

    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      const teams = snapshot.docs.map((doc) =>
        TeamMapper.toDomain(doc.id, doc.data() as Partial<TeamDTO>)
      );
      callback(teams);
    });

    return unsubscribe;
  }

  /**
   * Obtiene un equipo específico por su ID
   */
  async fetchTeamById(
    torneo: TorneoType | 'acumulado',
    teamId: string
  ): Promise<Team | null> {
    const collectionName =
      torneo === 'apertura'
        ? FIRESTORE_COLLECTIONS.APERTURA
        : torneo === 'clausura'
        ? FIRESTORE_COLLECTIONS.CLAUSURA
        : FIRESTORE_COLLECTIONS.ACUMULADO;

    const teamRef = doc(db, collectionName, teamId);
    const teamDoc = await getDoc(teamRef);

    if (!teamDoc.exists()) {
      return null;
    }

    return TeamMapper.toDomain(teamDoc.id, teamDoc.data() as TeamDTO);
  }

  /**
   * Actualiza las estadísticas de un equipo
   */
  async updateTeamStats(
    torneo: TorneoType | 'acumulado',
    teamId: string,
    stats: Partial<Team>
  ): Promise<void> {
    const collectionName =
      torneo === 'apertura'
        ? FIRESTORE_COLLECTIONS.APERTURA
        : torneo === 'clausura'
        ? FIRESTORE_COLLECTIONS.CLAUSURA
        : FIRESTORE_COLLECTIONS.ACUMULADO;

    const teamRef = doc(db, collectionName, teamId);

    try {
      // Obtener el equipo actual para completar los campos faltantes
      const currentTeam = await this.fetchTeamById(torneo, teamId);
      if (!currentTeam) {
        throw new Error(`Equipo ${teamId} no encontrado en ${torneo} (colección: ${collectionName})`);
      }

      // Combinar estadísticas actuales con las nuevas
      const updatedTeam: Team = {
        ...currentTeam,
        ...stats,
      };

      // Remover campos que no se deben actualizar en Firestore
      const { id, posicion, ...teamWithoutId } = updatedTeam;

      // Convertir a DTO (mapea partidosJugados -> matchesPlayed, etc)
      const updateData = TeamMapper.toDTO(teamWithoutId);

      // Actualizar SOLO los campos de estadísticas en Firestore
      // Usar updateDoc que solo actualiza los campos especificados
      await updateDoc(teamRef, updateData as unknown as Record<string, unknown>);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Error al actualizar estadísticas del equipo ${teamId}: ${errMsg}`);
    }
  }

  /**
   * Escribe estadísticas directamente sin leer primero (evita read redundante)
   * Mapea campos del dominio (partidosGanados, etc.) a Firestore (matchesWon, etc.)
   */
  async writeTeamStats(
    torneo: TorneoType | 'acumulado',
    teamId: string,
    stats: Partial<Team>
  ): Promise<void> {
    const collectionName =
      torneo === 'apertura'
        ? FIRESTORE_COLLECTIONS.APERTURA
        : torneo === 'clausura'
        ? FIRESTORE_COLLECTIONS.CLAUSURA
        : FIRESTORE_COLLECTIONS.ACUMULADO;

    const teamRef = doc(db, collectionName, teamId);

    // Mapear campos del dominio a campos de Firestore directamente
    const updateData: Record<string, unknown> = {};
    if (stats.partidosJugados !== undefined) updateData.matchesPlayed = stats.partidosJugados;
    if (stats.partidosGanados !== undefined) updateData.matchesWon = stats.partidosGanados;
    if (stats.partidosEmpatados !== undefined) updateData.matchesDrawn = stats.partidosEmpatados;
    if (stats.partidosPerdidos !== undefined) updateData.matchesLost = stats.partidosPerdidos;
    if (stats.golesFavor !== undefined) updateData.goalsScored = stats.golesFavor;
    if (stats.golesContra !== undefined) updateData.goalsAgainst = stats.golesContra;
    if (stats.diferenciaGoles !== undefined) updateData.goalDifference = stats.diferenciaGoles;
    if (stats.puntos !== undefined) updateData.points = stats.puntos;

    await updateDoc(teamRef, updateData);
  }

  /**
   * Escribe estadísticas de múltiples equipos en un solo batch atómico
   * Reduce múltiples round-trips a uno solo
   */
  async batchWriteTeamStats(
    operations: Array<{
      torneo: TorneoType | 'acumulado';
      teamId: string;
      stats: Partial<Team>;
    }>
  ): Promise<void> {
    const batch = writeBatch(db);

    for (const op of operations) {
      const collectionName =
        op.torneo === 'apertura'
          ? FIRESTORE_COLLECTIONS.APERTURA
          : op.torneo === 'clausura'
          ? FIRESTORE_COLLECTIONS.CLAUSURA
          : FIRESTORE_COLLECTIONS.ACUMULADO;

      const teamRef = doc(db, collectionName, op.teamId);

      const updateData: Record<string, unknown> = {};
      if (op.stats.partidosJugados !== undefined) updateData.matchesPlayed = op.stats.partidosJugados;
      if (op.stats.partidosGanados !== undefined) updateData.matchesWon = op.stats.partidosGanados;
      if (op.stats.partidosEmpatados !== undefined) updateData.matchesDrawn = op.stats.partidosEmpatados;
      if (op.stats.partidosPerdidos !== undefined) updateData.matchesLost = op.stats.partidosPerdidos;
      if (op.stats.golesFavor !== undefined) updateData.goalsScored = op.stats.golesFavor;
      if (op.stats.golesContra !== undefined) updateData.goalsAgainst = op.stats.golesContra;
      if (op.stats.diferenciaGoles !== undefined) updateData.goalDifference = op.stats.diferenciaGoles;
      if (op.stats.puntos !== undefined) updateData.points = op.stats.puntos;

      batch.update(teamRef, updateData);
    }

    await batch.commit();
  }

  /**
   * Resetea las estadísticas de todos los equipos en un torneo
   * Útil al iniciar un nuevo torneo
   */
  async resetStandings(torneo: TorneoType): Promise<void> {
    const collectionName =
      torneo === 'apertura'
        ? FIRESTORE_COLLECTIONS.APERTURA
        : FIRESTORE_COLLECTIONS.CLAUSURA;

    const teamsRef = collection(db, collectionName);
    const snapshot = await getDocs(teamsRef);

    const batch = writeBatch(db);

    snapshot.docs.forEach((document) => {
      const teamRef = doc(db, collectionName, document.id);
      batch.update(teamRef, {
        partidosJugados: 0,
        partidosGanados: 0,
        partidosEmpatados: 0,
        partidosPerdidos: 0,
        golesFavor: 0,
        golesContra: 0,
        diferenciaGoles: 0,
        puntos: 0,
      });
    });

    await batch.commit();
  }

  /**
   * Obtiene todos los equipos (información básica sin estadísticas)
   * Usa la tabla acumulada como fuente de equipos base
   */
  async fetchAllTeams(): Promise<Team[]> {
    return this.fetchStandings('acumulado');
  }
}
