/**
 * Script para verificar que las variables de entorno están configuradas
 * Ejecuta: node scripts/verify-env.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env.local
config({ path: join(__dirname, '..', '.env.local') });

console.log('\n🔍 Verificando Variables de Entorno Firebase...\n');

const requiredVars = {
  'Client SDK': [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ],
  'Admin SDK': [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
  ],
};

let allConfigured = true;

for (const [section, vars] of Object.entries(requiredVars)) {
  console.log(`\n📦 ${section}:`);

  for (const varName of vars) {
    const value = process.env[varName];
    const isConfigured = value && !value.includes('tu_') && value !== '';

    if (isConfigured) {
      const displayValue = varName.includes('PRIVATE_KEY')
        ? '✅ Configurada (***oculta***)'
        : `✅ ${value.substring(0, 20)}...`;
      console.log(`  ${varName}: ${displayValue}`);
    } else {
      console.log(`  ${varName}: ❌ NO CONFIGURADA`);
      allConfigured = false;
    }
  }
}

console.log('\n' + '='.repeat(50));
if (allConfigured) {
  console.log('✅ Todas las variables están configuradas correctamente');
} else {
  console.log('❌ Faltan variables por configurar. Revisa tu archivo .env.local');
}
console.log('='.repeat(50) + '\n');

process.exit(allConfigured ? 0 : 1);
