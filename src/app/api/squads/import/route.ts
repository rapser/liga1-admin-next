/**
 * API Route: importa las plantillas desde ESPN a Firestore
 *
 *   POST /api/squads/import            -> escribe en Firestore
 *   POST /api/squads/import?dryRun=true -> solo calcula y devuelve el resumen
 *
 * Autorización: Bearer $CRON_SECRET o sesión de admin del panel.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/server/auth/admin-request";
import { importSquads } from "@/server/squads/squad-import.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  try {
    const summary = await importSquads({ dryRun });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
