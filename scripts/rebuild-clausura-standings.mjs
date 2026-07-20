/**
 * Reconstruye la tabla del Clausura usando exclusivamente partidos finalizados
 * de jornadas con ID clausura_*.
 *
 * Por defecto solo muestra una vista previa:
 *   npm run repair:clausura
 *
 * Para aplicar los cambios:
 *   npm run repair:clausura -- --apply
 */

import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
config({ path: join(scriptDir, '..', '.env.local') });

const applyChanges = process.argv.includes('--apply');
const requiredEnv = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Falta la variable ${name} en .env.local`);
  }
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

const db = getFirestore(app);
const statFields = [
  'matchesPlayed',
  'matchesWon',
  'matchesDrawn',
  'matchesLost',
  'goalsScored',
  'goalsAgainst',
  'goalDifference',
  'points',
];

const zeroStats = () => ({
  matchesPlayed: 0,
  matchesWon: 0,
  matchesDrawn: 0,
  matchesLost: 0,
  goalsScored: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

const normalizedStats = (data = {}) =>
  Object.fromEntries(statFields.map((field) => [field, data[field] ?? 0]));

const addStats = (apertura, clausura) =>
  Object.fromEntries(
    statFields.map((field) => [
      field,
      (apertura[field] ?? 0) + (clausura[field] ?? 0),
    ]),
  );

const sameStats = (left, right) =>
  statFields.every((field) => (left[field] ?? 0) === (right[field] ?? 0));

const extractTeamIds = (matchDoc) => {
  const data = matchDoc.data();
  const [idLocal = '', idVisitor = ''] = matchDoc.id.split('_');
  return {
    localId: data.equipoLocalId || idLocal,
    visitorId: data.equipoVisitanteId || idVisitor,
  };
};

const aperturaSnapshot = await db.collection('apertura').get();
if (aperturaSnapshot.empty) {
  throw new Error('La colección apertura está vacía; no se puede obtener la lista de equipos.');
}

const aperturaByTeam = new Map(
  aperturaSnapshot.docs.map((document) => [document.id, document.data()]),
);
const rebuiltByTeam = new Map(
  aperturaSnapshot.docs.map((document) => [document.id, zeroStats()]),
);

const jornadasSnapshot = await db.collection('jornadas').get();
const clausuraJornadas = jornadasSnapshot.docs.filter((document) =>
  document.id.startsWith('clausura_'),
);

if (clausuraJornadas.length === 0) {
  throw new Error('No se encontraron jornadas con ID clausura_*.');
}

const matchesByJornada = await Promise.all(
  clausuraJornadas.map(async (jornada) => ({
    jornadaId: jornada.id,
    snapshot: await jornada.ref.collection('matches').get(),
  })),
);

const liveMatches = [];
let finalizedMatches = 0;

for (const { jornadaId, snapshot } of matchesByJornada) {
  for (const matchDoc of snapshot.docs) {
    const match = matchDoc.data();

    if (match.estado === 'envivo') {
      liveMatches.push(`${jornadaId}/${matchDoc.id}`);
      continue;
    }

    if (match.estado !== 'finalizado') continue;

    const { localId, visitorId } = extractTeamIds(matchDoc);
    const local = rebuiltByTeam.get(localId);
    const visitor = rebuiltByTeam.get(visitorId);
    const localGoals = match.golesEquipoLocal;
    const visitorGoals = match.golesEquipoVisitante;

    if (!local || !visitor) {
      throw new Error(
        `Equipos inválidos en ${jornadaId}/${matchDoc.id}: ${localId}, ${visitorId}`,
      );
    }
    if (
      !Number.isInteger(localGoals) ||
      !Number.isInteger(visitorGoals) ||
      localGoals < 0 ||
      visitorGoals < 0
    ) {
      throw new Error(`Marcador inválido en ${jornadaId}/${matchDoc.id}.`);
    }

    local.matchesPlayed += 1;
    visitor.matchesPlayed += 1;
    local.goalsScored += localGoals;
    local.goalsAgainst += visitorGoals;
    visitor.goalsScored += visitorGoals;
    visitor.goalsAgainst += localGoals;

    if (localGoals > visitorGoals) {
      local.matchesWon += 1;
      visitor.matchesLost += 1;
    } else if (localGoals < visitorGoals) {
      visitor.matchesWon += 1;
      local.matchesLost += 1;
    } else {
      local.matchesDrawn += 1;
      visitor.matchesDrawn += 1;
    }

    finalizedMatches += 1;
  }
}

if (liveMatches.length > 0) {
  throw new Error(
    `Hay partidos en vivo (${liveMatches.join(', ')}). Finalízalos antes de reconstruir la tabla.`,
  );
}
if (finalizedMatches === 0) {
  throw new Error('No hay partidos finalizados del Clausura; se canceló para evitar poner toda la tabla en cero.');
}

for (const stats of rebuiltByTeam.values()) {
  stats.goalDifference = stats.goalsScored - stats.goalsAgainst;
  stats.points = stats.matchesWon * 3 + stats.matchesDrawn;
}

const clausuraSnapshot = await db.collection('clausura').get();
const currentByTeam = new Map(
  clausuraSnapshot.docs.map((document) => [
    document.id,
    normalizedStats(document.data()),
  ]),
);

const differences = [...rebuiltByTeam.entries()]
  .filter(([teamId, rebuilt]) =>
    !sameStats(currentByTeam.get(teamId) ?? zeroStats(), rebuilt),
  )
  .map(([teamId, rebuilt]) => {
    const current = currentByTeam.get(teamId) ?? zeroStats();
    return {
      team: teamId,
      currentPJ: current.matchesPlayed,
      rebuiltPJ: rebuilt.matchesPlayed,
      currentPG: current.matchesWon,
      rebuiltPG: rebuilt.matchesWon,
      currentPE: current.matchesDrawn,
      rebuiltPE: rebuilt.matchesDrawn,
      currentPP: current.matchesLost,
      rebuiltPP: rebuilt.matchesLost,
      currentGF: current.goalsScored,
      rebuiltGF: rebuilt.goalsScored,
      currentGC: current.goalsAgainst,
      rebuiltGC: rebuilt.goalsAgainst,
      currentPts: current.points,
      rebuiltPts: rebuilt.points,
    };
  });

console.log(
  `Jornadas Clausura: ${clausuraJornadas.length}; partidos finalizados: ${finalizedMatches}.`,
);
if (differences.length === 0) {
  console.log('La tabla del Clausura ya coincide con los partidos finalizados.');
  process.exit(0);
}

console.table(differences);

if (!applyChanges) {
  console.log('Vista previa solamente. Usa --apply para guardar la reconstrucción.');
  process.exit(0);
}

const batch = db.batch();
for (const [teamId, clausuraStats] of rebuiltByTeam) {
  const aperturaStats = aperturaByTeam.get(teamId) ?? {};
  batch.set(db.collection('clausura').doc(teamId), clausuraStats, {
    merge: true,
  });
  batch.set(
    db.collection('acumulado').doc(teamId),
    addStats(aperturaStats, clausuraStats),
    { merge: true },
  );
}

await batch.commit();
console.log(
  `Reconstrucción aplicada: ${rebuiltByTeam.size} equipos actualizados en clausura y acumulado.`,
);
