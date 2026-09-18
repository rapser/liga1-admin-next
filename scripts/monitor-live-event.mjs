const eventId = Number(process.argv[2]);
const secret = process.env.CRON_SECRET;
const baseUrl = (process.env.LIVE_SYNC_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const intervalMs = positiveNumber(process.env.LIVE_MONITOR_INTERVAL_MS, 45_000);
const maxDurationMs = positiveNumber(process.env.LIVE_MONITOR_MAX_DURATION_MS, 21_600_000);

if (!Number.isSafeInteger(eventId) || eventId <= 0) {
  console.error("Uso: npm run monitor:live -- <eventId>");
  process.exit(1);
}

if (!secret) {
  console.error("Falta CRON_SECRET en el entorno.");
  process.exit(1);
}

const startedAt = Date.now();
let stopping = false;

process.on("SIGINT", stopFromSignal);
process.on("SIGTERM", stopFromSignal);

while (!stopping && Date.now() - startedAt < maxDurationMs) {
  try {
    const result = await syncEvent();
    console.log(`${new Date().toISOString()} ${JSON.stringify(result)}`);

    if (result.stopMonitoring === true) {
      console.log(
        `Monitor finalizado: el evento ${eventId} quedó ${result.requestedEventStatus}.`,
      );
      process.exit(0);
    }
  } catch (error) {
    console.error(`${new Date().toISOString()} ${error instanceof Error ? error.message : error}`);
  }

  await delay(intervalMs);
}

if (!stopping) {
  console.error(
    `Monitor cerrado por seguridad tras ${Math.round(maxDurationMs / 60_000)} minutos.`,
  );
  process.exit(2);
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function syncEvent() {
  const url = new URL("/api/live-sync", baseUrl);
  url.searchParams.set("mode", "live");
  url.searchParams.set("eventId", String(eventId));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Sincronización HTTP ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function stopFromSignal() {
  stopping = true;
}
