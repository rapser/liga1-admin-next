/**
 * Entidad de Dominio: Poll (Encuesta arbitral en vivo)
 * "¿Fue penal?" — se crea durante un partido en vivo y se cierra a los pocos minutos.
 * El conteo real vive en la subcolección `shards` (contador distribuido).
 */

export type PollEstado = "activa" | "cerrada";

export interface PollOption {
  /** id corto y estable ("si", "no", "dudoso"). */
  id: string;
  texto: string;
}

export interface Poll {
  id: string;
  matchId: string;
  jornadaId: string;
  pregunta: string;
  opciones: PollOption[];
  estado: PollEstado;
  /** Momento en que deja de aceptar votos. */
  cierraEn: Date;
  creadoEn: Date;
  cerradaEn: Date | null;
  /** Número de shards del contador distribuido. */
  numShards: number;
}

/** Conteo por opción, sumado desde los shards. */
export type PollTally = Record<string, number>;

export const isPollOpen = (poll: Poll, now: Date = new Date()): boolean => {
  return poll.estado === "activa" && poll.cierraEn.getTime() > now.getTime();
};

export const pollTotalVotes = (tally: PollTally): number => {
  return Object.values(tally).reduce((acc, n) => acc + n, 0);
};

/** Porcentaje entero de una opción sobre el total (0 si no hay votos). */
export const pollOptionPct = (tally: PollTally, optionId: string): number => {
  const total = pollTotalVotes(tally);
  if (total === 0) return 0;
  return Math.round(((tally[optionId] ?? 0) / total) * 100);
};

/** Opciones por defecto para el flujo rápido "¿fue penal?". */
export const DEFAULT_POLL_OPTIONS: PollOption[] = [
  { id: "si", texto: "Sí, penal" },
  { id: "no", texto: "No fue" },
  { id: "dudoso", texto: "Dudoso" },
];

export const DEFAULT_POLL_DURATION_MIN = 3;
