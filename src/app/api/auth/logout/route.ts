/**
 * Limpia la cookie de sesión.
 * El cliente debe llamar tras cerrar sesión en Firebase para que el proxy deje de considerar la sesión activa.
 */

import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
