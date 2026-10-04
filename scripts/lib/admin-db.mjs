/**
 * Conexión a Firestore con firebase-admin para los scripts de mantenimiento.
 * Lee las credenciales de .env.local, igual que rebuild-clausura-standings.mjs.
 */

import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
config({ path: join(scriptDir, '..', '..', '.env.local') });

const requiredEnv = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
];

export function getAdminDb() {
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

  return getFirestore(app);
}

/** Fecha en hora de Lima para mostrar en consola. */
export function formatLima(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
