/**
 * Carga fechas y horas oficiales del Clausura desde Wikipedia
 * (es.wikipedia.org/wiki/Torneo_Clausura_2026_(Perú)).
 *
 * Por jornada actualiza solo `fecha` de cada partido pendiente y, si los 9
 * partidos quedan con fecha y hora válidas, marca la jornada con
 * `horariosConfirmados: true` (+ `fechaInicio` / `fechaFin`).
 * Una jornada con cualquier problema no se toca.
 *
 * Por defecto solo muestra una vista previa:
 *   npm run fixtures:wikipedia -- --jornada 14,15
 *
 * Para aplicar los cambios:
 *   npm run fixtures:wikipedia -- --jornada 14,15 --apply
 */

import { Timestamp } from 'firebase-admin/firestore';
import { formatLima, getAdminDb } from './lib/admin-db.mjs';
import { validateJornadaSchedule } from '../src/domain/services/schedule-validation.ts';
import {
  WIKIPEDIA_CLAUSURA_PAGE,
  parseClausuraFixtures,
} from '../src/server/fixtures/wikipedia-clausura-parser.ts';
import { mapProviderTeam } from '../src/server/live-sync/team-mapping.ts';

const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');
const jornadaArg = args[args.indexOf('--jornada') + 1];

if (!args.includes('--jornada') || !jornadaArg || jornadaArg.startsWith('--')) {
  throw new Error('Indica las jornadas a cargar, por ejemplo: --jornada 14,15');
}

const requested = jornadaArg.split(',').map((value) => Number(value.trim()));
if (requested.some((value) => !Number.isInteger(value) || value < 1)) {
  throw new Error(`Jornadas inválidas: ${jornadaArg}`);
}

async function fetchWikitext() {
  const url = new URL('https://es.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'parse',
    page: WIKIPEDIA_CLAUSURA_PAGE,
    prop: 'wikitext',
    format: 'json',
    formatversion: '2',
  }).toString();

  const response = await fetch(url, {
    headers: { 'User-Agent': 'liga1-admin-next fixtures import (hometomairo@gmail.com)' },
  });
  if (!response.ok) {
    throw new Error(`Wikipedia respondió ${response.status}`);
  }
  return (await response.json()).parse.wikitext;
}

const parsed = parseClausuraFixtures(await fetchWikitext(), mapProviderTeam);
const db = getAdminDb();
let hadErrors = false;

for (const numero of requested) {
  const jornadaId = `clausura_${String(numero).padStart(2, '0')}`;
  const fixture = parsed.find((jornada) => jornada.numero === numero);
  const errors = [];

  console.log(`\n=== ${jornadaId} ===`);

  if (!fixture || fixture.matches.length === 0) {
    console.log('Wikipedia todavía no publica esta jornada. No se modifica.');
    hadErrors = true;
    continue;
  }

  const matchesRef = db.collection('jornadas').doc(jornadaId).collection('matches');
  const snapshot = await matchesRef.get();
  const docsByTeams = new Map(
    snapshot.docs.map((doc) => {
      const data = doc.data();
      const [homeFromId, awayFromId] = doc.id.split('_');
      return [
        `${data.equipoLocalId ?? homeFromId}_${data.equipoVisitanteId ?? awayFromId}`,
        doc,
      ];
    })
  );

  const updates = [];
  for (const match of fixture.matches) {
    const label = `${match.localName} vs ${match.visitanteName}`;
    if (!match.localId || !match.visitanteId) {
      errors.push(`${label}: nombre de equipo sin mapear`);
      continue;
    }
    if (!match.fecha) {
      errors.push(`${label}: Wikipedia aún no tiene fecha u hora`);
      continue;
    }

    const doc = docsByTeams.get(`${match.localId}_${match.visitanteId}`);
    if (!doc) {
      const inverted = docsByTeams.has(`${match.visitanteId}_${match.localId}`);
      errors.push(
        `${label}: no existe ${match.localId}_${match.visitanteId} en Firestore` +
          (inverted ? ' (existe con local/visitante invertidos)' : '')
      );
      continue;
    }

    const data = doc.data();
    if (data.estado && data.estado !== 'pendiente') {
      errors.push(`${label}: el partido ya está "${data.estado}", no se cambia la fecha`);
      continue;
    }

    const current = data.fecha?.toDate?.() ?? null;
    const changed = current?.getTime() !== match.fecha.getTime();
    console.log(
      `${match.localId} vs ${match.visitanteId}: ${formatLima(current)} -> ${formatLima(match.fecha)}` +
        (changed ? '' : '  (sin cambios)')
    );
    updates.push({ ref: doc.ref, fecha: match.fecha, changed });
  }

  if (snapshot.size !== fixture.matches.length) {
    errors.push(
      `Firestore tiene ${snapshot.size} partidos y Wikipedia ${fixture.matches.length}`
    );
  }

  const validation = validateJornadaSchedule(
    updates.map((update) => update.fecha),
    snapshot.size
  );

  if (errors.length > 0 || !validation.ok) {
    hadErrors = true;
    for (const error of errors) console.log(`  ✗ ${error}`);
    if (!validation.ok) console.log(`  ✗ ${validation.reason}`);
    console.log('Jornada con problemas: no se modifica.');
    continue;
  }

  console.log(
    `Horarios completos: ${formatLima(validation.fechaInicio)} a ${formatLima(validation.fechaFin)}`
  );

  if (!applyChanges) continue;

  const batch = db.batch();
  for (const update of updates) {
    if (update.changed) batch.update(update.ref, { fecha: Timestamp.fromDate(update.fecha) });
  }
  batch.set(
    db.collection('jornadas').doc(jornadaId),
    {
      horariosConfirmados: true,
      fechaInicio: Timestamp.fromDate(validation.fechaInicio),
      fechaFin: Timestamp.fromDate(validation.fechaFin),
    },
    { merge: true }
  );
  await batch.commit();
  console.log(`Aplicado: ${updates.filter((u) => u.changed).length} partidos + jornada confirmada.`);
}

if (!applyChanges) {
  console.log('\nVista previa. Agrega --apply para escribir en Firestore.');
}
process.exitCode = hadErrors ? 1 : 0;
