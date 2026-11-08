/**
 * Sincroniza la plantilla de un equipo con la tabla pegada desde Transfermarkt.
 * Primero se previsualiza (sin escribir); al confirmar se vuelve a calcular el plan
 * y solo se guarda si coincide con lo que la persona revisó.
 */

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/core/config/firebase-admin";
import { FIRESTORE_COLLECTIONS, TEAM_NAMES } from "@/core/config/firestore-constants";
import { parseTransfermarktSquad, TransfermarktPlayer } from "./transfermarkt-squad-parser";
import { buildSquadSyncPlan, ExistingPlayer, planHasChanges, SquadSyncPlan } from "./squad-sync-plan";

export interface SquadSyncResult {
  teamCode: string;
  teamName: string;
  parsedPlayers: number;
  errors: string[];
  plan: SquadSyncPlan | null;
  hasChanges: boolean;
  /** Huella del plan: el cliente la devuelve al confirmar. */
  planId: string | null;
  applied: boolean;
}

export class SquadSyncError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function playersCollection(teamCode: string) {
  return adminDb
    .collection(FIRESTORE_COLLECTIONS.TEAMS)
    .doc(teamCode)
    .collection(FIRESTORE_COLLECTIONS.PLAYERS);
}

function planFingerprint(plan: SquadSyncPlan): string {
  const summary = {
    incoming: plan.incoming.map((p) => [p.id, p.player]),
    outgoing: plan.outgoing.map((p) => p.id),
    matched: plan.matched.map((m) => [m.id, m.player, m.changes]),
  };
  return createHash("sha256").update(JSON.stringify(summary)).digest("hex").slice(0, 16);
}

/** Campos que vienen de Transfermarkt. `fullName`/`status` se mantienen por compatibilidad. */
function squadFields(player: TransfermarktPlayer) {
  return {
    name: player.name,
    fullName: player.name,
    shortName: player.name.split(" ").at(-1) ?? player.name,
    number: player.number,
    position: player.position,
    age: player.age,
    nationality: player.nationality,
    ...(player.dateOfBirth ? { dateOfBirth: player.dateOfBirth } : {}),
    active: true,
    status: "active",
    squadSource: "transfermarkt",
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function syncSquadFromTransfermarkt(options: {
  teamCode: string;
  table: string;
  /** Si viene, se guarda; debe ser el `planId` de la previsualización. */
  confirmPlanId?: string;
}): Promise<SquadSyncResult> {
  const { teamCode, table, confirmPlanId } = options;
  const teamName = TEAM_NAMES[teamCode];
  if (!teamName) throw new SquadSyncError(`Equipo desconocido: ${teamCode}`, 400);

  const parsed = parseTransfermarktSquad(table);
  const base = { teamCode, teamName, parsedPlayers: parsed.players.length, errors: parsed.errors };
  if (parsed.errors.length > 0) {
    return { ...base, plan: null, hasChanges: false, planId: null, applied: false };
  }

  const snapshot = await playersCollection(teamCode).get();
  const existing: ExistingPlayer[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name ?? data.fullName ?? doc.id,
      number: typeof data.number === "number" ? data.number : null,
      position: data.position ?? null,
      nationality: data.nationality ?? null,
      active: data.active === true,
    };
  });

  const plan = buildSquadSyncPlan(parsed.players, existing);
  const planId = planFingerprint(plan);
  const hasChanges = planHasChanges(plan);

  if (!confirmPlanId) {
    return { ...base, plan, hasChanges, planId, applied: false };
  }
  if (confirmPlanId !== planId) {
    throw new SquadSyncError(
      "La plantilla cambió desde que la revisaste. Vuelve a previsualizar antes de confirmar.",
      409,
    );
  }

  const collection = playersCollection(teamCode);
  const batch = adminDb.batch();
  for (const { id, player } of plan.incoming) {
    batch.set(collection.doc(id), { dateOfBirth: null, ...squadFields(player), photoURL: null });
  }
  for (const { id, player } of plan.matched) {
    // También los que no cambian: así se refrescan edad y fecha de nacimiento.
    batch.update(collection.doc(id), squadFields(player));
  }
  for (const { id } of plan.outgoing) {
    batch.update(collection.doc(id), {
      active: false,
      status: "inactive",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  batch.set(
    adminDb.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(teamCode),
    { squadSyncedAt: FieldValue.serverTimestamp(), squadSource: "transfermarkt" },
    { merge: true },
  );
  await batch.commit();

  return { ...base, plan, hasChanges, planId, applied: true };
}
