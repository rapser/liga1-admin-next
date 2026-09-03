/**
 * API Route: Refresco del clima de las sedes (Open-Meteo -> Firestore)
 *
 *   GET  /api/weather/refresh   -> lo invoca Vercel Cron (envía `Authorization: Bearer $CRON_SECRET`)
 *   POST /api/weather/refresh   -> disparo manual desde el panel (sesión de admin) o con el mismo Bearer
 *
 * Recorre las jornadas visibles (`mostrar: true`), toma los partidos pendientes o
 * en vivo cuyo inicio (`fecha`) cae dentro del horizonte del forecast, resuelve la
 * sede por el equipo local (colección `stadiums`, sembrada desde la app iOS) y
 * escribe el sub-objeto `clima` en cada `jornadas/{id}/matches/{matchId}`.
 *
 * Coste: 1 lectura por jornada + 1 por sede + 1 escritura por partido. Sin lecturas
 * por usuario. El cliente iOS solo lee el campo `clima` ya resuelto.
 */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/core/config/firebase-admin";
import { FIRESTORE_COLLECTIONS } from "@/core/config/firestore-constants";
import {
  fetchWeatherForKickoff,
  WeatherError,
  type WeatherSkipReason,
} from "@/domain/services/weather.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SESSION_COOKIE_NAME = "__session";
const CONCURRENCY = 5;

// --- Autorización -------------------------------------------------------------

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;

  // Disparo manual desde el panel: cookie de sesión de admin válida.
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session) {
    try {
      await adminAuth.verifySessionCookie(session, true);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// --- Sedes -------------------------------------------------------------------

interface StadiumCoords {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

/** Lee `stadiums` una vez y lo indexa por cada código de equipo local. */
async function loadStadiumsByTeam(): Promise<Map<string, StadiumCoords>> {
  const snap = await adminDb.collection(FIRESTORE_COLLECTIONS.STADIUMS).get();
  const byTeam = new Map<string, StadiumCoords>();

  for (const doc of snap.docs) {
    const d = doc.data();
    const lat = typeof d.lat === "number" ? d.lat : null;
    const lng = typeof d.lng === "number" ? d.lng : null;
    const teams: unknown = d.homeTeamCodes;
    if (lat === null || lng === null || !Array.isArray(teams)) continue;

    const coords: StadiumCoords = {
      code: doc.id,
      name: typeof d.name === "string" ? d.name : doc.id,
      lat,
      lng,
    };
    for (const t of teams) {
      if (typeof t === "string") byTeam.set(t.toLowerCase(), coords);
    }
  }
  return byTeam;
}

// --- Selección de partidos --------------------------------------------------

interface PendingMatch {
  jornadaId: string;
  matchId: string;
  kickoff: Date;
  homeTeam: string;
}

const HORIZON_MS = 16 * 24 * 60 * 60 * 1000;
const PAST_TOLERANCE_MS = 4 * 60 * 60 * 1000;

async function collectMatches(): Promise<PendingMatch[]> {
  const jornadasSnap = await adminDb
    .collection(FIRESTORE_COLLECTIONS.JORNADAS)
    .where("mostrar", "==", true)
    .get();

  const now = Date.now();
  const out: PendingMatch[] = [];

  for (const jornadaDoc of jornadasSnap.docs) {
    const matchesSnap = await jornadaDoc.ref
      .collection(FIRESTORE_COLLECTIONS.MATCHES)
      .get();

    for (const matchDoc of matchesSnap.docs) {
      const d = matchDoc.data();
      const estado = d.estado;
      if (estado !== "pendiente" && estado !== "envivo") continue;

      const fecha = d.fecha;
      if (!(fecha instanceof Timestamp)) continue;
      const kickoff = fecha.toDate();
      const ms = kickoff.getTime();
      if (ms < now - PAST_TOLERANCE_MS || ms > now + HORIZON_MS) continue;

      const homeTeam = typeof d.equipoLocalId === "string" ? d.equipoLocalId.toLowerCase() : "";
      if (!homeTeam) continue;

      out.push({ jornadaId: jornadaDoc.id, matchId: matchDoc.id, kickoff, homeTeam });
    }
  }
  return out;
}

// --- Utilidad de concurrencia ---------------------------------------------------

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]!);
    }
  });
  await Promise.all(runners);
}

// --- Handler ----------------------------------------------------------------

interface RefreshSummary {
  ok: true;
  actualizados: number;
  sinSede: number;
  fueraDeHorizonte: number;
  errores: number;
  detalleErrores: { match: string; motivo: WeatherSkipReason | "excepcion"; mensaje: string }[];
  duracionMs: number;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const startedAt = Date.now();

  let stadiumsByTeam: Map<string, StadiumCoords>;
  let matches: PendingMatch[];
  try {
    [stadiumsByTeam, matches] = await Promise.all([loadStadiumsByTeam(), collectMatches()]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("weather/refresh: fallo al leer Firestore:", msg);
    return NextResponse.json({ error: "Error al leer datos", details: msg }, { status: 500 });
  }

  const writer = adminDb.bulkWriter();
  let actualizados = 0;
  let sinSede = 0;
  let fueraDeHorizonte = 0;
  const detalleErrores: RefreshSummary["detalleErrores"] = [];

  await pool(matches, CONCURRENCY, async (m) => {
    const stadium = stadiumsByTeam.get(m.homeTeam);
    if (!stadium) {
      sinSede++;
      return;
    }

    try {
      const clima = await fetchWeatherForKickoff({
        lat: stadium.lat,
        lng: stadium.lng,
        kickoff: m.kickoff,
      });

      const ref = adminDb
        .collection(FIRESTORE_COLLECTIONS.JORNADAS)
        .doc(m.jornadaId)
        .collection(FIRESTORE_COLLECTIONS.MATCHES)
        .doc(m.matchId);

      void writer.set(
        ref,
        {
          clima: {
            ...clima,
            sede: stadium.code,
            actualizadoEn: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
      actualizados++;
    } catch (error) {
      if (error instanceof WeatherError) {
        if (error.reason === "fuera-de-horizonte") {
          fueraDeHorizonte++;
          return;
        }
        detalleErrores.push({
          match: `${m.jornadaId}/${m.matchId}`,
          motivo: error.reason,
          mensaje: error.message,
        });
        return;
      }
      const msg = error instanceof Error ? error.message : String(error);
      detalleErrores.push({ match: `${m.jornadaId}/${m.matchId}`, motivo: "excepcion", mensaje: msg });
    }
  });

  await writer.close();

  const summary: RefreshSummary = {
    ok: true,
    actualizados,
    sinSede,
    fueraDeHorizonte,
    errores: detalleErrores.length,
    detalleErrores,
    duracionMs: Date.now() - startedAt,
  };
  console.info("weather/refresh:", JSON.stringify(summary));
  return NextResponse.json(summary);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
