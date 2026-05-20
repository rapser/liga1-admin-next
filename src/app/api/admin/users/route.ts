/**
 * API Route: Lista de usuarios administradores del panel
 * GET /api/admin/users
 * Combina Firebase Auth (datos del usuario) con Firestore admins (roles)
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminApp } from '@/core/config/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const adminDb = getFirestore(adminApp);

    // Obtener roles desde la colección "admins" de Firestore
    const snapshot = await adminDb.collection('admins').get();
    const roleMap = new Map<string, 'admin' | 'viewer'>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      roleMap.set(doc.id, data.role === 'viewer' ? 'viewer' : 'admin');
    });

    // Listar todos los usuarios de Firebase Auth
    const result = await adminAuth.listUsers(1000);

    const users = result.users.map((user) => ({
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: user.metadata.creationTime ?? null,
      lastSignInAt: user.metadata.lastSignInTime ?? null,
      role: roleMap.get(user.uid) ?? 'admin',
      disabled: user.disabled,
    }));

    // Ordenar: primero activos, luego por fecha de creación desc
    users.sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error al obtener usuarios admin:', errMsg);
    return NextResponse.json(
      { error: 'Error al obtener usuarios', details: errMsg },
      { status: 500 },
    );
  }
}
