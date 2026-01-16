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
      TeamMapper.toDomain(doc.id, doc.data() as TeamDTO)
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
        TeamMapper.toDomain(doc.id, doc.data() as TeamDTO)
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

    // Remover campos que no se deben actualizar
    const { id, posicion, ...updateData } = stats as Team;

    await updateDoc(teamRef, updateData);
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
