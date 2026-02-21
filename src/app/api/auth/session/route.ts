/**
 * Crea la cookie de sesión a partir del ID token de Firebase.
 * El cliente debe llamar a este endpoint tras iniciar sesión para que el middleware pueda proteger rutas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/core/config/firebase-admin';

const SESSION_COOKIE_NAME = '__session';
const SESSION_MAX_AGE = 5 * 24 * 60 * 60; // 5 días en segundos

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body?.idToken ?? body?.token;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere idToken' },
        { status: 400 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000, // Firebase espera milisegundos
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error al crear sesión:', error);
    return NextResponse.json(
      { error: 'Token inválido o expirado' },
      { status: 401 }
    );
  }
}
