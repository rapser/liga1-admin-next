/**
 * Implementación del Repositorio de Encuestas Arbitrales (Firestore, SDK cliente).
 *
 *   polls/{pollId}                 documento de la encuesta
 *   polls/{pollId}/shards/{0..n}   contador distribuido (la app iOS incrementa uno al azar)
 *
 * El admin solo crea/cierra y observa el conteo; los votos individuales
 * (pollVotes/{pollId}/votes/{uid}) los escribe la app y no se leen aquí.
 */

import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/core/config/firebase";
import {
  FIRESTORE_COLLECTIONS,
  POLL_SHARD_COUNT,
} from "@/core/config/firestore-constants";
import { Poll, PollTally } from "@/domain/entities/poll.entity";
import {
  CreatePollInput,
  IPollRepository,
} from "@/domain/repositories/poll.repository.interface";
import { PollDTO, PollShardDTO } from "../dtos/poll.dto";
import { PollMapper } from "../mappers/poll.mapper";

export class PollRepository implements IPollRepository {
  async createPoll(input: CreatePollInput): Promise<string> {
    const pregunta = input.pregunta.trim();
    if (!pregunta) throw new Error("La pregunta no puede estar vacía");

    const opciones = input.opciones
      .map((o) => ({ id: o.id.trim(), texto: o.texto.trim() }))
      .filter((o) => o.id && o.texto);
    if (opciones.length < 2) throw new Error("Se necesitan al menos 2 opciones");

    const cierraEn = new Date(Date.now() + input.durationMinutes * 60_000);

    const pollRef = doc(collection(db, FIRESTORE_COLLECTIONS.POLLS));
    const batch = writeBatch(db);

    batch.set(pollRef, {
      matchId: input.matchId,
      jornadaId: input.jornadaId,
      pregunta,
      opciones,
      estado: "activa",
      cierraEn: Timestamp.fromDate(cierraEn),
      creadoEn: serverTimestamp(),
      cerradaEn: null,
      numShards: POLL_SHARD_COUNT,
    });

    const zeroCounts: Record<string, number> = {};
    for (const o of opciones) zeroCounts[o.id] = 0;

    for (let i = 0; i < POLL_SHARD_COUNT; i++) {
      const shardRef = doc(
        pollRef,
        FIRESTORE_COLLECTIONS.POLL_SHARDS,
        String(i),
      );
      batch.set(shardRef, { counts: { ...zeroCounts } });
    }

    await batch.commit();
    return pollRef.id;
  }

  async closePoll(pollId: string): Promise<void> {
    const pollRef = doc(db, FIRESTORE_COLLECTIONS.POLLS, pollId);
    await updateDoc(pollRef, {
      estado: "cerrada",
      cerradaEn: serverTimestamp(),
    });
  }

  observePollsForMatch(
    matchId: string,
    callback: (polls: Poll[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.POLLS),
      where("matchId", "==", matchId),
      orderBy("creadoEn", "desc"),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const polls = snapshot.docs
          .filter((d) => d.data().creadoEn) // ignora docs sin serverTimestamp resuelto aún
          .map((d) => PollMapper.toDomain(d.id, d.data() as PollDTO));
        callback(polls);
      },
      (error) => {
        console.error("PollRepository.observePollsForMatch:", error);
        callback([]);
      },
    );
  }

  observeTally(
    pollId: string,
    optionIds: string[],
    callback: (tally: PollTally) => void,
  ): Unsubscribe {
    const shardsRef = collection(
      db,
      FIRESTORE_COLLECTIONS.POLLS,
      pollId,
      FIRESTORE_COLLECTIONS.POLL_SHARDS,
    );

    return onSnapshot(
      shardsRef,
      (snapshot) => {
        const shards = snapshot.docs.map((d) => d.data() as PollShardDTO);
        callback(PollMapper.tallyFromShards(shards, optionIds));
      },
      (error) => {
        console.error("PollRepository.observeTally:", error);
      },
    );
  }
}
