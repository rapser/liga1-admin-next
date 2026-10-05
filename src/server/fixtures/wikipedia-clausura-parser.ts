/**
 * Parser del wikitext de "Torneo Clausura 2026 (Perú)" en es.wikipedia.org.
 *
 * Cada jornada es una tabla "Fecha N" con las columnas:
 *   Local | Resultado | Visitante | Estadio | Fecha | Hora | Árbitro | VAR | TV
 * La columna Fecha usa `rowspan`, así que los partidos del mismo día no la
 * repiten: hay que arrastrar la fecha anterior.
 *
 * Sin imports a propósito: lo carga directamente `scripts/*.mjs`.
 * Las horas de Wikipedia son hora de Lima (UTC-5).
 */

export const WIKIPEDIA_CLAUSURA_PAGE = 'Torneo_Clausura_2026_(Perú)';

const LIMA_UTC_OFFSET_HOURS = 5;

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

export interface ParsedFixtureMatch {
  localName: string;
  visitanteName: string;
  localId: string | null;
  visitanteId: string | null;
  /** null cuando la tabla todavía no tiene fecha u hora para el partido */
  fecha: Date | null;
}

export interface ParsedFixtureJornada {
  numero: number;
  matches: ParsedFixtureMatch[];
}

function cleanCell(raw: string): string {
  return raw
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quita atributos de celda tipo ` rowspan="4" |28 de octubre`. */
function stripCellAttributes(cell: string): string {
  return cell.replace(/^\s*(?:rowspan|colspan|style|align|width|bgcolor)[^|]*\|\s*/i, '');
}

function parseDay(text: string): { day: number; month: number } | null {
  const match = text.match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
  if (!match) return null;
  const month = MONTHS[(match[2] ?? '').toLowerCase()];
  if (month === undefined) return null;
  return { day: Number(match[1]), month };
}

function parseHour(text: string): { hour: number; minute: number } | null {
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function toLimaDate(
  year: number,
  day: { day: number; month: number },
  time: { hour: number; minute: number }
): Date {
  return new Date(
    Date.UTC(year, day.month, day.day, time.hour + LIMA_UTC_OFFSET_HOURS, time.minute)
  );
}

function parseTable(
  table: string,
  year: number,
  mapTeam: (name: string) => string | null
): ParsedFixtureJornada | null {
  const header = table.match(/^!.*\|\s*Fecha (\d+)\s*$/m);
  if (!header) return null;

  const matches: ParsedFixtureMatch[] = [];
  let currentDay: { day: number; month: number } | null = null;

  // El primer bloque es la cabecera de la tabla; los siguientes, filas.
  for (const row of table.split(/\n\|-[^\n]*/).slice(1)) {
    const lines = row.split('\n').filter((line) => line.startsWith('|'));
    if (lines.length === 0 || row.trimStart().startsWith('!')) continue;

    const cells = lines.map((line) => cleanCell(stripCellAttributes(line.slice(1))));
    const [localName, , visitanteName] = cells;
    if (!localName || !visitanteName) continue;

    // Con la celda Fecha presente: Estadio, Fecha, Hora. Sin ella (rowspan): Estadio, Hora.
    let time = parseHour(cells[4] ?? '');
    if (!time) {
      const day = parseDay(cells[4] ?? '');
      if (day) currentDay = day;
      time = parseHour(cells[5] ?? '');
    }

    matches.push({
      localName,
      visitanteName,
      localId: mapTeam(localName),
      visitanteId: mapTeam(visitanteName),
      fecha: currentDay && time ? toLimaDate(year, currentDay, time) : null,
    });
  }

  return { numero: Number(header[1]), matches };
}

export function parseClausuraFixtures(
  wikitext: string,
  mapTeam: (name: string) => string | null,
  year = 2026
): ParsedFixtureJornada[] {
  return wikitext
    .split(/^\{\|/m)
    .map((table) => parseTable(table.split(/^\|\}/m)[0] ?? '', year, mapTeam))
    .filter((jornada): jornada is ParsedFixtureJornada => jornada !== null);
}
