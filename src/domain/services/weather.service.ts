/**
 * Servicio de Dominio: Clima de sedes (Open-Meteo)
 *
 * Obtiene el pronóstico horario de Open-Meteo para la sede de un partido y lo
 * reduce a la hora más cercana al inicio (`fecha` del partido). No toca Firestore:
 * el llamador (API route) decide dónde persistir el resultado.
 *
 * Open-Meteo es gratis y sin API key. Horizonte fiable del forecast: ~16 días.
 * Documentación: https://open-meteo.com/en/docs
 */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TZ = "America/Lima";

/** Condición normalizada que consume la app iOS. */
export type WeatherCondition =
  | "despejado"
  | "nubes"
  | "niebla"
  | "lluvia"
  | "chubascos"
  | "tormenta"
  | "nieve";

/** Estructura que se guarda como sub-objeto `clima` del documento de partido. */
export interface WeatherSnapshot {
  tempC: number;
  sensacionC: number;
  humedad: number; // %
  vientoKmh: number;
  precipProb: number; // %
  codigoWMO: number;
  condicion: WeatherCondition;
  /** SF Symbol sugerido para iOS. */
  iconoSF: string;
  /** Hora local (America/Lima) del forecast usado, ISO sin zona: "2026-03-15T20:00". */
  horaReferencia: string;
  fuente: "open-meteo";
}

interface WmoInfo {
  condicion: WeatherCondition;
  iconoSF: string;
}

/** Mapa WMO weather_code -> condición + SF Symbol. Ver tabla WMO 4677. */
function mapWmoCode(code: number): WmoInfo {
  if (code === 0) return { condicion: "despejado", iconoSF: "sun.max.fill" };
  if (code === 1 || code === 2) return { condicion: "nubes", iconoSF: "cloud.sun.fill" };
  if (code === 3) return { condicion: "nubes", iconoSF: "cloud.fill" };
  if (code === 45 || code === 48) return { condicion: "niebla", iconoSF: "cloud.fog.fill" };
  if (code >= 51 && code <= 57) return { condicion: "lluvia", iconoSF: "cloud.drizzle.fill" };
  if (code >= 61 && code <= 67) return { condicion: "lluvia", iconoSF: "cloud.rain.fill" };
  if (code >= 71 && code <= 77) return { condicion: "nieve", iconoSF: "snowflake" };
  if (code >= 80 && code <= 82) return { condicion: "chubascos", iconoSF: "cloud.heavyrain.fill" };
  if (code === 85 || code === 86) return { condicion: "nieve", iconoSF: "cloud.snow.fill" };
  if (code >= 95) return { condicion: "tormenta", iconoSF: "cloud.bolt.rain.fill" };
  return { condicion: "nubes", iconoSF: "cloud.fill" };
}

interface LocalParts {
  /** "YYYY-MM-DD" en la zona indicada. */
  date: string;
  /** "YYYY-MM-DDTHH:00" en la zona indicada (minutos truncados a la hora). */
  hourIso: string;
}

/** Descompone un instante en fecha y hora locales de una zona IANA, sin librerías. */
function toLocalParts(date: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return { date: ymd, hourIso: `${ymd}T${get("hour")}:00` };
}

const OPEN_METEO_HORIZON_DAYS = 16;
/** Tolerancia hacia el pasado: un partido recién iniciado sigue teniendo forecast útil. */
const PAST_TOLERANCE_MS = 4 * 60 * 60 * 1000;

export interface FetchWeatherParams {
  lat: number;
  lng: number;
  /** Hora de inicio del partido (campo `fecha`). */
  kickoff: Date;
  timeZone?: string;
}

/** Motivo por el que no se obtuvo clima (para el reporte del endpoint). */
export type WeatherSkipReason = "fuera-de-horizonte" | "sin-hora-en-respuesta" | "respuesta-invalida";

export class WeatherError extends Error {
  constructor(
    message: string,
    readonly reason: WeatherSkipReason,
  ) {
    super(message);
    this.name = "WeatherError";
  }
}

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

function num(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Devuelve el clima para la hora más cercana al inicio del partido, o lanza
 * `WeatherError` si el partido cae fuera del horizonte del forecast o la
 * respuesta no es utilizable.
 */
export async function fetchWeatherForKickoff(
  params: FetchWeatherParams,
): Promise<WeatherSnapshot> {
  const timeZone = params.timeZone ?? DEFAULT_TZ;
  const now = Date.now();
  const kickoffMs = params.kickoff.getTime();

  if (kickoffMs < now - PAST_TOLERANCE_MS) {
    throw new WeatherError("El partido ya se jugó", "fuera-de-horizonte");
  }
  if (kickoffMs > now + OPEN_METEO_HORIZON_DAYS * 24 * 60 * 60 * 1000) {
    throw new WeatherError("Partido fuera del horizonte de Open-Meteo", "fuera-de-horizonte");
  }

  const { date, hourIso } = toLocalParts(params.kickoff, timeZone);

  const query = new URLSearchParams({
    latitude: params.lat.toFixed(4),
    longitude: params.lng.toFixed(4),
    hourly:
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m",
    timezone: timeZone,
    start_date: date,
    end_date: date,
    wind_speed_unit: "kmh",
  });

  const res = await fetch(`${OPEN_METEO_URL}?${query.toString()}`, {
    // Datos de servidor: nunca cachear la respuesta del proveedor.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new WeatherError(`Open-Meteo respondió ${res.status}`, "respuesta-invalida");
  }

  const data = (await res.json()) as OpenMeteoResponse;
  const hourly = data.hourly;
  const times = hourly?.time;
  if (!hourly || !times || times.length === 0) {
    throw new WeatherError("Open-Meteo no devolvió serie horaria", "respuesta-invalida");
  }

  // Índice de la hora exacta; si no está, la más cercana dentro del día.
  let idx = times.indexOf(hourIso);
  if (idx === -1) {
    const targetHour = Number(hourIso.slice(11, 13));
    let best = -1;
    let bestDiff = Number.POSITIVE_INFINITY;
    times.forEach((t, i) => {
      const diff = Math.abs(Number(t.slice(11, 13)) - targetHour);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    });
    idx = best;
  }
  if (idx === -1) {
    throw new WeatherError("No se ubicó la hora del partido en la respuesta", "sin-hora-en-respuesta");
  }

  const code = Math.round(num(hourly.weather_code?.[idx]));
  const wmo = mapWmoCode(code);

  return {
    tempC: Math.round(num(hourly.temperature_2m?.[idx]) * 10) / 10,
    sensacionC: Math.round(num(hourly.apparent_temperature?.[idx]) * 10) / 10,
    humedad: Math.round(num(hourly.relative_humidity_2m?.[idx])),
    vientoKmh: Math.round(num(hourly.wind_speed_10m?.[idx]) * 10) / 10,
    precipProb: Math.round(num(hourly.precipitation_probability?.[idx])),
    codigoWMO: code,
    condicion: wmo.condicion,
    iconoSF: wmo.iconoSF,
    horaReferencia: times[idx] ?? hourIso,
    fuente: "open-meteo",
  };
}
