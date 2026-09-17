import { NextRequest, NextResponse } from "next/server";
import { LiveSyncService, type LiveSyncMode } from "@/server/live-sync/live-sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  );
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const modeParam = request.nextUrl.searchParams.get("mode") || "live";
  if (!(["live", "fixtures", "reconcile"] as string[]).includes(modeParam)) {
    return NextResponse.json({ error: "mode inválido" }, { status: 400 });
  }
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  const adoptUnconfigured = request.nextUrl.searchParams.get("adopt") === "true";
  if (process.env.LIVE_SYNC_ENABLED !== "true" && !dryRun) {
    return NextResponse.json(
      { error: "Sincronización desactivada", hint: "Usa dryRun=true o activa LIVE_SYNC_ENABLED" },
      { status: 503 },
    );
  }

  try {
    const result = await new LiveSyncService().run(
      modeParam as LiveSyncMode,
      dryRun,
      adoptUnconfigured,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Falló live sync", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
