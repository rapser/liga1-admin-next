/**
 * Pasa las plantillas cargadas con el esquema antiguo al esquema que leen la app
 * iOS (PlayerDTO) y la página Equipos del admin:
 *
 *   antiguo: { fullName, status: "active", position: "GK"|"DEF"|"MID"|"FWD", ... }
 *   actual:  { name,     active: true,     position: "GK"|"DF"|"MF"|"FW",   ... }
 *
 * Conserva number, shortName, nationality y photoURL, y deja los campos antiguos
 * (no borra nada). Solo toca documentos con `fullName` y sin `active` booleano.
 *
 * Vista previa:  npm run players:normalize
 * Aplicar:       npm run players:normalize -- --apply
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './lib/admin-db.mjs';

const POSITION = { GK: 'GK', DEF: 'DF', DF: 'DF', MID: 'MF', MF: 'MF', FWD: 'FW', FW: 'FW' };
const applyChanges = process.argv.includes('--apply');
const db = getAdminDb();

const snapshot = await db.collectionGroup('players').get();
const updates = [];
const skipped = [];

for (const document of snapshot.docs) {
  const data = document.data();
  if (typeof data.active === 'boolean' || !data.fullName) continue;

  const position = POSITION[String(data.position || '').toUpperCase()];
  if (!position) {
    skipped.push(`${document.ref.path} (posición "${data.position}")`);
    continue;
  }
  updates.push({
    ref: document.ref,
    team: document.ref.parent.parent?.id,
    fields: {
      name: String(data.fullName).trim(),
      active: data.status === 'active',
      position,
      updatedAt: FieldValue.serverTimestamp(),
    },
  });
}

const byTeam = {};
for (const u of updates) byTeam[u.team] = (byTeam[u.team] ?? 0) + 1;
console.table(byTeam);
console.log(`Documentos a normalizar: ${updates.length}; omitidos: ${skipped.length}`);
skipped.forEach((s) => console.log('  omitido:', s));

if (!applyChanges) {
  console.log('Vista previa solamente. Usa --apply para guardar.');
  process.exit(0);
}

for (let i = 0; i < updates.length; i += 400) {
  const batch = db.batch();
  updates.slice(i, i + 400).forEach((u) => batch.set(u.ref, u.fields, { merge: true }));
  await batch.commit();
}
console.log(`Normalizados ${updates.length} jugadores.`);
