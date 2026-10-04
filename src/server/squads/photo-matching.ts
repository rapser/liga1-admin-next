/**
 * Emparejamiento jugador <-> foto de Wikidata.
 *
 * Sin imports a propósito: se puede ejecutar suelto con Node para medir la
 * cobertura contra datos reales.
 *
 * Una foto solo se asigna con evidencia fuerte para no mostrar a otra persona:
 *   1. nombre idéntico (sin tildes) y misma fecha de nacimiento; o
 *   2. misma fecha de nacimiento y al menos un apellido en común (y único).
 * Sin fecha de nacimiento no se asigna nada: preferimos no tener foto a mostrar a otra persona.
 */

/** Quita tildes y signos: base para comparar nombres entre proveedores. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface WikidataPhoto {
  wikidataId: string;
  name: string;
  tokens: Set<string>;
  birth: string | null;
  imageUrl: string;
}

export function findPhoto(
  player: { name: string; dateOfBirth: string | null },
  photos: WikidataPhoto[],
): WikidataPhoto | null {
  const playerName = normalizeName(player.name);
  const playerTokens = new Set(playerName.split(" ").filter((token) => token.length > 2));

  if (!player.dateOfBirth) return null;

  const exact = photos.find(
    (photo) => photo.birth === player.dateOfBirth && normalizeName(photo.name) === playerName,
  );
  if (exact) return exact;

  const sameBirth = photos.filter(
    (photo) =>
      photo.birth === player.dateOfBirth &&
      [...photo.tokens].some((token) => playerTokens.has(token)),
  );
  // Si dos personas comparten fecha y apellido, es ambiguo: mejor sin foto.
  return sameBirth.length === 1 ? (sameBirth[0] ?? null) : null;
}
