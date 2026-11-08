/**
 * Carga las sanciones de puntos de la Liga1 2026 en equipos/{code}.sanctions
 * (fuente: notas de la Tabla Acumulada en Wikipedia) y recalcula el acumulado:
 *   acumulado.points = apertura.points + clausura.points + Σ sanciones (negativas)
 *
 * Reemplaza el array `sanctions` de los equipos listados; no toca a los demás.
 *
 * Vista previa:  npm run sanctions:seed
 * Aplicar:       npm run sanctions:seed -- --apply
 */

import { getAdminDb } from './lib/admin-db.mjs';

const SANCTIONS_2026 = {
  utc: [
    {
      points: -10,
      resolution:
        'Resoluciones N.° 014-CCRD-FPF-2024, N.° 015-CCRD-FPF-2024, N.° 011-2025-B-CCRD-FPF y N.° 012-2025-B-CCRD-FPF',
    },
  ],
  sba: [
    {
      points: -4,
      resolution: 'Resoluciones N.° 082-CL-LFPP-2026 y N.° 088-CL-LFPP-2026',
    },
  ],
  caj: [{ points: -2, resolution: 'Resolución N.° 092-CL-LFPP-2026' }],
  adt: [{ points: -1, resolution: 'Resolución N.° 080-CL-LFPP-2026' }],
};

const applyChanges = process.argv.includes('--apply');
const db = getAdminDb();

const [teamsSnap, aperturaSnap, clausuraSnap, acumuladoSnap] = await Promise.all(
  ['equipos', 'apertura', 'clausura', 'acumulado'].map((name) => db.collection(name).get()),
);
const byId = (snap) => new Map(snap.docs.map((d) => [d.id, d.data()]));
const teams = byId(teamsSnap);
const apertura = byId(aperturaSnap);
const clausura = byId(clausuraSnap);
const acumulado = byId(acumuladoSnap);

for (const code of Object.keys(SANCTIONS_2026)) {
  if (!teams.has(code)) throw new Error(`No existe equipos/${code}`);
}

const sanctionsFor = (code) =>
  SANCTIONS_2026[code] ??
  (Array.isArray(teams.get(code)?.sanctions) ? teams.get(code).sanctions : []);
const total = (sanctions) =>
  sanctions
    .map((s) => Number(s?.points))
    .filter((p) => Number.isInteger(p) && p < 0)
    .reduce((sum, p) => sum + p, 0);

const rows = [...apertura.keys()].map((code) => {
  const raw = (apertura.get(code)?.points ?? 0) + (clausura.get(code)?.points ?? 0);
  const sanction = total(sanctionsFor(code));
  return {
    team: code,
    enCancha: raw,
    sancion: sanction,
    acumuladoActual: acumulado.get(code)?.points ?? 0,
    acumuladoNuevo: raw + sanction,
  };
});
console.table(rows.filter((r) => r.sancion !== 0 || r.acumuladoActual !== r.acumuladoNuevo));

if (!applyChanges) {
  console.log('Vista previa solamente. Usa --apply para guardar.');
  process.exit(0);
}

const batch = db.batch();
for (const [code, sanctions] of Object.entries(SANCTIONS_2026)) {
  batch.set(db.collection('equipos').doc(code), { sanctions }, { merge: true });
}
for (const row of rows) {
  batch.set(db.collection('acumulado').doc(row.team), { points: row.acumuladoNuevo }, { merge: true });
}
await batch.commit();
console.log(`Sanciones guardadas en ${Object.keys(SANCTIONS_2026).length} equipos; acumulado recalculado.`);
