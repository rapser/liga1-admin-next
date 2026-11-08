/**
 * Compara la plantilla de Transfermarkt con `equipos/{code}/players` y arma el
 * plan de cambios. Transfermarkt manda:
 *   - quien está en Transfermarkt queda activo con su dorsal, posición, edad y nacionalidad;
 *   - quien no está pasa a inactivo (no se borra: vuelve si reaparece);
 *   - quien falta se crea.
 *
 * Emparejamiento, de más a menos seguro (cada jugador de la BD se usa una sola vez):
 *   1. id (slug del nombre) o nombre exacto;
 *   2. la BD tiene el nombre completo: "Jesús Castillo Peña" ⊇ "Jesús Castillo";
 *   3. mismo dorsal y mismo apellido: "Juan Requena" → "Juan Manuel Requena";
 *   4. mismo dorsal y posición, apellido casi igual: "Bettochi" → "Bettocchi".
 * Los casos 3 y 4 se marcan para revisar antes de confirmar.
 */

import { normalizeText, TransfermarktPlayer } from "./transfermarkt-squad-parser";
import { PlayerPosition } from "./squad-types";

/** Lo que el plan necesita de cada documento existente. */
export interface ExistingPlayer {
  id: string;
  name: string;
  number: number | null;
  position: PlayerPosition | string | null;
  nationality: string | null;
  active: boolean;
}

export interface PlayerChange {
  field: "name" | "number" | "position" | "nationality" | "active";
  from: string | number | boolean | null;
  to: string | number | boolean | null;
}

export interface MatchedPlayer {
  id: string;
  player: TransfermarktPlayer;
  changes: PlayerChange[];
  /** Emparejado por dorsal y apellido: conviene que una persona lo confirme. */
  review: string | null;
}

export interface SquadSyncPlan {
  incoming: { id: string; player: TransfermarktPlayer }[];
  outgoing: ExistingPlayer[];
  matched: MatchedPlayer[];
  /** true si casi nadie coincide: probablemente se pegó la tabla de otro equipo. */
  suspicious: boolean;
}

export function slugify(name: string): string {
  return normalizeText(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const words = (name: string) => normalizeText(name).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(Boolean);
const lastName = (name: string) => words(name).at(-1) ?? "";

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] ?? 0;
      row[j] = Math.min(above + 1, (row[j - 1] ?? 0) + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length] ?? 0;
}

export function buildSquadSyncPlan(
  transfermarkt: TransfermarktPlayer[],
  existing: ExistingPlayer[],
): SquadSyncPlan {
  const used = new Set<string>();
  const available = () => existing.filter((p) => !used.has(p.id));
  const plan: SquadSyncPlan = { incoming: [], outgoing: [], matched: [], suspicious: false };

  for (const player of transfermarkt) {
    const tmWords = words(player.name);
    let review: string | null = null;

    let match =
      available().find((p) => p.id === slugify(player.name)) ??
      available().find((p) => normalizeText(p.name) === normalizeText(player.name));

    if (!match) {
      const candidates = available().filter((p) => {
        const dbWords = words(p.name);
        return tmWords.every((w) => dbWords.includes(w));
      });
      if (candidates.length === 1) match = candidates[0];
    }

    if (!match && player.number != null) {
      match = available().find(
        (p) => p.number === player.number && lastName(p.name) === lastName(player.name),
      );
      if (match) review = `"${match.name}" (#${match.number}) se toma como "${player.name}"`;
    }

    if (!match && player.number != null) {
      match = available().find(
        (p) =>
          p.number === player.number &&
          p.position === player.position &&
          levenshtein(lastName(p.name), lastName(player.name)) <= 2,
      );
      if (match) review = `"${match.name}" (#${match.number}) se toma como "${player.name}" (apellido parecido)`;
    }

    if (!match) {
      let id = slugify(player.name);
      // Un inactivo con el mismo id ya se habría emparejado; esto solo evita choques raros.
      for (let n = 2; existing.some((p) => p.id === id) || plan.incoming.some((p) => p.id === id); n++) {
        id = `${slugify(player.name)}-${n}`;
      }
      plan.incoming.push({ id, player });
      continue;
    }

    used.add(match.id);
    const target = {
      name: player.name,
      number: player.number,
      position: player.position,
      nationality: player.nationality,
      active: true,
    };
    const changes = (Object.keys(target) as PlayerChange["field"][])
      .filter((field) => (match[field] ?? null) !== target[field])
      .map((field) => ({ field, from: match[field] ?? null, to: target[field] }));
    plan.matched.push({ id: match.id, player, changes, review });
  }

  plan.outgoing = existing.filter((p) => !used.has(p.id) && p.active);

  const activeBefore = existing.filter((p) => p.active).length;
  const keptActive = plan.matched.filter((m) => existing.find((p) => p.id === m.id)?.active).length;
  plan.suspicious = activeBefore >= 5 && keptActive < activeBefore / 2;

  return plan;
}

/** Hay algo que guardar (altas, bajas o cambios visibles). */
export function planHasChanges(plan: SquadSyncPlan): boolean {
  return plan.incoming.length > 0 || plan.outgoing.length > 0 || plan.matched.some((m) => m.changes.length > 0);
}
