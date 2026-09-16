/**
 * Mapper Poll: PollDTO (Firestore) <-> Poll (Dominio)
 */

import { Poll, PollTally } from "@/domain/entities/poll.entity";
import { PollDTO, PollShardDTO } from "../dtos/poll.dto";

export const PollMapper = {
  toDomain(id: string, dto: PollDTO): Poll {
    return {
      id,
      matchId: dto.matchId,
      jornadaId: dto.jornadaId,
      pregunta: dto.pregunta,
      opciones: Array.isArray(dto.opciones) ? dto.opciones : [],
      estado: dto.estado === "cerrada" ? "cerrada" : "activa",
      cierraEn: dto.cierraEn.toDate(),
      creadoEn: dto.creadoEn.toDate(),
      cerradaEn: dto.cerradaEn ? dto.cerradaEn.toDate() : null,
      numShards: typeof dto.numShards === "number" ? dto.numShards : 10,
    };
  },

  /** Suma los shards en un único conteo por opción. */
  tallyFromShards(shards: PollShardDTO[], optionIds: string[]): PollTally {
    const tally: PollTally = {};
    for (const id of optionIds) tally[id] = 0;
    for (const shard of shards) {
      const counts = shard.counts ?? {};
      for (const [optionId, n] of Object.entries(counts)) {
        tally[optionId] = (tally[optionId] ?? 0) + (typeof n === "number" ? n : 0);
      }
    }
    return tally;
  },
};
