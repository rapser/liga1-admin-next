/**
 * Lee la tabla de plantilla copiada de Transfermarkt (página "Plantilla" del club,
 * seleccionar la tabla con el mouse y Cmd+C). Cada jugador ocupa 4 líneas:
 *
 *   12\t                                  ← dorsal ("-" si no tiene) + club de origen (opcional)
 *   Ángel Zamudio\tÁngel Zamudio          ← nombre (repetido)
 *   Portero                               ← posición
 *   29\tPerú\t31/12/2027\t450 mil €       ← edad o "17/08/2001 (25)", nacionalidad, …
 *   [Alemania\t31/12/2028\t325 mil €]     ← 2.ª nacionalidad (opcional, se ignora)
 *
 * La nacionalidad que se guarda es la primera que lista Transfermarkt.
 */

import { PlayerPosition } from "./squad-types";

export interface TransfermarktPlayer {
  name: string;
  number: number | null;
  position: PlayerPosition;
  /** Texto original de Transfermarkt, ej. "Extremo izquierdo". */
  positionLabel: string;
  age: number | null;
  /** yyyy-MM-dd, solo si la tabla trae la fecha de nacimiento. */
  dateOfBirth: string | null;
  /** Código de 3 letras (FIFA) o ISO alpha-2; la app iOS acepta ambos. */
  nationality: string;
}

export interface ParseResult {
  players: TransfermarktPlayer[];
  /** Problemas que impiden sincronizar (posición o país desconocido, dorsal repetido…). */
  errors: string[];
}

const POSITIONS: Record<string, PlayerPosition> = {
  portero: "GK",
  defensa: "DF",
  "defensa central": "DF",
  "lateral izquierdo": "DF",
  "lateral derecho": "DF",
  "carrilero izquierdo": "DF",
  "carrilero derecho": "DF",
  pivote: "MF",
  mediocentro: "MF",
  "mediocentro ofensivo": "MF",
  "interior izquierdo": "MF",
  "interior derecho": "MF",
  "medio izquierdo": "MF",
  "medio derecho": "MF",
  mediapunta: "MF",
  centrocampista: "MF",
  "extremo izquierdo": "FW",
  "extremo derecho": "FW",
  "delantero centro": "FW",
  "segundo delantero": "FW",
  delantero: "FW",
};

/**
 * País (como lo escribe transfermarkt.pe) → código. Se usan los códigos FIFA que
 * conoce la app (CountryFlag.swift); para el resto, ISO alpha-2, que la app también acepta.
 */
const COUNTRIES: Record<string, string> = {
  peru: "PER", argentina: "ARG", brasil: "BRA", bolivia: "BOL", colombia: "COL",
  ecuador: "ECU", venezuela: "VEN", chile: "CHI", uruguay: "URU", paraguay: "PAR",
  "estados unidos": "USA", mexico: "MEX", canada: "CAN", panama: "PAN", "costa rica": "CRC",
  honduras: "HON", guatemala: "GUA", "el salvador": "SLV", nicaragua: "NCA", cuba: "CUB",
  "republica dominicana": "DOM", "rep. dominicana": "DOM", haiti: "HAI", jamaica: "JAM",
  espana: "ESP", portugal: "POR", italia: "ITA", francia: "FRA", alemania: "GER",
  inglaterra: "ENG", "reino unido": "GBR", "paises bajos": "NED", belgica: "BEL", suiza: "SUI",
  croacia: "CRO", serbia: "SRB", grecia: "GRE",
  "corea del sur": "KOR", japon: "JPN", china: "CHN", palestina: "PLE", australia: "AUS",
  nigeria: "NGA", ghana: "GHA", camerun: "CMR", senegal: "SEN", "costa de marfil": "CIV",
  marruecos: "MAR",
  // Fuera del mapa FIFA de la app: ISO alpha-2.
  dinamarca: "DK", austria: "AT", polonia: "PL", suecia: "SE", noruega: "NO", irlanda: "IE",
  escocia: "GB", gales: "GB", rusia: "RU", ucrania: "UA", rumania: "RO", turquia: "TR",
  libano: "LB", israel: "IL", "trinidad y tobago": "TT", curazao: "CW", surinam: "SR",
  guyana: "GY", angola: "AO", "cabo verde": "CV", "guinea ecuatorial": "GQ", mali: "ML",
  "republica checa": "CZ", eslovaquia: "SK", eslovenia: "SI", hungria: "HU", bulgaria: "BG",
  albania: "AL", "bosnia-herzegovina": "BA", montenegro: "ME", lituania: "LT", letonia: "LV",
  georgia: "GE", armenia: "AM", finlandia: "FI", islandia: "IS", luxemburgo: "LU",
  "nueva zelanda": "NZ", "sudafrica": "ZA", egipto: "EG", argelia: "DZ", tunez: "TN",
};

/** Minúsculas, sin tildes ni espacios repetidos. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_LINE = /^(\d{1,3}|-)?\t/;
/** "29\tPerú…" o "17/08/2001 (25)\tPerú…". */
const AGE_LINE = /^(?:(\d{2})\/(\d{2})\/(\d{4}) \((\d{1,2})\)|(\d{1,2})|-)?\t([^\t]+)/;

export function parseTransfermarktSquad(text: string): ParseResult {
  const lines = text.replace(/\r/g, "").split("\n");
  const players: TransfermarktPlayer[] = [];
  const errors: string[] = [];

  const line = (index: number) => lines[index] ?? "";

  for (let i = 0; i + 3 < lines.length; i++) {
    const numberMatch = line(i).match(NUMBER_LINE);
    if (!numberMatch) continue;

    const name = (line(i + 1).split("\t")[0] ?? "").trim();
    const positionLabel = line(i + 2).trim();
    const ageMatch = line(i + 3).match(AGE_LINE);
    // No es el inicio de un jugador (p. ej. una línea de 2.ª nacionalidad): seguir buscando.
    if (!name || !ageMatch || line(i + 2).includes("\t")) continue;

    const [, day, month, year, ageFromDate, plainAge, countryText = ""] = ageMatch;
    const position = POSITIONS[normalizeText(positionLabel)];
    const nationality = COUNTRIES[normalizeText(countryText)];

    if (!position) errors.push(`${name}: posición desconocida "${positionLabel}"`);
    if (!nationality) errors.push(`${name}: país desconocido "${countryText.trim()}"`);

    if (position && nationality) {
      const age = ageFromDate ?? plainAge;
      players.push({
        name,
        number: numberMatch[1] && numberMatch[1] !== "-" ? Number(numberMatch[1]) : null,
        position,
        positionLabel,
        age: age ? Number(age) : null,
        dateOfBirth: year ? `${year}-${month}-${day}` : null,
        nationality,
      });
    }
    i += 3;
  }

  const seen = new Map<number, string>();
  for (const player of players) {
    if (player.number == null) continue;
    const other = seen.get(player.number);
    if (other) errors.push(`Dorsal ${player.number} repetido: ${other} y ${player.name}`);
    seen.set(player.number, player.name);
  }

  if (players.length === 0 && errors.length === 0) {
    errors.push(
      "No se encontró ningún jugador. Copia la tabla de la plantilla de Transfermarkt desde el dorsal del primer jugador hasta el último.",
    );
  }

  return { players, errors };
}
