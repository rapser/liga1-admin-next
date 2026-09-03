/**
 * Contrato del repositorio de encuestas arbitrales.
 */

import { Poll, PollOption, PollTally } from "../entities/poll.entity";

export interface CreatePollInput {
  matchId: string;
  jornadaId: string;
  pregunta: string;
  opciones: PollOption[];
  durationMinutes: number;
}

export interface IPollRepository {
  /** Crea la encuesta + sus shards en un batch. Devuelve el id. */
  createPoll(input: CreatePollInput): Promise<string>;

  /** Marca la encuesta como cerrada. */
  closePoll(pollId: string): Promise<void>;

  /** Observa en vivo las encuestas de un partido (más recientes primero). */
  observePollsForMatch(
    matchId: string,
    callback: (polls: Poll[]) => void,
  ): () => void;

  /** Observa en vivo el conteo agregado (suma de shards) de una encuesta. */
  observeTally(
    pollId: string,
    optionIds: string[],
    callback: (tally: PollTally) => void,
  ): () => void;
}
