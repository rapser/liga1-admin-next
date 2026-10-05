export type PlayerPosition = "GK" | "DF" | "MF" | "FW";

/** De dónde viene la foto: `manual` (admin) nunca se pisa en reimportaciones. */
export type PhotoSource = "manual" | "espn" | "wikidata";

/** Documento `equipos/{code}/players/{playerId}`. */
export interface PlayerDoc {
  name: string;
  shortName: string;
  number: number | null;
  position: PlayerPosition;
  age: number | null;
  /** yyyy-MM-dd */
  dateOfBirth: string | null;
  nationality: string | null;
  espnId: string;
  active: boolean;
  photoURL?: string;
  photoSource?: PhotoSource;
  photoCredit?: string;
  wikidataId?: string;
}

export const SQUAD_USER_AGENT = "liga1-admin-next/1.0 (squad import)";
