/**
 * Marca `horariosConfirmados: true` en las jornadas que ya tienen horarios
 * cargados (Apertura completo y Clausura hasta `--max-clausura`).
 *
 * Una jornada solo se marca si ninguno de sus partidos conserva la fecha
 * placeholder del generador; las que no pasan la validación se reportan.
 * También guarda `fechaInicio` / `fechaFin` con el rango real de los partidos.
 *
 * Por defecto solo muestra una vista previa:
 *   npm run backfill:horarios
 *
 * Para aplicar los cambios:
 *   npm run backfill:horarios -- --apply [--max-clausura 13]
 */

import { Timestamp } from 'firebase-admin/firestore';
import { formatLima, getAdminDb } from './lib/admin-db.mjs';
import { validateJornadaSchedule } from '../src/domain/services/schedule-validation.ts';

const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');
const maxClausuraIndex = args.indexOf('--max-clausura');
const maxClausura = maxClausuraIndex >= 0 ? Number(args[maxClausuraIndex + 1]) : 13;

if (!Number.isInteger(maxClausura) || maxClausura < 0) {
  throw new Error('--max-clausura debe ser un entero >= 0');
}

const db = getAdminDb();
const jornadas = await db.collection('jornadas').get();

const candidates = jornadas.docs
  .filter((doc) => {
    if (doc.id.startsWith('apertura_')) return true;
    const clausura = doc.id.match(/^clausura_(\d+)$/);
    return clausura !== null && Number(clausura[1]) <= maxClausura;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

let marked = 0;
let rejected = 0;

for (const jornada of candidates) {
  if (jornada.data().horariosConfirmados === true) {
    console.log(`${jornada.id}: ya confirmada`);
    continue;
  }

  const matches = await jornada.ref.collection('matches').get();
  const fechas = matches.docs
    .map((doc) => doc.data().fecha?.toDate?.())
    .filter((fecha) => fecha instanceof Date);
  const validation = validateJornadaSchedule(fechas, matches.size, {
    rejectUniformTimes: true,
  });

  if (!validation.ok) {
    rejected += 1;
    console.log(`${jornada.id}: ✗ ${validation.reason}`);
    continue;
  }

  marked += 1;
  console.log(
    `${jornada.id}: ✓ ${formatLima(validation.fechaInicio)} a ${formatLima(validation.fechaFin)}`
  );

  if (applyChanges) {
    await jornada.ref.set(
      {
        horariosConfirmados: true,
        fechaInicio: Timestamp.fromDate(validation.fechaInicio),
        fechaFin: Timestamp.fromDate(validation.fechaFin),
      },
      { merge: true }
    );
  }
}

console.log(
  `\n${applyChanges ? 'Marcadas' : 'Se marcarían'}: ${marked}. Rechazadas: ${rejected}.`
);
if (!applyChanges) {
  console.log('Vista previa. Agrega --apply para escribir en Firestore.');
}
