/**
 * Configuración de Firebase Admin SDK
 * Para operaciones del servidor como enviar push notifications
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

// Configuración de Firebase Admin desde variables de entorno
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Verificar que todas las variables estén configuradas
if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
  throw new Error(
    'Faltan variables de entorno de Firebase Admin. Verifica tu archivo .env.local'
  );
}

// Inicializar Firebase Admin solo una vez
let adminApp: App;
let messaging: Messaging;
let adminAuth: Auth;

if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: cert({
      projectId: firebaseAdminConfig.projectId,
      clientEmail: firebaseAdminConfig.clientEmail,
      privateKey: firebaseAdminConfig.privateKey,
    }),
  });
  adminAuth = getAuth(adminApp);
  messaging = getMessaging(adminApp);
} else {
  adminApp = getApps()[0]!;
  adminAuth = getAuth(adminApp);
  messaging = getMessaging(adminApp);
}

export { adminApp, adminAuth, messaging };
