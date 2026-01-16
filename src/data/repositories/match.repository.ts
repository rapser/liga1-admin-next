/**
 * Implementación del Repositorio de Partidos
 * Usa Firestore para persistir y obtener datos de partidos
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { FIRESTORE_COLLECTIONS } from '@/core/config/firestore-constants';
import { IMatchRepository } from '@/domain/repositories/match.repository.interface';
import { Match, EstadoMatch } from '@/domain/entities/match.entity';
import { MatchDTO } from '../dtos/match.dto';
import { MatchMapper } from '../mappers/match.mapper';

export class MatchRepository implements IMatchRepository {
  /**
   * Obtiene todos los partidos de una jornada específica
   */
  async fetchMatches(jornadaId: string): Promise<Match[]> {
    const matchesRef = collection(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES
    );

    const snapshot = await getDocs(matchesRef);

    const matches = snapshot.docs.map((doc) =>
      MatchMapper.toDomain(doc.id, doc.data() as MatchDTO)
    );

    return matches;
  }

  /**
   * Obtiene un partido específico por su ID
   */
  async fetchMatchById(
    jornadaId: string,
    matchId: string
  ): Promise<Match | null> {
    const matchRef = doc(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES,
      matchId
    );

    const matchDoc = await getDoc(matchRef);

    if (!matchDoc.exists()) {
      return null;
    }

    return MatchMapper.toDomain(matchDoc.id, matchDoc.data() as MatchDTO);
  }

  /**
   * Observa cambios en tiempo real de los partidos de una jornada
   */
  observeMatches(
    jornadaId: string,
    callback: (matches: Match[]) => void
  ): Unsubscribe {
    const matchesRef = collection(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES
    );

    const unsubscribe = onSnapshot(matchesRef, (snapshot) => {
      const matches = snapshot.docs.map((doc) =>
        MatchMapper.toDomain(doc.id, doc.data() as MatchDTO)
      );
      callback(matches);
    });

    return unsubscribe;
  }

  /**
   * Actualiza el marcador de un partido
   */
  async updateMatchScore(
    jornadaId: string,
    matchId: string,
    localScore: number,
    visitorScore: number
  ): Promise<void> {
    const matchRef = doc(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES,
      matchId
    );

    await updateDoc(matchRef, {
      golesEquipoLocal: localScore,
      golesEquipoVisitante: visitorScore,
    });
  }

  /**
   * Actualiza el estado de un partido
   */
  async updateMatchStatus(
    jornadaId: string,
    matchId: string,
    status: EstadoMatch
  ): Promise<void> {
    const matchRef = doc(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES,
      matchId
    );

    await updateDoc(matchRef, {
      estado: status,
    });
  }

  /**
   * Marca un partido como suspendido
   */
  async toggleMatchSuspension(
    jornadaId: string,
    matchId: string,
    suspended: boolean
  ): Promise<void> {
    const matchRef = doc(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES,
      matchId
    );

    await updateDoc(matchRef, {
      suspendido: suspended,
    });
  }

  /**
   * Crea un nuevo partido
   */
  async createMatch(
    jornadaId: string,
    match: Omit<Match, 'id'>
  ): Promise<string> {
    const matchesRef = collection(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES
    );

    const matchDTO = MatchMapper.toDTO(match);
    const docRef = await addDoc(matchesRef, matchDTO);

    return docRef.id;
  }

  /**
   * Elimina un partido
   */
  async deleteMatch(jornadaId: string, matchId: string): Promise<void> {
    const matchRef = doc(
      db,
      FIRESTORE_COLLECTIONS.JORNADAS,
      jornadaId,
      FIRESTORE_COLLECTIONS.MATCHES,
      matchId
    );

    await deleteDoc(matchRef);
  }

  /**
   * Obtiene todos los partidos en vivo en todas las jornadas
   * NOTA: Esta implementación requiere conocer las jornadas activas
   * En producción, se recomienda tener un índice o colección separada
   */
  async fetchLiveMatches(): Promise<Match[]> {
    // Implementación simplificada
    // En producción, considera mantener una colección separada de partidos en vivo
    // o usar Cloud Functions para actualizar un índice
    console.warn(
      'fetchLiveMatches: Implementación básica. Considera optimizar con índices.'
    );
    return [];
  }
}
