export type PlayerPosition = "GK" | "DF" | "MF" | "FW";

/** De dónde viene la foto: `manual` (admin) nunca la pisa la búsqueda en Wikidata. */
export type PhotoSource = "manual" | "wikidata";

/**
 * Documento `equipos/{code}/players/{playerId}`. Las plantillas vienen de
 * Transfermarkt (ids tipo "angel-zamudio"); ver scripts/normalize-legacy-players.mjs.
 */
export interface PlayerDoc {
  name: string;
  shortName: string;
  number: number | null;
  position: PlayerPosition;
  age: number | null;
  /** yyyy-MM-dd */
  dateOfBirth: string | null;
  nationality: string | null;
  active: boolean;
  photoURL?: string;
  photoSource?: PhotoSource;
  photoCredit?: string;
  wikidataId?: string;
}

export const SQUAD_USER_AGENT = "liga1-admin-next/1.0 (squad photos)";
