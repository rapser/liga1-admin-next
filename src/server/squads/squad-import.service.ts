/**
 * Importa las plantillas de los 18 equipos desde ESPN (la misma API que usa el
 * live-sync) a `equipos/{code}/players/{espn_<id>}`.
 *
 * - Idempotente: el id del jugador es el id de ESPN, así que reimportar actualiza.
 * - Nunca pisa una foto puesta a mano (`photoSource: "manual"`).
 * - Los jugadores que ya no aparecen en el plantel pasan a `active: false`
 *   (no se borran: conservan la foto por si vuelven).
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/core/config/firebase-admin";
import { FIRESTORE_COLLECTIONS } from "@/core/config/firestore-constants";
import { mapProviderTeam } from "@/server/live-sync/team-mapping";
import {
  PlayerDoc,
  PlayerPosition,
  SQUAD_USER_AGENT,
} from "./squad-types";

const DEFAULT_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/per.1";
const BATCH_LIMIT = 400;
const CONCURRENCY = 4;

interface EspnTeamEntry {
  team: { id: string; displayName: string; shortDisplayName?: string };
}

interface EspnAthlete {
  id: string;
  fullName?: string;
  displayName?: string;
  shortName?: string;
  age?: number;
  dateOfBirth?: string;
  citizenship?: string;
  jersey?: string;
  position?: { name?: string; abbreviation?: string };
  headshot?: { href?: string };
}

export interface SquadImportSummary {
  dryRun: boolean;
  teams: number;
  players: number;
  deactivated: number;
  perTeam: Record<string, number>;
  /** Equipos de ESPN que no se pudieron mapear a un código de la liga. */
  unmappedTeams: string[];
}

function baseUrl(): string {
  return (process.env.ESPN_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function fetchEspn<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    headers: { "User-Agent": SQUAD_USER_AGENT },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ESPN ${path} respondió ${response.status}`);
  }
  return (await response.json()) as T;
}

export function mapPosition(position?: { name?: string; abbreviation?: string }): PlayerPosition {
  const name = (position?.name || "").toLowerCase();
  if (name.includes("goalkeeper")) return "GK";
  if (name.includes("defender") || name.includes("back")) return "DF";
  if (name.includes("midfield")) return "MF";
  if (name.includes("forward") || name.includes("striker") || name.includes("wing")) return "FW";

  switch ((position?.abbreviation || "").toUpperCase()) {
    case "G":
      return "GK";
    case "D":
      return "DF";
    case "M":
      return "MF";
    default:
      return "FW";
  }
}

export function toPlayerDoc(athlete: EspnAthlete): Omit<PlayerDoc, "photoURL" | "photoSource"> | null {
  const name = (athlete.fullName || athlete.displayName || "").trim();
  if (!athlete.id || !name) return null;

  const number = Number.parseInt(athlete.jersey ?? "", 10);
  return {
    name,
    shortName: (athlete.shortName || name).trim(),
    number: Number.isNaN(number) ? null : number,
    position: mapPosition(athlete.position),
    age: typeof athlete.age === "number" ? athlete.age : null,
    dateOfBirth: athlete.dateOfBirth ? athlete.dateOfBirth.slice(0, 10) : null,
    nationality: athlete.citizenship?.trim() || null,
    espnId: String(athlete.id),
    active: true,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function importSquads({ dryRun }: { dryRun: boolean }): Promise<SquadImportSummary> {
  const teamsResponse = await fetchEspn<{
    sports: Array<{ leagues: Array<{ teams: EspnTeamEntry[] }> }>;
  }>("/teams");
  const espnTeams = teamsResponse.sports[0]?.leagues[0]?.teams ?? [];

  const summary: SquadImportSummary = {
    dryRun,
    teams: 0,
    players: 0,
    deactivated: 0,
    perTeam: {},
    unmappedTeams: [],
  };

  const mappedTeams = espnTeams.flatMap(({ team }) => {
    const code = mapProviderTeam(team.displayName, team.shortDisplayName);
    if (!code) {
      summary.unmappedTeams.push(team.displayName);
      return [];
    }
    return [{ code, espnTeamId: team.id, name: team.displayName }];
  });

  const rosters = await mapWithConcurrency(mappedTeams, CONCURRENCY, async (team) => {
    const roster = await fetchEspn<{ athletes?: EspnAthlete[] }>(`/teams/${team.espnTeamId}/roster`);
    return { team, athletes: roster.athletes ?? [] };
  });

  let batch = adminDb.batch();
  let operations = 0;
  const commitIfFull = async () => {
    if (operations < BATCH_LIMIT) return;
    if (!dryRun) await batch.commit();
    batch = adminDb.batch();
    operations = 0;
  };

  for (const { team, athletes } of rosters) {
    const teamRef = adminDb.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(team.code);
    const playersRef = teamRef.collection(FIRESTORE_COLLECTIONS.PLAYERS);
    const existing = new Map(
      (await playersRef.get()).docs.map((doc) => [doc.id, doc.data() as Partial<PlayerDoc>]),
    );

    batch.set(
      teamRef,
      { espnTeamId: team.espnTeamId, name: team.name, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    operations += 1;

    const seen = new Set<string>();
    for (const athlete of athletes) {
      const player = toPlayerDoc(athlete);
      if (!player) continue;

      const playerId = `espn_${player.espnId}`;
      seen.add(playerId);

      const current = existing.get(playerId);
      const headshot = athlete.headshot?.href;
      const keepsManualPhoto = current?.photoSource === "manual";
      const photo =
        !keepsManualPhoto && headshot
          ? { photoURL: headshot, photoSource: "espn" as const }
          : {};

      batch.set(
        playersRef.doc(playerId),
        { ...player, ...photo, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      operations += 1;
      summary.players += 1;
      await commitIfFull();
    }

    for (const [playerId, data] of existing) {
      if (!playerId.startsWith("espn_") || seen.has(playerId) || data.active === false) continue;
      batch.set(
        playersRef.doc(playerId),
        { active: false, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      operations += 1;
      summary.deactivated += 1;
      await commitIfFull();
    }

    summary.teams += 1;
    summary.perTeam[team.code] = seen.size;
  }

  if (!dryRun && operations > 0) await batch.commit();
  return summary;
}
