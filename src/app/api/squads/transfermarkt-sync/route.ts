/**
 * API Route: sincroniza la plantilla de un equipo con la tabla copiada de Transfermarkt.
 *
 *   POST /api/squads/transfermarkt-sync
 *   { teamCode, table }              -> previsualiza (no escribe) y devuelve el plan + planId
 *   { teamCode, table, confirmPlanId } -> guarda, solo si el plan sigue igual
 *
 * Autorización: Bearer $CRON_SECRET o sesión de admin del panel.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/server/auth/admin-request";
import { SquadSyncError, syncSquadFromTransfermarkt } from "@/server/squads/squad-sync.service";

export const dynamic = "force-dynamic";

const MAX_TABLE_LENGTH = 100_000;

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { teamCode?: unknown; table?: unknown; confirmPlanId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const { teamCode, table, confirmPlanId } = body;
  if (typeof teamCode !== "string" || typeof table !== "string" || !table.trim()) {
    return NextResponse.json({ ok: false, error: "Falta el equipo o la tabla" }, { status: 400 });
  }
  if (table.length > MAX_TABLE_LENGTH) {
    return NextResponse.json({ ok: false, error: "La tabla es demasiado larga" }, { status: 400 });
  }

  try {
    const result = await syncSquadFromTransfermarkt({
      teamCode,
      table,
      confirmPlanId: typeof confirmPlanId === "string" ? confirmPlanId : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof SquadSyncError ? error.status : 500;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status },
    );
  }
}
