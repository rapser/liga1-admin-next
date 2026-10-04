/**
 * Completa `photoURL` de los jugadores con fotos de Wikimedia Commons, tomadas
 * de Wikidata (P18 = imagen) para jugadores con contrato vigente (P54 sin fin)
 * en clubes de la Primera División del Perú.
 *
 * Cobertura esperada baja: la mayoría de jugadores de la liga no tienen foto en
 * Wikidata. Los que no se encuentran quedan sin foto y se completan a mano
 * desde el panel (`photoSource: "manual"`, que nunca se pisa).
 *
 * El criterio de emparejamiento (estricto, por fecha de nacimiento) está en photo-matching.ts.
 */

import { adminDb } from "@/core/config/firebase-admin";
import { FIRESTORE_COLLECTIONS } from "@/core/config/firestore-constants";
import { findPhoto, normalizeName, WikidataPhoto } from "./photo-matching";
import { PlayerDoc, SQUAD_USER_AGENT } from "./squad-types";

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
/** Wikidata: Q606652 = Peruvian Primera División. */
const SPARQL = `
SELECT ?p ?pLabel ?img ?birth WHERE {
  ?club wdt:P118 wd:Q606652 .
  ?p p:P54 ?st .
  ?st ps:P54 ?club .
  FILTER NOT EXISTS { ?st pq:P582 ?end }
  ?p wdt:P18 ?img .
  OPTIONAL { ?p wdt:P569 ?birth }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}`;
const PHOTO_WIDTH = 400;
const BATCH_LIMIT = 400;

export interface PhotoEnrichmentSummary {
  dryRun: boolean;
  wikidataPlayers: number;
  matched: number;
  skippedExistingPhoto: number;
  unmatched: number;
}

interface WikidataBinding {
  p: { value: string };
  pLabel: { value: string };
  img: { value: string };
  birth?: { value: string };
}

async function fetchWikidataPhotos(): Promise<WikidataPhoto[]> {
  const url = new URL(WIKIDATA_ENDPOINT);
  url.searchParams.set("query", SPARQL);
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: { "User-Agent": SQUAD_USER_AGENT, Accept: "application/sparql-results+json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Wikidata respondió ${response.status}`);
  }

  const data = (await response.json()) as { results: { bindings: WikidataBinding[] } };
  return data.results.bindings.map((row) => {
    const name = row.pLabel.value;
    // Special:FilePath redirige al archivo; ?width= pide una miniatura.
    const image = row.img.value.replace(/^http:/, "https:");
    return {
      wikidataId: row.p.value.split("/").pop() ?? row.p.value,
      name,
      tokens: new Set(normalizeName(name).split(" ").filter((token) => token.length > 2)),
      birth: row.birth ? row.birth.value.slice(0, 10) : null,
      imageUrl: `${image}${image.includes("?") ? "&" : "?"}width=${PHOTO_WIDTH}`,
    };
  });
}

export async function enrichPlayerPhotos({ dryRun }: { dryRun: boolean }): Promise<PhotoEnrichmentSummary> {
  const photos = await fetchWikidataPhotos();
  const summary: PhotoEnrichmentSummary = {
    dryRun,
    wikidataPlayers: photos.length,
    matched: 0,
    skippedExistingPhoto: 0,
    unmatched: 0,
  };

  const teams = await adminDb.collection(FIRESTORE_COLLECTIONS.TEAMS).get();
  let batch = adminDb.batch();
  let operations = 0;

  for (const team of teams.docs) {
    const players = await team.ref.collection(FIRESTORE_COLLECTIONS.PLAYERS).get();
    for (const doc of players.docs) {
      const player = doc.data() as PlayerDoc;
      // Manual y ESPN ya tienen foto fiable; solo refrescamos la de Wikidata.
      if (player.photoURL && player.photoSource !== "wikidata") {
        summary.skippedExistingPhoto += 1;
        continue;
      }

      const photo = findPhoto(player, photos);
      if (!photo) {
        summary.unmatched += 1;
        continue;
      }

      summary.matched += 1;
      batch.set(
        doc.ref,
        {
          photoURL: photo.imageUrl,
          photoSource: "wikidata",
          photoCredit: "Wikimedia Commons",
          wikidataId: photo.wikidataId,
        },
        { merge: true },
      );
      operations += 1;
      if (operations >= BATCH_LIMIT) {
        if (!dryRun) await batch.commit();
        batch = adminDb.batch();
        operations = 0;
      }
    }
  }

  if (!dryRun && operations > 0) await batch.commit();
  return summary;
}
