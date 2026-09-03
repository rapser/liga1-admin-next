/**
 * DTOs de Firestore para las encuestas arbitrales.
 *   polls/{pollId}                -> PollDTO
 *   polls/{pollId}/shards/{n}     -> PollShardDTO   (contador distribuido)
 *   pollVotes/{pollId}/votes/{uid} (lo escribe la app iOS; el admin no lo lee)
 */

import { Timestamp } from "firebase/firestore";
import { PollEstado, PollOption } from "@/domain/entities/poll.entity";

export interface PollDTO {
  matchId: string;
  jornadaId: string;
  pregunta: string;
  opciones: PollOption[];
  estado: PollEstado;
  cierraEn: Timestamp;
  creadoEn: Timestamp;
  cerradaEn?: Timestamp | null;
  numShards: number;
}

export interface PollShardDTO {
  /** { opcionId: conteo } */
  counts: Record<string, number>;
}
