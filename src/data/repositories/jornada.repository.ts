/**
 * Implementación del Repositorio de Jornadas
 * Usa Firestore para persistir y obtener datos de jornadas
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { FIRESTORE_COLLECTIONS, TorneoType } from '@/core/config/firestore-constants';
import { IJornadaRepository } from '@/domain/repositories/jornada.repository.interface';
import { Jornada } from '@/domain/entities/jornada.entity';
import { JornadaDTO } from '../dtos/jornada.dto';
import { JornadaMapper } from '../mappers/jornada.mapper';

export class JornadaRepository implements IJornadaRepository {
  /**
   * Obtiene todas las jornadas de un torneo específico (o todas si no se especifica)
   */
  async fetchJornadas(torneo?: TorneoType): Promise<Jornada[]> {
    const jornadasRef = collection(db, FIRESTORE_COLLECTIONS.JORNADAS);

    let q = query(jornadasRef);
    if (torneo) {
      q = query(jornadasRef, where('torneo', '==', torneo));
    }

    const snapshot = await getDocs(q);

    const jornadas = snapshot.docs.map((doc) =>
      JornadaMapper.toDomain(doc.id, doc.data() as JornadaDTO)
    );

    return jornadas;
  }

  /**
   * Obtiene una jornada específica por su ID
   */
  async fetchJornadaById(jornadaId: string): Promise<Jornada | null> {
    const jornadaRef = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, jornadaId);
    const jornadaDoc = await getDoc(jornadaRef);

    if (!jornadaDoc.exists()) {
      return null;
    }

    return JornadaMapper.toDomain(
      jornadaDoc.id,
      jornadaDoc.data() as JornadaDTO
    );
  }

  /**
   * Obtiene las jornadas visibles (mostrar = true)
   */
  async fetchVisibleJornadas(): Promise<Jornada[]> {
    const jornadasRef = collection(db, FIRESTORE_COLLECTIONS.JORNADAS);
    const q = query(jornadasRef, where('mostrar', '==', true));

    const snapshot = await getDocs(q);

    const jornadas = snapshot.docs.map((doc) =>
      JornadaMapper.toDomain(doc.id, doc.data() as JornadaDTO)
    );

    return jornadas;
  }

  /**
   * Observa cambios en tiempo real de todas las jornadas
   */
  observeJornadas(
    callback: (jornadas: Jornada[]) => void,
    torneo?: TorneoType
  ): Unsubscribe {
    const jornadasRef = collection(db, FIRESTORE_COLLECTIONS.JORNADAS);

    let q = query(jornadasRef);
    if (torneo) {
      q = query(jornadasRef, where('torneo', '==', torneo));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jornadas = snapshot.docs.map((doc) =>
        JornadaMapper.toDomain(doc.id, doc.data() as JornadaDTO)
      );
      callback(jornadas);
    });

    return unsubscribe;
  }

  /**
   * Crea una nueva jornada
   */
  async createJornada(jornada: Omit<Jornada, 'id'>): Promise<string> {
    const jornadasRef = collection(db, FIRESTORE_COLLECTIONS.JORNADAS);
    const jornadaDTO = JornadaMapper.toDTO(jornada);

    const docRef = await addDoc(jornadasRef, jornadaDTO);
    return docRef.id;
  }

  /**
   * Actualiza una jornada existente
   */
  async updateJornada(
    jornadaId: string,
    updates: Partial<Jornada>
  ): Promise<void> {
    const jornadaRef = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, jornadaId);

    // Convertir fechas a Timestamp si existen
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.fechaInicio) {
      const { Timestamp } = await import('firebase/firestore');
      updateData.fechaInicio = Timestamp.fromDate(updates.fechaInicio);
    }
    if (updates.fechaFin) {
      const { Timestamp } = await import('firebase/firestore');
      updateData.fechaFin = Timestamp.fromDate(updates.fechaFin);
    }

    // Remover campos que no se deben actualizar
    delete updateData.id;

    await updateDoc(jornadaRef, updateData);
  }

  /**
   * Alterna la visibilidad de una jornada
   */
  async toggleJornadaVisibility(
    jornadaId: string,
    visible: boolean
  ): Promise<void> {
    const jornadaRef = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, jornadaId);
    await updateDoc(jornadaRef, { mostrar: visible });
  }

  /**
   * Elimina una jornada
   */
  async deleteJornada(jornadaId: string): Promise<void> {
    const jornadaRef = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, jornadaId);
    await deleteDoc(jornadaRef);
  }

  /**
   * Obtiene la jornada activa actual
   */
  async fetchActiveJornada(): Promise<Jornada | null> {
    const jornadasRef = collection(db, FIRESTORE_COLLECTIONS.JORNADAS);
    const q = query(jornadasRef, where('esActiva', '==', true));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Debería haber solo una jornada activa
    const doc = snapshot.docs[0];
    if (!doc) return null;

    return JornadaMapper.toDomain(doc.id, doc.data() as JornadaDTO);
  }

  /**
   * Marca una jornada como activa (y desmarca las demás)
   */
  async setActiveJornada(jornadaId: string): Promise<void> {
    const batch = writeBatch(db);

    // Primero, desmarcar todas las jornadas activas
    const jornadasRef = collection(db, FIRESTORE_COLLECTIONS.JORNADAS);
    const activeQuery = query(jornadasRef, where('esActiva', '==', true));
    const activeSnapshot = await getDocs(activeQuery);

    activeSnapshot.docs.forEach((document) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, document.id);
      batch.update(ref, { esActiva: false });
    });

    // Marcar la nueva jornada como activa
    const newActiveRef = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, jornadaId);
    batch.update(newActiveRef, { esActiva: true });

    await batch.commit();
  }
}
