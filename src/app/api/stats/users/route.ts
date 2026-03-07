/**
 * API Route: Total de usuarios registrados en la app móvil
 * GET /api/stats/users
 * Usa Firebase Admin Auth para contar todos los usuarios (Android/iOS)
 * excluyendo los admins del panel de administración
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminApp } from '@/core/config/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function getAdminUids(): Promise<Set<string>> {
  try {
    const adminDb = getFirestore(adminApp);
    const snapshot = await adminDb.collection('admins').get();
    return new Set(snapshot.docs.map((doc) => doc.id));
  } catch {
    return new Set();
  }
}

export async function GET() {
  try {
    const adminUids = await getAdminUids();

    let totalUsers = 0;
    let pageToken: string | undefined = undefined;

    do {
      const result = await adminAuth.listUsers(1000, pageToken);
      for (const user of result.users) {
        if (!adminUids.has(user.uid)) {
          totalUsers++;
        }
      }
      pageToken = result.pageToken;
    } while (pageToken);

    return NextResponse.json({ total: totalUsers });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error al obtener total de usuarios:', errMsg);
    return NextResponse.json(
      { error: 'Error al obtener usuarios', details: errMsg },
      { status: 500 }
    );
  }
}
